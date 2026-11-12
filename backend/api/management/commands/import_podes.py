"""Impor data desa Podes 2025 (identitas desa + blok 906 dan 907) dan daftar komoditas R906c.

    python manage.py import_podes                      # membaca folder "Data Podes" di root repo
    python manage.py import_podes --dir /path/ke/folder

Aman dijalankan ulang: desa diperbarui berdasarkan iddesa, sehingga desa yang sudah punya akun koperasi
tidak terhapus. Butuh paket openpyxl.
"""
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.models import Desa, PodesKomoditas

FILE_DESA = 'podes2025-desa_part2.xlsx'
FILE_KOMODITAS = 'Master Data 906c.xlsx'
BATCH = 2000
KOLOM_WAJIB = ['iddesa', 'r101', 'r102', 'r103', 'r104', 'nama_prov', 'kab/kota standar', 'nama_kec', 'nama_desa',
               'r906a', 'r906b', 'r906c', 'r907a', 'r907b', 'r907c']


def _int(v):
    if v is None or v == '':
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _teks(v):
    if v is None:
        return ''
    s = str(v).strip()
    return '' if s.lower() in ('none', 'nan', '-') else s


class Command(BaseCommand):
    help = 'Impor data desa Podes 2025 (blok 906 dan 907) dan master komoditas R906c.'

    def add_arguments(self, parser):
        parser.add_argument('--dir', default=str(Path(settings.BASE_DIR).parent / 'Data Podes'),
                            help='Folder berisi file Podes (default: "Data Podes" di root repo)')

    def handle(self, *args, **opts):
        try:
            import openpyxl
        except ImportError as e:
            raise CommandError('Paket openpyxl belum terpasang (pip install openpyxl).') from e

        folder = Path(opts['dir'])
        for nama in (FILE_DESA, FILE_KOMODITAS):
            if not (folder / nama).exists():
                raise CommandError(f'File tidak ditemukan: {folder / nama}')

        self.tampil = opts['verbosity'] >= 1
        self._impor_komoditas(openpyxl, folder / FILE_KOMODITAS)
        self._impor_desa(openpyxl, folder / FILE_DESA)

    def _impor_komoditas(self, openpyxl, path):
        ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
        rows = ws.iter_rows(min_row=2, values_only=True)  # baris 1 = header "R906c,N,6,0"
        data = [PodesKomoditas(kode=int(r[0]), nama=_teks(r[1])) for r in rows if r[0] is not None]
        PodesKomoditas.objects.bulk_create(
            data, update_conflicts=True, unique_fields=['kode'], update_fields=['nama'])
        if self.tampil:
            self.stdout.write(f'Komoditas R906c: {len(data)} kode')

    def _impor_desa(self, openpyxl, path):
        ws = openpyxl.load_workbook(path, read_only=True, data_only=True)['Sheet1']
        rows = ws.iter_rows(values_only=True)
        header = [str(h).split(',')[0].strip().lower() if h is not None else None for h in next(rows)]
        idx = {h: i for i, h in enumerate(header) if h}
        hilang = [k for k in KOLOM_WAJIB if k not in idx]
        if hilang:
            raise CommandError(f'Kolom tidak ditemukan di {path.name}: {hilang}')

        field_update = ['kode_prov', 'kode_kab', 'kode_kec', 'kode_desa', 'nama_prov', 'nama_kab', 'nama_kec',
                        'nama_desa', 'r906a', 'r906b', 'r906c', 'r907a', 'r907b', 'r907c']
        batch, total = [], 0

        def simpan():
            nonlocal batch, total
            if batch:
                Desa.objects.bulk_create(batch, update_conflicts=True, unique_fields=['iddesa'],
                                         update_fields=field_update)
                total += len(batch)
                batch = []

        for r in rows:
            iddesa = _teks(r[idx['iddesa']])
            if not iddesa:
                continue
            batch.append(Desa(
                iddesa=iddesa,
                kode_prov=_teks(r[idx['r101']]), kode_kab=_teks(r[idx['r102']]),
                kode_kec=_teks(r[idx['r103']]), kode_desa=_teks(r[idx['r104']]),
                nama_prov=_teks(r[idx['nama_prov']]),
                nama_kab=_teks(r[idx['kab/kota standar']]),  # nama baku: "KOTA BANDA ACEH", bukan "BANDA ACEH"
                nama_kec=_teks(r[idx['nama_kec']]), nama_desa=_teks(r[idx['nama_desa']]),
                r906a=_int(r[idx['r906a']]), r906b=_int(r[idx['r906b']]),
                r906c=_int(r[idx['r906c']]) or None,  # 0 = tidak ada komoditas utama (desa non-pertanian)
                r907a=_int(r[idx['r907a']]), r907b=_int(r[idx['r907b']]), r907c=_teks(r[idx['r907c']]),
            ))
            if len(batch) >= BATCH:
                simpan()
                if self.tampil:
                    self.stdout.write(f'  {total} desa...')
        simpan()
        if self.tampil:
            self.stdout.write(self.style.SUCCESS(f'Desa Podes: {total} desa diimpor/diperbarui'))
