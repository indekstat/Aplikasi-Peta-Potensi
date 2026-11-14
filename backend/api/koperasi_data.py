"""Format berkas rekap koperasi ringkas yang disimpan di dalam aplikasi (api/data/koperasi_rekap.csv.gz).

Excel asli (Data Koperasi, 340+ kolom) tidak ikut di-deploy. `export_koperasi_ringkas` mengambil hanya metrik yang dipakai
halaman Overview Koperasi dan menggabungkan baris ganda; `import_koperasi` memuatnya ke database.
"""
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / 'data'
FILE_REKAP = 'koperasi_rekap.csv.gz'

# kolom di Excel (tanpa akhiran _tahun) -> field model
METRIK_JUMLAH = {
    'jumlahKoperasi': 'koperasi',
    'jumlahKoperasiAktif': 'aktif',
    'jumlahKoperasiTidakAktif': 'tidak_aktif',
    'jumlahSudahBersertifikat': 'bersertifikat',
    'jumlahSudahRAT': 'sudah_rat',
    'jumlahAnggota': 'anggota',
    'jumlahAnggotaPria': 'anggota_pria',
    'jumlahAnggotaWanita': 'anggota_wanita',
    'jumlahTenagaKerja': 'tenaga_kerja',
}
METRIK_RUPIAH = {
    'jumlahModalSendiri': 'modal_sendiri',
    'jumlahModalLuar': 'modal_luar',
    'jumlahAset': 'aset',
    'jumlahVolumeUsaha': 'volume_usaha',
    'jumlahSisaHasilUsaha': 'shu',
}
FIELD_JUMLAH = list(METRIK_JUMLAH.values())
FIELD_RUPIAH = list(METRIK_RUPIAH.values())
KOLOM = ['kode_prov', 'kode_kab', 'nama_prov', 'nama_kab', 'bagian_wilayah', 'kelompok', 'detail', 'tahun'] + FIELD_JUMLAH + FIELD_RUPIAH

KELOMPOK_TOTAL = 'Wilayah Koperasi'
KELOMPOK_JENIS = 'Jenis Koperasi'
KELOMPOK_BENTUK = 'Bentuk Koperasi'
KELOMPOK_SEKTOR = 'Sektor Usaha'
KELOMPOK_KELOMPOK = 'Kelompok Koperasi'
# Koperasi Desa/Kelurahan Merah Putih (KDKMP) = dua nilai ini pada Jenis Koperasi; sisanya dianggap koperasi reguler.
DETAIL_KDKMP = ('Desa Merah Putih', 'Kelurahan Merah Putih')
