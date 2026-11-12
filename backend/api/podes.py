"""Format berkas data Podes ringkas yang disimpan di dalam aplikasi (api/data/).

Excel Podes asli (100+ MB) tidak ikut di-deploy. `export_podes_ringkas` mengambil hanya kolom yang dipakai
aplikasi, dan `import_podes` memuatnya ke database. Kode provinsi/kab/kec/desa diturunkan dari iddesa.
"""
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / 'data'
FILE_DESA = 'podes_desa.csv.gz'
FILE_KOMODITAS = 'podes_komoditas.csv'

KOLOM_DESA = ['iddesa', 'nama_prov', 'nama_kab', 'nama_kec', 'nama_desa',
              'r906a', 'r906b', 'r906c', 'r907a', 'r907b', 'r907c']
KOLOM_KOMODITAS = ['kode', 'nama']


def to_int(v):
    if v is None or v == '':
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def to_teks(v):
    if v is None:
        return ''
    s = str(v).strip()
    return '' if s.lower() in ('none', 'nan', '-') else s
