"""Muat rekap koperasi nasional per kabupaten/kota ke database.

    python manage.py import_koperasi                # membaca berkas ringkas bawaan aplikasi (api/data/)
    python manage.py import_koperasi --bila-kosong  # hanya bila tabel rekap masih kosong (dipakai saat container start)

Sumbernya berkas ringkas di api/data/ (dibuat `export_koperasi_ringkas` dari Excel), jadi Excel asli tidak perlu ada di
server. Aman dijalankan ulang: baris diperbarui berdasarkan kabupaten x kelompok x detail x tahun.
"""
import csv
import gzip
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api import koperasi_data as kd
from api.models import KoperasiRekap

BATCH = 5000
KUNCI = ['kode_kab', 'kelompok', 'detail', 'tahun']
UPDATE = [k for k in kd.KOLOM if k not in KUNCI]


class Command(BaseCommand):
    help = 'Muat rekap koperasi per kabupaten/kota dari berkas ringkas.'

    def add_arguments(self, parser):
        parser.add_argument('--data-dir', default=str(kd.DATA_DIR), help='Folder berkas ringkas (default: api/data)')
        parser.add_argument('--bila-kosong', action='store_true',
                            help='Lewati bila data sudah ada (dipanggil otomatis saat container start)')

    def handle(self, *args, **opts):
        tampil = opts['verbosity'] >= 1
        if opts['bila_kosong'] and KoperasiRekap.objects.exists():
            if tampil:
                self.stdout.write('Data koperasi sudah ada, impor dilewati.')
            return
        path = Path(opts['data_dir']) / kd.FILE_REKAP
        if not path.exists():
            raise CommandError(f'File tidak ditemukan: {path} (buat dengan: python manage.py export_koperasi_ringkas)')

        batch, total = [], 0

        def simpan():
            nonlocal batch, total
            if batch:
                KoperasiRekap.objects.bulk_create(batch, update_conflicts=True, unique_fields=KUNCI, update_fields=UPDATE)
                total += len(batch)
                batch = []

        with gzip.open(path, 'rt', newline='', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                batch.append(KoperasiRekap(
                    kode_prov=r['kode_prov'], kode_kab=r['kode_kab'], nama_prov=r['nama_prov'], nama_kab=r['nama_kab'],
                    bagian_wilayah=r['bagian_wilayah'], kelompok=r['kelompok'], detail=r['detail'], tahun=int(r['tahun']),
                    **{k: int(r[k]) for k in kd.FIELD_JUMLAH}, **{k: float(r[k]) for k in kd.FIELD_RUPIAH}))
                if len(batch) >= BATCH:
                    simpan()
        simpan()
        if tampil:
            self.stdout.write(self.style.SUCCESS(f'Rekap koperasi: {total} baris diimpor/diperbarui'))
