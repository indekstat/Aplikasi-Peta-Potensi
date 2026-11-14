"""Ekspor data koperasi dari Excel asli ke berkas ringkas di api/data/ (hanya metrik yang dipakai halaman Overview Koperasi).

    python manage.py export_koperasi_ringkas                       # membaca "Data Koperasi (1).xlsx" di root repo
    python manage.py export_koperasi_ringkas --excel /path/file.xlsx

Dijalankan sekali oleh pengembang (butuh openpyxl, lihat requirements-dev.txt) setiap kali data koperasi berubah.
Hasilnya (api/data/koperasi_rekap.csv.gz) di-commit; Excel aslinya tidak perlu di-deploy. Keluarannya deterministik.

Pembersihan yang dilakukan (semua diverifikasi: total tiap kelompok tetap sama dengan total "Wilayah Koperasi"):
- Satu kabupaten kadang muncul dengan dua ejaan (mis. "Kota Tanjung Balai" untuk tahun lama dan "Kota Tanjungbalai" untuk
  tahun baru), dan sektor usaha kadang berbeda huruf besar/kecil. Baris seperti itu dijumlahkan; sumbernya tidak pernah
  mengisi tahun yang sama di kedua baris.
- Nama kabupaten dipilih dari ejaan yang memuat data terbaru.
"""
import csv
import gzip
import io
import re
from collections import defaultdict
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api import koperasi_data as kd

SHEET = 'Data'
KOLOM_ID = ['GroupRekap', 'DetailRekap', 'IdPropinsi', 'Propinsi', 'Bagian Wilayah', 'IdKabupaten', 'Kabupaten']


def angka(v):
    if v is None or v == '':
        return 0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0


def teks(v):
    return '' if v is None else re.sub(r'\s+', ' ', str(v)).strip()


class Command(BaseCommand):
    help = 'Ekspor data koperasi (hanya metrik yang dipakai) dari Excel asli ke berkas ringkas di api/data/.'

    def add_arguments(self, parser):
        parser.add_argument('--excel', default=str(Path(settings.BASE_DIR).parent / 'Data Koperasi (1).xlsx'),
                            help='Berkas Excel koperasi (default: "Data Koperasi (1).xlsx" di root repo)')
        parser.add_argument('--out', default=str(kd.DATA_DIR), help='Folder keluaran (default: api/data)')

    def handle(self, *args, **opts):
        try:
            import openpyxl
        except ImportError as e:
            raise CommandError('Butuh openpyxl: pip install -r requirements-dev.txt') from e
        excel, keluaran = Path(opts['excel']), Path(opts['out'])
        if not excel.exists():
            raise CommandError(f'File tidak ditemukan: {excel}')

        ws = openpyxl.load_workbook(excel, read_only=True, data_only=True)[SHEET]
        baris = ws.iter_rows(values_only=True)
        header = [teks(h) for h in next(baris)]
        kurang = [k for k in KOLOM_ID if k not in header]
        if kurang:
            raise CommandError(f'Kolom wajib tidak ada di sheet {SHEET}: {kurang}')
        idx = {h: i for i, h in enumerate(header)}
        tahun = sorted({int(h.rsplit('_', 1)[1]) for h in header
                        if h.startswith('jumlahKoperasi_') and h.rsplit('_', 1)[1].isdigit()})
        metrik = {**kd.METRIK_JUMLAH, **kd.METRIK_RUPIAH}
        for m in metrik:
            for t in tahun:
                if f'{m}_{t}' not in idx:
                    raise CommandError(f'Kolom {m}_{t} tidak ada di sheet {SHEET}')

        # Kanonikal huruf besar/kecil untuk detail: pilih penulisan yang tidak seluruhnya huruf besar.
        varian = defaultdict(set)
        mentah = []
        for r in baris:
            if r[idx['GroupRekap']] is None:
                continue
            mentah.append(r)
            varian[teks(r[idx['DetailRekap']]).upper()].add(teks(r[idx['DetailRekap']]))
        kanon = {u: sorted(v, key=lambda x: (x.isupper(), x))[0] for u, v in varian.items()}

        data = defaultdict(lambda: defaultdict(float))     # (kab, kelompok, detail, tahun) -> metrik -> nilai
        info = {}                                          # kab -> {prov, nama_prov, bagian}
        nama_kab = defaultdict(dict)                       # kab -> nama -> total koperasi tahun terakhir
        for r in mentah:
            kab = teks(r[idx['IdPropinsi']]) + teks(r[idx['IdKabupaten']])
            prov = teks(r[idx['IdPropinsi']])
            kel = teks(r[idx['GroupRekap']])
            det = kanon[teks(r[idx['DetailRekap']]).upper()]
            info.setdefault(kab, {'prov': prov, 'nama_prov': teks(r[idx['Propinsi']]),
                                  'bagian': teks(r[idx['Bagian Wilayah']])})
            nm = teks(r[idx['Kabupaten']])
            nama_kab[kab][nm] = nama_kab[kab].get(nm, 0) + angka(r[idx[f'jumlahKoperasi_{tahun[-1]}']])
            for t in tahun:
                d = data[(kab, kel, det, t)]
                for m, f in metrik.items():
                    d[f] += angka(r[idx[f'{m}_{t}']])
        nama = {k: sorted(v.items(), key=lambda x: (-x[1], x[0]))[0][0] for k, v in nama_kab.items()}

        keluaran.mkdir(parents=True, exist_ok=True)
        buf = io.StringIO()
        w = csv.writer(buf, lineterminator='\n')
        w.writerow(kd.KOLOM)
        n = 0
        for (kab, kel, det, t) in sorted(data):
            d = data[(kab, kel, det, t)]
            if not any(d.values()):
                continue                                   # baris kosong tidak perlu disimpan
            i = info[kab]
            w.writerow([i['prov'], kab, i['nama_prov'], nama[kab], i['bagian'], kel, det, t]
                       + [int(round(d[f])) for f in kd.FIELD_JUMLAH] + [round(d[f], 2) for f in kd.FIELD_RUPIAH])
            n += 1
        tujuan = keluaran / kd.FILE_REKAP
        with open(tujuan, 'wb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', mtime=0, compresslevel=9) as gz:
            gz.write(buf.getvalue().encode('utf-8'))
        if opts['verbosity'] >= 1:
            self.stdout.write(self.style.SUCCESS(
                f'Ekspor selesai: {n} baris, {len(info)} kabupaten/kota, tahun {tahun[0]}-{tahun[-1]} '
                f'({tujuan.stat().st_size / 1024:.0f} KB) -> {tujuan}'))
