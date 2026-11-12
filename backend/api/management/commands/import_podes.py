"""Muat data desa Podes 2025 (identitas desa + blok 906 dan 907) dan komoditas R906c ke database.

    python manage.py import_podes                # membaca berkas ringkas bawaan aplikasi (api/data/)
    python manage.py import_podes --bila-kosong  # hanya bila tabel desa masih kosong (dipakai saat container start)

Sumbernya berkas ringkas di api/data/ (dibuat `export_podes_ringkas` dari Excel Podes), jadi Excel asli tidak
perlu ada di server. Aman dijalankan ulang: desa diperbarui berdasarkan iddesa, sehingga desa yang sudah
punya akun koperasi tidak terhapus.
"""
import csv
import gzip
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api import podes
from api.models import Desa, PodesKomoditas

BATCH = 2000
UPDATE = ['kode_prov', 'kode_kab', 'kode_kec', 'kode_desa', 'nama_prov', 'nama_kab', 'nama_kec', 'nama_desa',
          'r906a', 'r906b', 'r906c', 'r907a', 'r907b', 'r907c']


class Command(BaseCommand):
    help = 'Muat data desa Podes 2025 (blok 906 dan 907) dan master komoditas R906c dari berkas ringkas.'

    def add_arguments(self, parser):
        parser.add_argument('--data-dir', default=str(podes.DATA_DIR),
                            help='Folder berkas ringkas (default: api/data)')
        parser.add_argument('--bila-kosong', action='store_true',
                            help='Lewati bila data desa sudah ada (dipanggil otomatis saat container start)')

    def handle(self, *args, **opts):
        self.tampil = opts['verbosity'] >= 1
        if opts['bila_kosong'] and Desa.objects.exists():
            if self.tampil:
                self.stdout.write('Data desa Podes sudah ada, impor dilewati.')
            return

        folder = Path(opts['data_dir'])
        for nama in (podes.FILE_KOMODITAS, podes.FILE_DESA):
            if not (folder / nama).exists():
                raise CommandError(
                    f'File tidak ditemukan: {folder / nama} (buat dengan: python manage.py export_podes_ringkas)')

        self._komoditas(folder / podes.FILE_KOMODITAS)
        self._desa(folder / podes.FILE_DESA)

    def _komoditas(self, path):
        with open(path, newline='', encoding='utf-8') as f:
            data = [PodesKomoditas(kode=int(r['kode']), nama=r['nama']) for r in csv.DictReader(f)]
        PodesKomoditas.objects.bulk_create(data, update_conflicts=True, unique_fields=['kode'], update_fields=['nama'])
        if self.tampil:
            self.stdout.write(f'Komoditas R906c: {len(data)} kode')

    def _desa(self, path):
        batch, total = [], 0

        def simpan():
            nonlocal batch, total
            if batch:
                Desa.objects.bulk_create(batch, update_conflicts=True, unique_fields=['iddesa'], update_fields=UPDATE)
                total += len(batch)
                batch = []

        with gzip.open(path, 'rt', newline='', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                iddesa = r['iddesa']
                batch.append(Desa(
                    iddesa=iddesa,
                    kode_prov=iddesa[:2], kode_kab=iddesa[2:4], kode_kec=iddesa[4:7], kode_desa=iddesa[7:],
                    nama_prov=r['nama_prov'], nama_kab=r['nama_kab'], nama_kec=r['nama_kec'], nama_desa=r['nama_desa'],
                    r906a=podes.to_int(r['r906a']), r906b=podes.to_int(r['r906b']), r906c=podes.to_int(r['r906c']),
                    r907a=podes.to_int(r['r907a']), r907b=podes.to_int(r['r907b']), r907c=r['r907c'],
                ))
                if len(batch) >= BATCH:
                    simpan()
        simpan()
        if self.tampil:
            self.stdout.write(self.style.SUCCESS(f'Desa Podes: {total} desa diimpor/diperbarui'))
