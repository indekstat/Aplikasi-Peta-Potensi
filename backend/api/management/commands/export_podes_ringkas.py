"""Ekspor data Podes 2025 dari Excel asli ke berkas ringkas di api/data/ (hanya kolom yang dipakai).

    python manage.py export_podes_ringkas                    # membaca folder "Data Podes" di root repo
    python manage.py export_podes_ringkas --dir /path/ke/folder

Dijalankan sekali oleh pengembang (butuh openpyxl, lihat requirements-dev.txt) setiap kali data Podes berubah.
Hasilnya (api/data/podes_desa.csv.gz dan podes_komoditas.csv) di-commit; Excel aslinya tidak perlu di-deploy.
Keluarannya deterministik: data yang sama menghasilkan berkas yang sama persis.
"""
import csv
import gzip
import io
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api import podes

EXCEL_DESA = 'podes2025-desa_part2.xlsx'
EXCEL_KOMODITAS = 'Master Data 906c.xlsx'
WAJIB = ['iddesa', 'nama_prov', 'kab/kota standar', 'nama_kec', 'nama_desa',
         'r906a', 'r906b', 'r906c', 'r907a', 'r907b', 'r907c']


class Command(BaseCommand):
    help = 'Ekspor Podes 2025 (hanya kolom yang dipakai) dari Excel asli ke berkas ringkas di api/data/.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', default=str(Path(settings.BASE_DIR).parent / 'Data Podes'),
                            help='Folder berisi Excel Podes (default: "Data Podes" di root repo)')
        parser.add_argument('--out', default=str(podes.DATA_DIR), help='Folder keluaran (default: api/data)')

    def handle(self, *args, **opts):
        try:
            import openpyxl
        except ImportError as e:
            raise CommandError('Butuh openpyxl: pip install -r requirements-dev.txt') from e

        sumber, keluaran = Path(opts['dir']), Path(opts['out'])
        for nama in (EXCEL_DESA, EXCEL_KOMODITAS):
            if not (sumber / nama).exists():
                raise CommandError(f'File tidak ditemukan: {sumber / nama}')
        keluaran.mkdir(parents=True, exist_ok=True)

        n_kom = self._komoditas(openpyxl, sumber / EXCEL_KOMODITAS, keluaran / podes.FILE_KOMODITAS)
        n_desa = self._desa(openpyxl, sumber / EXCEL_DESA, keluaran / podes.FILE_DESA)
        ukuran = (keluaran / podes.FILE_DESA).stat().st_size / 1024
        self.stdout.write(self.style.SUCCESS(
            f'Ekspor selesai: {n_desa} desa ({ukuran:.0f} KB) dan {n_kom} komoditas -> {keluaran}'))

    def _komoditas(self, openpyxl, excel, tujuan):
        ws = openpyxl.load_workbook(excel, read_only=True, data_only=True).worksheets[0]
        baris = [(int(r[0]), podes.to_teks(r[1])) for r in ws.iter_rows(min_row=2, values_only=True) if r[0] is not None]
        with open(tujuan, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f, lineterminator='\n')
            w.writerow(podes.KOLOM_KOMODITAS)
            w.writerows(sorted(baris))
        return len(baris)

    def _desa(self, openpyxl, excel, tujuan):
        ws = openpyxl.load_workbook(excel, read_only=True, data_only=True)['Sheet1']
        rows = ws.iter_rows(values_only=True)
        header = [str(h).split(',')[0].strip().lower() if h is not None else None for h in next(rows)]
        idx = {h: i for i, h in enumerate(header) if h}
        hilang = [k for k in WAJIB if k not in idx]
        if hilang:
            raise CommandError(f'Kolom tidak ditemukan di {excel.name}: {hilang}')

        buf = io.StringIO()
        w = csv.writer(buf, lineterminator='\n')
        w.writerow(podes.KOLOM_DESA)
        n = 0
        for r in rows:
            iddesa = podes.to_teks(r[idx['iddesa']])
            if not iddesa:
                continue
            c906 = podes.to_int(r[idx['r906c']]) or None  # 0 = tidak ada komoditas utama
            w.writerow([
                iddesa, podes.to_teks(r[idx['nama_prov']]),
                podes.to_teks(r[idx['kab/kota standar']]),  # nama baku: "KOTA BANDA ACEH", bukan "BANDA ACEH"
                podes.to_teks(r[idx['nama_kec']]), podes.to_teks(r[idx['nama_desa']]),
                *('' if (v := podes.to_int(r[idx[k]])) is None else v for k in ('r906a', 'r906b')),
                '' if c906 is None else c906,
                *('' if (v := podes.to_int(r[idx[k]])) is None else v for k in ('r907a', 'r907b')),
                podes.to_teks(r[idx['r907c']]),
            ])
            n += 1
        # mtime=0 dan tanpa nama berkas: keluaran gzip identik bila isinya sama (git tidak berubah sia-sia).
        with open(tujuan, 'wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0, compresslevel=9) as gz:
            gz.write(buf.getvalue().encode('utf-8'))
        return n
