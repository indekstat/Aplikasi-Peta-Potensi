from django.db import models

class Province(models.Model):
    name = models.CharField(max_length=100, unique=True)
    geojson_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return self.name

class District(models.Model):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name='districts')
    name = models.CharField(max_length=100)
    lat = models.FloatField(default=0.0)
    lon = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class SubDistrict(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='subdistricts')
    name = models.CharField(max_length=100)
    lat = models.FloatField(default=0.0)
    lon = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class Subsector(models.Model):
    name = models.CharField(max_length=200, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Emoji icon")

    def __str__(self):
        return self.name

class Commodity(models.Model):
    name = models.CharField(max_length=200, unique=True)
    kelompok_utama = models.CharField(max_length=100, blank=True, null=True)
    subkelompok = models.CharField(max_length=100, blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Emoji icon")

    def __str__(self):
        return self.name

class PdrbData(models.Model):
    year = models.IntegerField()
    province = models.ForeignKey(Province, on_delete=models.CASCADE, null=True, blank=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True)
    subsector = models.ForeignKey(Subsector, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'province', 'district', 'subsector')

class ProductionData(models.Model):
    year = models.IntegerField()
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True, related_name='production_data')
    subdistrict = models.ForeignKey(SubDistrict, on_delete=models.CASCADE, null=True, blank=True, related_name='production_data')
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'district', 'subdistrict', 'commodity')

from django.contrib.auth.models import User

class Desa(models.Model):
    """Desa/kelurahan dari Podes 2025, lengkap dengan blok 906 dan 907 (kunci: iddesa 10 digit)."""
    iddesa = models.CharField(max_length=10, unique=True)
    kode_prov = models.CharField(max_length=2)
    kode_kab = models.CharField(max_length=2)
    kode_kec = models.CharField(max_length=3)
    kode_desa = models.CharField(max_length=3)
    nama_prov = models.CharField(max_length=60)
    nama_kab = models.CharField(max_length=80)
    nama_kec = models.CharField(max_length=80)
    nama_desa = models.CharField(max_length=100)

    # 906: sumber penghasilan utama sebagian besar penduduk.
    r906a = models.SmallIntegerField(null=True, blank=True, help_text="Lapangan usaha: 1 Pertanian, 2 Industri, 3 Jasa")
    r906b = models.SmallIntegerField(null=True, blank=True, help_text="Sub sektor pertanian 1-7 (0 bila bukan pertanian)")
    r906c = models.IntegerField(null=True, blank=True, help_text="Kode komoditas utama (lihat PodesKomoditas)")
    # 907: industri mikro dan kecil.
    r907a = models.IntegerField(null=True, blank=True, help_text="Jumlah industri mikro dan kecil")
    r907b = models.IntegerField(null=True, blank=True, help_text="Jumlah sentra industri")
    r907c = models.TextField(blank=True, default="", help_text="Produk sentra industri dengan muatan usaha terbanyak")

    class Meta:
        ordering = ['kode_prov', 'kode_kab', 'kode_kec', 'kode_desa']
        indexes = [models.Index(fields=['kode_prov', 'kode_kab', 'kode_kec'])]

    def __str__(self):
        return f"{self.nama_desa}, {self.nama_kec}, {self.nama_kab}"


class PodesKomoditas(models.Model):
    """Daftar kode komoditas R906c (Master Data 906c Podes)."""
    kode = models.IntegerField(unique=True)
    nama = models.CharField(max_length=120)

    def __str__(self):
        return f"{self.kode} {self.nama}"


class UserProfile(models.Model):
    TIPE_DAERAH = 'daerah'
    TIPE_KOPERASI = 'koperasi'
    TIPE_AKUN = [(TIPE_DAERAH, 'DPMPTSP / Daerah'), (TIPE_KOPERASI, 'Koperasi Desa')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    asal_provinsi = models.CharField(max_length=100, blank=True, null=True)
    asal_kokab = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    account_type = models.CharField(max_length=10, choices=TIPE_AKUN, default=TIPE_DAERAH)
    # Satu desa hanya boleh punya satu akun koperasi (dijaga di level database).
    desa = models.OneToOneField(Desa, null=True, blank=True, on_delete=models.PROTECT, related_name='akun')

    def __str__(self):
        return f"{self.user.username} Profile"

class UserActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"


class KoperasiRekap(models.Model):
    """Rekap data koperasi nasional per kabupaten/kota (Kemenkop), dipecah menurut satu sudut pandang rekap.

    `kelompok` = sudut pandang (Wilayah Koperasi, Bentuk Koperasi, Jenis Koperasi, Kelompok Koperasi, Sektor Usaha) dan
    `detail` = nilainya (mis. Jenis Koperasi: Desa Merah Putih). Setiap kelompok menjumlah ke total yang sama, jadi
    jangan menjumlahkan lintas kelompok. Satu baris = satu kabupaten x kelompok x detail x tahun."""
    kode_prov = models.CharField(max_length=2)
    kode_kab = models.CharField(max_length=4, help_text="IdPropinsi + IdKabupaten dari sumber Kemenkop (tidak selalu sama dengan kode BPS/Podes)")
    nama_prov = models.CharField(max_length=60)
    nama_kab = models.CharField(max_length=80)
    bagian_wilayah = models.CharField(max_length=10, blank=True, default="")
    kelompok = models.CharField(max_length=30)
    detail = models.CharField(max_length=80)
    tahun = models.SmallIntegerField()

    koperasi = models.BigIntegerField(default=0)
    aktif = models.BigIntegerField(default=0)
    tidak_aktif = models.BigIntegerField(default=0)
    bersertifikat = models.BigIntegerField(default=0)
    sudah_rat = models.BigIntegerField(default=0)
    anggota = models.BigIntegerField(default=0)
    anggota_pria = models.BigIntegerField(default=0)
    anggota_wanita = models.BigIntegerField(default=0)
    tenaga_kerja = models.BigIntegerField(default=0)
    modal_sendiri = models.FloatField(default=0)
    modal_luar = models.FloatField(default=0)
    aset = models.FloatField(default=0)
    volume_usaha = models.FloatField(default=0)
    shu = models.FloatField(default=0)

    class Meta:
        unique_together = ('kode_kab', 'kelompok', 'detail', 'tahun')
        indexes = [models.Index(fields=['kelompok', 'tahun', 'kode_prov'])]

    def __str__(self):
        return f"{self.nama_kab} {self.kelompok}/{self.detail} {self.tahun}"
