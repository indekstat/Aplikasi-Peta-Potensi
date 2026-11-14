from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase

from .models import (
    Commodity, District, PdrbData, Province, ProductionData, SubDistrict,
    Subsector, UserProfile,
)


def buat_user(username, provinsi=None, kokab=None, superuser=False):
    user = User.objects.create_user(username=username, password='x', is_superuser=superuser)
    if provinsi or kokab:
        UserProfile.objects.create(user=user, asal_provinsi=provinsi, asal_kokab=kokab)
    return user


class DataReferensiTest(APITestCase):
    """Wilayah/subsektor/komoditas: baca publik, ubah hanya superuser."""

    URLS = ['provinces', 'districts', 'subdistricts', 'subsectors', 'commodities']

    def setUp(self):
        self.prov = Province.objects.create(name='JAWA TIMUR')
        self.dist = District.objects.create(name='KABUPATEN BLITAR', province=self.prov)
        self.biasa = buat_user('biasa', 'JAWA TIMUR', 'KABUPATEN BLITAR')
        self.admin = buat_user('admin', superuser=True)

    def test_baca_tanpa_login_tetap_boleh(self):
        for u in self.URLS:
            self.assertEqual(self.client.get(f'/api/{u}').status_code, 200, u)

    def test_ubah_tanpa_login_ditolak(self):
        for u in self.URLS:
            self.assertEqual(self.client.post(f'/api/{u}', {'name': 'X'}, format='json').status_code, 401, u)
        self.assertEqual(self.client.delete(f'/api/provinces/{self.prov.id}').status_code, 401)
        self.assertEqual(self.client.put(f'/api/provinces/{self.prov.id}', {'name': 'X'}, format='json').status_code, 401)
        self.assertTrue(Province.objects.filter(id=self.prov.id, name='JAWA TIMUR').exists())

    def test_user_daerah_tidak_boleh_mengubah(self):
        self.client.force_authenticate(self.biasa)
        for u in self.URLS:
            self.assertEqual(self.client.post(f'/api/{u}', {'name': 'X'}, format='json').status_code, 403, u)
        self.assertEqual(self.client.delete(f'/api/districts/{self.dist.id}').status_code, 403)
        self.assertTrue(District.objects.filter(id=self.dist.id).exists())

    def test_superuser_boleh_mengubah(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post('/api/provinces', {'name': 'BALI'}, format='json').status_code, 201)
        self.assertEqual(self.client.post('/api/subsectors', {'name': 'SEKTOR BARU'}, format='json').status_code, 201)
        self.assertEqual(self.client.delete(f'/api/districts/{self.dist.id}').status_code, 204)


class DataPdrbProduksiTest(APITestCase):
    def setUp(self):
        self.biasa = buat_user('biasa', 'JAWA TIMUR', 'KABUPATEN BLITAR')

    def test_baca_butuh_login_dan_ubah_hanya_superuser(self):
        for u in ['pdrb', 'production']:
            self.assertEqual(self.client.get(f'/api/{u}').status_code, 401, u)
            self.assertEqual(self.client.post(f'/api/{u}', {}, format='json').status_code, 401, u)
        self.client.force_authenticate(self.biasa)
        for u in ['pdrb', 'production']:
            self.assertEqual(self.client.get(f'/api/{u}').status_code, 200, u)
            self.assertEqual(self.client.post(f'/api/{u}', {}, format='json').status_code, 403, u)


class SaveDataWilayahTest(APITestCase):
    def setUp(self):
        self.jatim = Province.objects.create(name='JAWA TIMUR')
        self.jateng = Province.objects.create(name='JAWA TENGAH')
        self.blitar = District.objects.create(name='KABUPATEN BLITAR', province=self.jatim)
        self.kediri = District.objects.create(name='KABUPATEN KEDIRI', province=self.jatim)
        self.komoditas = Commodity.objects.create(name='Padi')
        self.user = buat_user('blitar', 'JAWA TIMUR', 'KABUPATEN BLITAR')
        self.admin = buat_user('admin', superuser=True)
        self.client.force_authenticate(self.user)

    def pdrb(self, kab='KABUPATEN BLITAR', **extra):
        return {'type': 'pdrb', 'kab_name': kab, 'data': {'2024': {'A PERTANIAN': '100'}}, **extra}

    def test_user_menyimpan_wilayah_sendiri(self):
        res = self.client.post('/api/save-data', self.pdrb(prov_name='JAWA TIMUR', prov_data={'2024': [{'label': 'A PERTANIAN', 'value': 500}]}), format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(PdrbData.objects.get(district=self.blitar, year=2024).value, 100)
        self.assertEqual(PdrbData.objects.get(province=self.jatim, district=None, year=2024).value, 500)

    def test_nama_dicocokkan_tanpa_peduli_huruf_dan_spasi(self):
        res = self.client.post('/api/save-data', self.pdrb(kab='  kabupaten   blitar '), format='json')
        self.assertEqual(res.status_code, 200)

    def test_wilayah_lain_ditolak_dan_tidak_ada_data_tertulis(self):
        res = self.client.post('/api/save-data', self.pdrb(kab='KABUPATEN KEDIRI'), format='json')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(PdrbData.objects.exists())

    def test_provinsi_lain_ditolak(self):
        res = self.client.post('/api/save-data', self.pdrb(prov_name='JAWA TENGAH', prov_data={'2024': [{'label': 'A PERTANIAN', 'value': 1}]}), format='json')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(PdrbData.objects.exists())

    def test_user_tidak_bisa_membuat_kabupaten_baru(self):
        self.user.profile.asal_kokab = 'KABUPATEN SIAPA'
        self.user.profile.save()
        before = District.objects.count()
        res = self.client.post('/api/save-data', self.pdrb(kab='KABUPATEN SIAPA'), format='json')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(District.objects.count(), before)
        res = self.client.post('/api/save-data', self.pdrb(kab='KABUPATEN LAIN'), format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(District.objects.count(), before)

    def test_akun_tanpa_wilayah_ditolak(self):
        self.client.force_authenticate(buat_user('tanpa'))
        res = self.client.post('/api/save-data', self.pdrb(), format='json')
        self.assertEqual(res.status_code, 403)

    def test_kab_name_wajib(self):
        res = self.client.post('/api/save-data', {'type': 'pdrb', 'data': {}}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_produksi_kabupaten_dan_kecamatan(self):
        base = {'type': 'production', 'year': 2024, 'data': {str(self.komoditas.id): '12'}}
        ok = self.client.post('/api/save-data', {**base, 'kab_name': 'KABUPATEN BLITAR', 'kec_name': 'Wlingi'}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ProductionData.objects.filter(district=self.blitar, subdistrict__name='Wlingi', value=12).exists())
        tolak = self.client.post('/api/save-data', {**base, 'kab_name': 'KABUPATEN KEDIRI'}, format='json')
        self.assertEqual(tolak.status_code, 403)
        self.assertFalse(ProductionData.objects.filter(district=self.kediri).exists())

    def test_tahun_tidak_valid_menghasilkan_400_bukan_500(self):
        res = self.client.post('/api/save-data', {'type': 'production', 'year': 'abc', 'kab_name': 'KABUPATEN BLITAR', 'data': {}}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_superuser_bebas_menulis_wilayah_mana_pun_yang_sudah_ada(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/save-data', self.pdrb(kab='KABUPATEN KEDIRI'), format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(PdrbData.objects.filter(district=self.kediri).exists())

    def test_superuser_kabupaten_tak_dikenal_404_bukan_500_dan_tidak_membuat_data(self):
        self.client.force_authenticate(self.admin)
        before = District.objects.count()
        res = self.client.post('/api/save-data', self.pdrb(kab='KABUPATEN BARU'), format='json')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(District.objects.count(), before)

    def test_superuser_nama_kembar_antar_provinsi_dipilah_dengan_prov_name(self):
        District.objects.create(name='KOTA KEMBAR', province=self.jatim)
        tengah = District.objects.create(name='KOTA KEMBAR', province=self.jateng)
        self.client.force_authenticate(self.admin)
        ambigu = self.client.post('/api/save-data', self.pdrb(kab='KOTA KEMBAR'), format='json')
        self.assertEqual(ambigu.status_code, 400)
        ok = self.client.post('/api/save-data', self.pdrb(kab='KOTA KEMBAR', prov_name='JAWA TENGAH'), format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(PdrbData.objects.filter(district=tengah, year=2024).exists())

    def test_tanpa_login_ditolak(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/save-data', self.pdrb(), format='json').status_code, 401)


# ---------------------------------------------------------------------------
# Perhitungan dashboard (LQ, SSA, Klassen) terhadap Excel referensi Kota Bogor
# ---------------------------------------------------------------------------
from .bogor_golden_data import SEKTOR as BOGOR, TAHUN as BOGOR_TAHUN


def muat_bogor(tahun=BOGOR_TAHUN, kab_saja=()):
    """Muat PDRB Kota Bogor dan Jawa Barat dari Excel referensi ke database uji.
    `kab_saja`: tahun yang hanya diisi untuk kabupaten (data provinsi belum ada)."""
    prov = Province.objects.create(name='Jawa Barat')
    kota = District.objects.create(name='Kota Bogor', province=prov)
    for s in BOGOR:
        sub = Subsector.objects.create(name=s['nama'])
        for tahun_i, y in enumerate(BOGOR_TAHUN):
            if y in tahun:
                PdrbData.objects.create(year=y, province=prov, district=None, subsector=sub, value=s['jabar'][tahun_i])
                PdrbData.objects.create(year=y, district=kota, subsector=sub, value=s['bogor'][tahun_i])
    for y in kab_saja:
        # tahun tambahan hanya untuk kabupaten, memakai angka 2019 sebagai pengisi
        for s in BOGOR:
            sub = Subsector.objects.get(name=s['nama'])
            PdrbData.objects.create(year=y, district=kota, subsector=sub, value=s['bogor'][0])


class RingkasanDashboardTest(APITestCase):
    def ambil(self, **params):
        res = self.client.get('/api/dashboard/summary/', {'province': 'Jawa Barat', 'kabupaten': 'Kota Bogor', **params})
        self.assertEqual(res.status_code, 200)
        return res.json()

    def test_cocok_dengan_excel_referensi_untuk_17_sektor(self):
        muat_bogor()
        data = self.ambil()
        app = {x['sektor']: x for x in data['lq_summary']}
        self.assertEqual(len(app), 17)
        for s in BOGOR:
            a = app[s['nama']]
            self.assertAlmostEqual(a['lq'], s['lq'], delta=0.006, msg=f"LQ {s['nama']}")
            self.assertAlmostEqual(a['ssa'], s['ssa'], delta=0.011, msg=f"SSA {s['nama']}")
            self.assertEqual(a['kuadran'], s['kuadran'], msg=f"kuadran {s['nama']}")
            self.assertEqual(a['status'], 'Basis' if s['lq'] >= 1 else 'Non-Basis', msg=s['nama'])
        self.assertEqual(data['stats']['sektor'], 14)  # jumlah sektor basis di sheet LQ
        self.assertEqual(data['klassen'], [8, 0, 6, 3])  # I, II, III, IV menurut penomoran Excel
        self.assertIsNone(data['message'])

    def test_klassen_per_kuadran_menurut_penomoran_excel(self):
        muat_bogor()
        data = self.ambil()
        hitung = [sum(1 for s in BOGOR if s['kuadran'] == k) for k in (1, 2, 3, 4)]
        self.assertEqual(data['klassen'], hitung)
        # I = LQ>=1 & SSA+, II = LQ<1 & SSA+, III = LQ>=1 & SSA-, IV = LQ<1 & SSA-
        aturan = {1: lambda lq, ssa: lq >= 1 and ssa > 0, 2: lambda lq, ssa: lq < 1 and ssa > 0,
                  3: lambda lq, ssa: lq >= 1 and ssa <= 0, 4: lambda lq, ssa: lq < 1 and ssa <= 0}
        for x in data['lq_summary']:
            self.assertTrue(aturan[x['kuadran']](x['lq'], x['ssa']), x)

    def test_tahun_tanpa_data_provinsi_tidak_merusak_hasil(self):
        # 2018-2019 hanya ada data kabupaten; hasilnya harus sama dengan tanpa tahun itu.
        muat_bogor(tahun=[2021, 2022, 2023, 2024], kab_saja=[2018, 2019, 2020])
        data = self.ambil()
        pembanding = {x['sektor']: x for x in self._hasil_tahun_lengkap()['lq_summary']}
        for x in data['lq_summary']:
            self.assertEqual(x['lq'], pembanding[x['sektor']]['lq'], x['sektor'])
            self.assertEqual(x['ssa'], pembanding[x['sektor']]['ssa'], x['sektor'])
            self.assertEqual(x['kuadran'], pembanding[x['sektor']]['kuadran'], x['sektor'])
        self.assertIn('2018, 2019, 2020', data['message'])
        self.assertIn('tidak dihitung', data['message'])

    def _hasil_tahun_lengkap(self):
        return self.ambil(start_year=2021, end_year=2024)

    def test_kurang_dari_dua_tahun_lengkap_tidak_menghitung_ssa(self):
        muat_bogor(tahun=[2024], kab_saja=[2022, 2023])
        data = self.ambil()
        self.assertIn('< 2 tahun lengkap', data['message'])
        self.assertTrue(all(x['ssa'] is None and x['kuadran'] is None for x in data['lq_summary']))
        self.assertEqual(data['klassen'], [0, 0, 0, 0])
        # LQ satu tahun (2024) tetap dihitung dari tahun lengkap saja
        app = {x['sektor']: x['lq'] for x in data['lq_summary']}
        s = next(x for x in BOGOR if x['nama'].startswith('H '))
        tot_b = sum(x['bogor'][5] for x in BOGOR)
        tot_j = sum(x['jabar'][5] for x in BOGOR)
        lq_2024 = (s['bogor'][5] / tot_b) / (s['jabar'][5] / tot_j)
        self.assertAlmostEqual(app[s['nama']], round(lq_2024, 2), places=2)

    def test_kabupaten_tanpa_data_lengkap_sama_sekali(self):
        muat_bogor(tahun=[], kab_saja=[2022, 2023])
        data = self.ambil()
        self.assertEqual(data['lq_summary'], [])
        self.assertIn('tidak dihitung', data['message'])


# ---------------------------------------------------------------------------
# Akun koperasi desa + data Podes (blok 906 dan 907)
# ---------------------------------------------------------------------------
import tempfile
from pathlib import Path

from django.core.management import call_command

from . import podes
from .models import Desa, PodesKomoditas


def buat_desa(iddesa='1101010001', nama='LATIUNG', kec='TEUPAH SELATAN', kab='SIMEULUE', prov='ACEH', **podes):
    return Desa.objects.create(
        iddesa=iddesa, kode_prov=iddesa[:2], kode_kab=iddesa[2:4], kode_kec=iddesa[4:7], kode_desa=iddesa[7:],
        nama_prov=prov, nama_kab=kab, nama_kec=kec, nama_desa=nama, **podes)


def daftar(client, **extra):
    data = {'username': 'u1', 'password': 'rahasia123', 'first_name': 'Nama', 'email': 'a@b.id', 'phone_number': '0812', **extra}
    return client.post('/api/auth/register', data, format='json')


class PendaftaranKoperasiTest(APITestCase):
    def setUp(self):
        self.desa = buat_desa()

    def test_daftar_akun_koperasi_terhubung_ke_desa_dan_tanpa_wilayah_kabupaten(self):
        res = daftar(self.client, account_type='koperasi', desa_id=self.desa.iddesa,
                     asal_provinsi='JAWA TIMUR', asal_kokab='KABUPATEN BLITAR')
        self.assertEqual(res.status_code, 201, res.content)
        profil = UserProfile.objects.get(user__username='u1')
        self.assertEqual(profil.account_type, 'koperasi')
        self.assertEqual(profil.desa, self.desa)
        # asal_kokab sengaja dikosongkan agar akun desa tidak pernah dianggap pemilik data kabupaten
        self.assertEqual((profil.asal_provinsi, profil.asal_kokab), ('', ''))

    def test_desa_yang_sudah_terdaftar_tidak_bisa_didaftarkan_lagi(self):
        self.assertEqual(daftar(self.client, account_type='koperasi', desa_id=self.desa.iddesa).status_code, 201)
        res = daftar(self.client, username='u2', account_type='koperasi', desa_id=self.desa.iddesa)
        self.assertEqual(res.status_code, 400)
        self.assertIn('sudah memiliki akun koperasi', str(res.json()['desa_id']))
        self.assertNotIn('u1', str(res.json()))  # username pemilik tidak dibocorkan
        self.assertFalse(User.objects.filter(username='u2').exists())

    def test_desa_wajib_dan_harus_ada(self):
        res = daftar(self.client, account_type='koperasi')
        self.assertEqual(res.status_code, 400)
        self.assertIn('desa_id', res.json())
        res = daftar(self.client, account_type='koperasi', desa_id='9999999999')
        self.assertEqual(res.status_code, 400)
        self.assertIn('tidak ditemukan', str(res.json()['desa_id']))
        self.assertFalse(User.objects.filter(username='u1').exists())

    def test_tipe_akun_tidak_dikenal_ditolak(self):
        self.assertEqual(daftar(self.client, account_type='superadmin').status_code, 400)

    def test_tanpa_account_type_tetap_akun_daerah(self):
        res = daftar(self.client, asal_provinsi='JAWA TIMUR', asal_kokab='KABUPATEN BLITAR')
        self.assertEqual(res.status_code, 201)
        profil = UserProfile.objects.get(user__username='u1')
        self.assertEqual((profil.account_type, profil.desa), ('daerah', None))
        self.assertEqual(profil.asal_kokab, 'KABUPATEN BLITAR')

    def test_akun_koperasi_tidak_menghalangi_pendaftaran_kokab_dan_sebaliknya(self):
        self.assertEqual(daftar(self.client, username='kop', account_type='koperasi', desa_id=self.desa.iddesa).status_code, 201)
        self.assertEqual(daftar(self.client, username='dpm', asal_provinsi='ACEH', asal_kokab='SIMEULUE').status_code, 201)
        # aturan lama tetap berlaku untuk sesama akun daerah
        res = daftar(self.client, username='dpm2', asal_provinsi='ACEH', asal_kokab='SIMEULUE')
        self.assertEqual(res.status_code, 400)
        self.assertIn('asal_kokab', res.json())

    def test_unique_di_database_menahan_pendaftaran_serentak(self):
        daftar(self.client, account_type='koperasi', desa_id=self.desa.iddesa)
        from django.db import IntegrityError, transaction
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserProfile.objects.create(user=buat_user('curang'), account_type='koperasi', desa=self.desa)

    def test_respons_login_memuat_tipe_akun_dan_desa(self):
        daftar(self.client, account_type='koperasi', desa_id=self.desa.iddesa)
        res = self.client.post('/api/auth/login', {'username': 'u1', 'password': 'rahasia123'}, format='json')
        self.assertEqual(res.status_code, 200)
        profil = res.json()['user']['profile']
        self.assertEqual(profil['account_type'], 'koperasi')
        self.assertEqual(profil['desa']['nama_desa'], 'LATIUNG')
        self.assertEqual(profil['desa']['iddesa'], '1101010001')

    def test_akun_koperasi_tidak_bisa_menyimpan_data_wilayah(self):
        prov = Province.objects.create(name='ACEH')
        District.objects.create(name='SIMEULUE', province=prov)
        user = buat_user('kop')
        # skenario terburuk: profil koperasi yang kebetulan terisi asal_kokab
        UserProfile.objects.create(user=user, asal_provinsi='ACEH', asal_kokab='SIMEULUE', account_type='koperasi', desa=self.desa)
        self.client.force_authenticate(user)
        res = self.client.post('/api/save-data', {'type': 'pdrb', 'kab_name': 'SIMEULUE', 'data': {'2024': {'A': '1'}}}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(PdrbData.objects.exists())


class DesaWilayahTest(APITestCase):
    def setUp(self):
        buat_desa('1101010001', 'LATIUNG', 'TEUPAH SELATAN', 'SIMEULUE', 'ACEH')
        buat_desa('1101010002', 'LABUHAN BAJAU', 'TEUPAH SELATAN', 'SIMEULUE', 'ACEH')
        buat_desa('1101020001', 'DESA KEC DUA', 'SIMEULUE TIMUR', 'SIMEULUE', 'ACEH')
        buat_desa('1271010001', 'DESA MEDAN', 'MEDAN KOTA', 'KOTA MEDAN', 'SUMATERA UTARA')

    def get(self, **params):
        return self.client.get('/api/desa/wilayah', params)

    def test_bertingkat_provinsi_ke_desa_tanpa_login(self):
        self.assertEqual(self.get(tingkat='provinsi').json(),
                         [{'kode': '11', 'nama': 'ACEH'}, {'kode': '12', 'nama': 'SUMATERA UTARA'}])
        self.assertEqual(self.get(tingkat='kabupaten', prov='11').json(), [{'kode': '01', 'nama': 'SIMEULUE'}])
        self.assertEqual([k['nama'] for k in self.get(tingkat='kecamatan', prov='11', kab='01').json()],
                         ['TEUPAH SELATAN', 'SIMEULUE TIMUR'])
        desa = self.get(tingkat='desa', prov='11', kab='01', kec='010').json()
        self.assertEqual([d['nama'] for d in desa], ['LABUHAN BAJAU', 'LATIUNG'])

    def test_desa_menandai_yang_sudah_terdaftar(self):
        UserProfile.objects.create(user=buat_user('kop'), account_type='koperasi', desa=Desa.objects.get(iddesa='1101010001'))
        desa = {d['nama']: d['terdaftar'] for d in self.get(tingkat='desa', prov='11', kab='01', kec='010').json()}
        self.assertEqual(desa, {'LABUHAN BAJAU': False, 'LATIUNG': True})

    def test_parameter_tidak_lengkap_ditolak(self):
        self.assertEqual(self.get().status_code, 400)
        self.assertEqual(self.get(tingkat='kabupaten').status_code, 400)
        self.assertEqual(self.get(tingkat='kecamatan', prov='11').status_code, 400)
        self.assertEqual(self.get(tingkat='desa', prov='11', kab='01').status_code, 400)

    def test_hanya_baca(self):
        self.assertEqual(self.client.post('/api/desa/wilayah', {}, format='json').status_code, 405)


class KomoditasUnggulanDesaTest(APITestCase):
    URL = '/api/koperasi/komoditas-unggulan'

    def setUp(self):
        PodesKomoditas.objects.create(kode=1102, nama='Padi ladang')
        self.tani = buat_desa('1101010001', 'LATIUNG', r906a=1, r906b=1, r906c=1102, r907a=3, r907b=1, r907c='Keripik pisang')
        self.jasa = buat_desa('1101010002', 'JASA', r906a=3, r906b=0, r906c=None, r907a=0, r907b=0, r907c='')
        self.jasa_tani = buat_desa('1101010003', 'JASTAN', r906a=1, r906b=7, r906c=None, r907a=0, r907b=0)

    def akun(self, desa, nama='kop'):
        user = buat_user(nama)
        UserProfile.objects.create(user=user, account_type='koperasi', desa=desa)
        return user

    def test_koperasi_melihat_data_podes_desanya_sendiri(self):
        self.client.force_authenticate(self.akun(self.tani))
        data = self.client.get(self.URL).json()
        self.assertEqual(data['tahun'], 2025)
        self.assertEqual(data['desa']['nama_desa'], 'LATIUNG')
        self.assertEqual(data['r906'], {
            'lapangan_usaha': {'kode': 1, 'label': 'Pertanian'},
            'sub_sektor': {'kode': 1, 'label': 'Tanaman Pangan'},
            'komoditas_utama': {'kode': 1102, 'nama': 'Padi ladang'},
        })
        self.assertEqual(data['r907'], {'jumlah_industri_mikro_kecil': 3, 'jumlah_sentra_industri': 1,
                                        'produk_sentra_industri': 'Keripik pisang'})

    def test_desa_non_pertanian_tanpa_subsektor_dan_komoditas(self):
        self.client.force_authenticate(self.akun(self.jasa))
        data = self.client.get(self.URL).json()
        self.assertEqual(data['r906'], {'lapangan_usaha': {'kode': 3, 'label': 'Jasa'}, 'sub_sektor': None, 'komoditas_utama': None})
        self.assertEqual(data['r907'], {'jumlah_industri_mikro_kecil': 0, 'jumlah_sentra_industri': 0, 'produk_sentra_industri': None})

    def test_jasa_pertanian_punya_subsektor_tanpa_komoditas(self):
        self.client.force_authenticate(self.akun(self.jasa_tani))
        r906 = self.client.get(self.URL).json()['r906']
        self.assertEqual(r906['sub_sektor'], {'kode': 7, 'label': 'Jasa Pertanian'})
        self.assertIsNone(r906['komoditas_utama'])

    def test_koperasi_tidak_bisa_melihat_desa_lain_lewat_parameter(self):
        self.client.force_authenticate(self.akun(self.jasa))
        data = self.client.get(self.URL, {'desa_id': self.tani.iddesa}).json()
        self.assertEqual(data['desa']['nama_desa'], 'JASA')

    def test_akses_ditolak_untuk_anonim_dan_akun_daerah(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)
        self.client.force_authenticate(buat_user('dpm', 'ACEH', 'SIMEULUE'))
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_superuser_memilih_desa_lewat_parameter(self):
        self.client.force_authenticate(buat_user('admin', superuser=True))
        self.assertEqual(self.client.get(self.URL).status_code, 403)
        self.assertEqual(self.client.get(self.URL, {'desa_id': self.tani.iddesa}).json()['desa']['nama_desa'], 'LATIUNG')
        self.assertEqual(self.client.get(self.URL, {'desa_id': '0000000000'}).status_code, 404)


class ExportImporPodesTest(APITestCase):
    """export_podes_ringkas (Excel -> berkas ringkas) dan import_podes (berkas ringkas -> database)."""

    HEADER = ['iddesa,C,10', 'R101,C,2', 'R102,C,2', 'R103,C,3', 'R104,C,3', 'nama_prov,C,25', 'nama_kab,C,32', None,
              'Kab/Kota Standar', 'nama_kec,C,31', 'nama_desa,C,46', 'r702hk2,N,2,0', 'r906a,N,1,0', 'r906b,N,1,0',
              'r906c,N,6,0', 'r907a,N,3,0', 'r907b,N,2,0', 'r907c,C,166']

    def baris(self, iddesa='1171010001', desa='LAMBUNG', a=1, b=1, c=1102, a7=2, b7=1, teks='Tenun'):
        return [iddesa, iddesa[:2], iddesa[2:4], iddesa[4:7], iddesa[7:], 'ACEH', 'BANDA ACEH', None,
                'KOTA BANDA ACEH', 'MEURAXA', desa, 99, a, b, c, a7, b7, teks]

    def excel(self, folder, baris, komoditas=((1102, 'Padi ladang'),)):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Sheet1'
        ws.append(self.HEADER)
        for r in baris:
            ws.append(r)
        wb.save(Path(folder) / 'podes2025-desa_part2.xlsx')
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['R906c,N,6,0', 'Keterangan,C,77'])
        for k in komoditas:
            ws.append(list(k))
        wb.save(Path(folder) / 'Master Data 906c.xlsx')

    def ekspor_lalu_impor(self, baris, **kw):
        with tempfile.TemporaryDirectory() as src, tempfile.TemporaryDirectory() as out:
            self.excel(src, baris, **kw)
            call_command('export_podes_ringkas', dir=src, out=out, verbosity=0)
            call_command('import_podes', data_dir=out, verbosity=0)

    def test_ekspor_lalu_impor_memetakan_kolom_dan_membersihkan_nilai(self):
        self.ekspor_lalu_impor([self.baris(), self.baris('1171010002', 'BLANG', a=3, b=0, c=0, a7=0, b7=0, teks=None)])
        self.assertEqual(PodesKomoditas.objects.get(kode=1102).nama, 'Padi ladang')
        a = Desa.objects.get(iddesa='1171010001')
        # kode wilayah diturunkan dari iddesa; nama kabupaten memakai nama baku
        self.assertEqual((a.kode_prov, a.kode_kab, a.kode_kec, a.kode_desa), ('11', '71', '010', '001'))
        self.assertEqual((a.nama_kab, a.nama_kec, a.nama_desa), ('KOTA BANDA ACEH', 'MEURAXA', 'LAMBUNG'))
        self.assertEqual((a.r906a, a.r906b, a.r906c, a.r907a, a.r907b, a.r907c), (1, 1, 1102, 2, 1, 'Tenun'))
        b = Desa.objects.get(iddesa='1171010002')
        self.assertIsNone(b.r906c)  # 0 = tidak ada komoditas utama
        self.assertEqual(b.r907c, '')

    def test_berkas_ringkas_hanya_memuat_kolom_yang_dibutuhkan_dan_deterministik(self):
        import csv, gzip
        with tempfile.TemporaryDirectory() as src, tempfile.TemporaryDirectory() as o1, tempfile.TemporaryDirectory() as o2:
            self.excel(src, [self.baris()])
            call_command('export_podes_ringkas', dir=src, out=o1, verbosity=0)
            call_command('export_podes_ringkas', dir=src, out=o2, verbosity=0)
            with gzip.open(Path(o1) / 'podes_desa.csv.gz', 'rt', encoding='utf-8') as f:
                self.assertEqual(next(csv.reader(f)), podes.KOLOM_DESA)  # r702hk2 dan kolom lain tidak ikut
            for nama in ('podes_desa.csv.gz', 'podes_komoditas.csv'):
                self.assertEqual((Path(o1) / nama).read_bytes(), (Path(o2) / nama).read_bytes(), nama)

    def test_impor_ulang_memperbarui_tanpa_menghapus_akun_desa(self):
        with tempfile.TemporaryDirectory() as src, tempfile.TemporaryDirectory() as out:
            self.excel(src, [self.baris(a7=2)])
            call_command('export_podes_ringkas', dir=src, out=out, verbosity=0)
            call_command('import_podes', data_dir=out, verbosity=0)
            desa = Desa.objects.get(iddesa='1171010001')
            UserProfile.objects.create(user=buat_user('kop'), account_type='koperasi', desa=desa)
            self.excel(src, [self.baris(a7=9)])
            call_command('export_podes_ringkas', dir=src, out=out, verbosity=0)
            call_command('import_podes', data_dir=out, verbosity=0)
        self.assertEqual(Desa.objects.count(), 1)
        desa.refresh_from_db()
        self.assertEqual(desa.r907a, 9)
        self.assertEqual(UserProfile.objects.get(user__username='kop').desa_id, desa.id)

    def test_bila_kosong_melewati_impor_bila_data_sudah_ada(self):
        buat_desa('1101010001', 'LATIUNG', r907a=5)
        # berkas tidak ada: tidak boleh error karena impor memang dilewati
        call_command('import_podes', data_dir='/folder/tidak/ada', bila_kosong=True, verbosity=0)
        self.assertEqual(Desa.objects.get(iddesa='1101010001').r907a, 5)

    def test_bila_kosong_tetap_mengimpor_saat_tabel_kosong(self):
        with tempfile.TemporaryDirectory() as src, tempfile.TemporaryDirectory() as out:
            self.excel(src, [self.baris()])
            call_command('export_podes_ringkas', dir=src, out=out, verbosity=0)
            call_command('import_podes', data_dir=out, bila_kosong=True, verbosity=0)
        self.assertEqual(Desa.objects.count(), 1)

    def test_berkas_atau_excel_hilang_memberi_pesan_jelas(self):
        from django.core.management.base import CommandError
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(CommandError, 'export_podes_ringkas'):
                call_command('import_podes', data_dir=d, verbosity=0)
            with self.assertRaisesRegex(CommandError, 'File tidak ditemukan'):
                call_command('export_podes_ringkas', dir=d, out=d, verbosity=0)


class BerkasPodesBawaanTest(APITestCase):
    """Berkas ringkas yang di-commit di api/data/ (yang dipakai Docker) harus utuh."""

    def test_berkas_bawaan_dapat_diimpor_dan_konsisten(self):
        import csv, gzip
        with gzip.open(podes.DATA_DIR / podes.FILE_DESA, 'rt', encoding='utf-8', newline='') as f:
            rd = csv.DictReader(f)
            self.assertEqual(rd.fieldnames, podes.KOLOM_DESA)
            ids = [r['iddesa'] for r in rd]
        self.assertGreater(len(ids), 80000)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(len(i) == 10 and i.isdigit() for i in ids))
        call_command('import_podes', verbosity=0)
        self.assertEqual(Desa.objects.count(), len(ids))
        # semua kode komoditas yang dipakai desa ada di master
        pakai = set(Desa.objects.exclude(r906c__isnull=True).values_list('r906c', flat=True))
        ada = set(PodesKomoditas.objects.values_list('kode', flat=True))
        self.assertFalse(pakai - ada)


# ---------------------------------------------------------------------------
# Overview Koperasi (rekap koperasi nasional per kabupaten/kota)
# ---------------------------------------------------------------------------
from . import koperasi_data as kd
from .models import KoperasiRekap


def rekap(kab, nama_kab, kelompok, detail, tahun, koperasi, aktif=None, anggota=0, nama_prov=None, aset=0, **extra):
    return KoperasiRekap.objects.create(
        kode_prov=kab[:2], kode_kab=kab, nama_prov=nama_prov or {'11': 'Aceh', '12': 'Sumatera Utara'}[kab[:2]],
        nama_kab=nama_kab, kelompok=kelompok, detail=detail, tahun=tahun, koperasi=koperasi,
        aktif=koperasi if aktif is None else aktif, anggota=anggota, aset=aset, **extra)


def isi_rekap_kecil():
    """Dua provinsi, tiga kabupaten, tahun 2025 dan 2026. Angka sengaja dibuat mudah dihitung tangan."""
    data = [  # (kab, nama, total2025, aktif2025, total2026, aktif2026, desaMP2026, kelMP2026)
        ('1101', 'Kab. Simeulue', 100, 60, 110, 70, 30, 5),
        ('1102', 'Kab. Aceh Singkil', 50, 20, 60, 25, 10, 0),
        ('1201', 'Kab. Deli Serdang', 200, 150, 210, 160, 0, 0),
    ]
    for kab, nama, t25, a25, t26, a26, desa, kel in data:
        rekap(kab, nama, kd.KELOMPOK_TOTAL, 'Total Koperasi', 2025, t25, a25, anggota=t25 * 10, aset=t25 * 1000.0)
        rekap(kab, nama, kd.KELOMPOK_TOTAL, 'Total Koperasi', 2026, t26, a26, anggota=t26 * 10, aset=t26 * 1000.0)
        rekap(kab, nama, kd.KELOMPOK_JENIS, 'Konsumen', 2025, t25, a25)
        rekap(kab, nama, kd.KELOMPOK_JENIS, 'Konsumen', 2026, t26 - desa - kel, a26 - desa - kel)
        if desa:
            rekap(kab, nama, kd.KELOMPOK_JENIS, 'Desa Merah Putih', 2026, desa, desa, anggota=desa * 5)
        if kel:
            rekap(kab, nama, kd.KELOMPOK_JENIS, 'Kelurahan Merah Putih', 2026, kel, kel, anggota=kel * 5)
        rekap(kab, nama, kd.KELOMPOK_SEKTOR, 'Jasa Lainnya', 2026, t26, a26)


class OverviewKoperasiAksesTest(APITestCase):
    URL = '/api/koperasi/overview'

    def setUp(self):
        isi_rekap_kecil()
        self.desa = buat_desa()
        self.koperasi = buat_user('kop')
        UserProfile.objects.create(user=self.koperasi, account_type='koperasi', desa=self.desa)
        self.daerah = buat_user('daerah', 'ACEH', 'SIMEULUE')
        self.admin = buat_user('admin', superuser=True)

    def test_tanpa_login_ditolak(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_akun_daerah_ditolak(self):
        self.client.force_authenticate(self.daerah)
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_user_tanpa_profil_ditolak(self):
        self.client.force_authenticate(buat_user('polos'))
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_akun_koperasi_dan_superadmin_boleh(self):
        for user in (self.koperasi, self.admin):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(self.URL).status_code, 200, user.username)

    def test_superadmin_tanpa_profil_boleh_dan_hanya_membaca(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(self.URL, {}, format='json').status_code, 405)


class OverviewKoperasiHitungTest(APITestCase):
    URL = '/api/koperasi/overview'

    def setUp(self):
        isi_rekap_kecil()
        self.client.force_authenticate(buat_user('admin', superuser=True))

    def get(self, **q):
        res = self.client.get(self.URL, q)
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_nasional_tahun_terbaru_menjadi_bawaan(self):
        d = self.get()
        self.assertEqual((d['tahun'], d['tahun_tersedia']), (2026, [2025, 2026]))
        self.assertEqual(d['lingkup']['tingkat'], 'nasional')
        k = d['kpi']
        self.assertEqual((k['koperasi'], k['aktif'], k['tidak_aktif']), (380, 255, 0))
        self.assertEqual((k['kdkmp'], k['kdkmp_desa'], k['kdkmp_kelurahan']), (45, 40, 5))
        self.assertEqual(k['reguler'], 335)                       # 380 - 45
        self.assertEqual(k['kdkmp'] + k['reguler'], k['koperasi'])
        self.assertEqual(k['persen_kdkmp'], round(45 / 380 * 100, 1))
        self.assertEqual(k['persen_aktif'], round(255 / 380 * 100, 1))
        self.assertEqual(k['anggota'], 3800)
        self.assertEqual(k['kdkmp_anggota'], 40 * 5 + 5 * 5)
        self.assertEqual(k['aset'], 380000)

    def test_tahun_lain_dan_kdkmp_belum_ada(self):
        k = self.get(tahun=2025)['kpi']
        self.assertEqual((k['koperasi'], k['kdkmp'], k['reguler']), (350, 0, 350))

    def test_tren_semua_tahun_pada_lingkup_yang_sama(self):
        tren = self.get(prov='11')['tren']
        self.assertEqual([t['tahun'] for t in tren], [2025, 2026])
        self.assertEqual((tren[0]['koperasi'], tren[0]['kdkmp'], tren[0]['reguler']), (150, 0, 150))
        self.assertEqual((tren[1]['koperasi'], tren[1]['kdkmp'], tren[1]['reguler']), (170, 45, 125))

    def test_tabel_wilayah_nasional_per_provinsi_terurut(self):
        w = self.get()['wilayah']
        self.assertEqual(w['tingkat'], 'provinsi')
        self.assertEqual([(r['kode'], r['koperasi']) for r in w['baris']], [('12', 210), ('11', 170)])
        aceh = w['baris'][1]
        self.assertEqual((aceh['nama'], aceh['kdkmp'], aceh['reguler']), ('Aceh', 45, 125))

    def test_provinsi_menampilkan_kabupaten_dan_opsinya(self):
        d = self.get(prov='11')
        self.assertEqual(d['lingkup']['prov'], {'kode': '11', 'nama': 'Aceh'})
        self.assertEqual(d['kpi']['koperasi'], 170)
        self.assertEqual(d['wilayah']['tingkat'], 'kabupaten')
        self.assertEqual([r['nama'] for r in d['wilayah']['baris']], ['Kab. Simeulue', 'Kab. Aceh Singkil'])
        self.assertEqual([o['kode'] for o in d['opsi']['kabupaten']], ['1102', '1101'])   # urut nama
        self.assertEqual(len(d['opsi']['provinsi']), 2)

    def test_kabupaten(self):
        d = self.get(prov='11', kab='1101')
        self.assertEqual(d['lingkup']['kab'], {'kode': '1101', 'nama': 'Kab. Simeulue'})
        self.assertEqual((d['kpi']['koperasi'], d['kpi']['kdkmp'], d['kpi']['reguler']), (110, 35, 75))

    def test_jenis_menandai_kdkmp_dan_urut_terbesar(self):
        jenis = self.get()['jenis']
        self.assertEqual([j['nama'] for j in jenis], ['Konsumen', 'Desa Merah Putih', 'Kelurahan Merah Putih'])
        self.assertEqual([j['kdkmp'] for j in jenis], [False, True, True])
        self.assertEqual(sum(j['koperasi'] for j in jenis), 380)    # jenis menjumlah ke total

    def test_sektor_ikut_tahun_dan_lingkup(self):
        self.assertEqual(self.get(prov='12')['sektor'], [{'nama': 'Jasa Lainnya', 'koperasi': 210, 'aktif': 160, 'anggota': 0}])
        self.assertEqual(self.get(tahun=2025)['sektor'], [])

    def test_parameter_salah(self):
        for q, kode in [({'tahun': 'abc'}, 400), ({'tahun': 2030}, 400), ({'prov': '99'}, 404),
                        ({'kab': '9999'}, 404), ({'prov': '12', 'kab': '1101'}, 400)]:
            self.assertEqual(self.client.get(self.URL, q).status_code, kode, q)

    def test_data_belum_dimuat(self):
        KoperasiRekap.objects.all().delete()
        self.assertEqual(self.get(), {'kosong': True, 'tahun_tersedia': []})


class ImporEksporKoperasiTest(APITestCase):
    """Ekspor Excel -> berkas ringkas -> impor, termasuk penggabungan ejaan ganda dari sumber."""

    def buat_excel(self, folder):
        import openpyxl
        metrik = list(kd.METRIK_JUMLAH) + list(kd.METRIK_RUPIAH)
        tahun = (2024, 2025)
        header = ['GroupRekap', 'DetailRekap', 'IdPropinsi', 'Propinsi', 'Bagian Wilayah', 'IdKabupaten', 'Kabupaten'] \
            + [f'{m}_{t}' for m in metrik for t in tahun]

        def baris(kel, det, kab, nama, k24, k25, **lain):
            nilai = {f'jumlahKoperasi_2024': k24, f'jumlahKoperasi_2025': k25, **lain}
            return [kel, det, '12', 'Sumatera Utara', 'WIB', kab, nama] + [nilai.get(f'{m}_{t}', 0) for m in metrik for t in tahun]

        ws_rows = [header,
                   # satu kota dengan dua ejaan: tahun lama dan tahun baru, plus sektor beda huruf besar/kecil
                   baris('Sektor Usaha', 'INDUSTRI PENGOLAHAN', '72', 'Kota Tanjung Balai', 1, 0),
                   baris('Sektor Usaha', 'Industri Pengolahan', '72', 'Kota Tanjungbalai', 0, 6,
                         jumlahKoperasiAktif_2025=4, jumlahAset_2025=1234.567),
                   baris('Wilayah Koperasi', 'Total Koperasi', '72', 'Kota Tanjung Balai', 1, 0),
                   baris('Wilayah Koperasi', 'Total Koperasi', '72', 'Kota Tanjungbalai', 0, 6),
                   baris('Wilayah Koperasi', 'Total Koperasi', '73', 'Kota Binjai', 0, 0)]      # semua nol: tidak disimpan
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Data'
        for r in ws_rows:
            ws.append(r)
        path = Path(folder) / 'koperasi.xlsx'
        wb.save(path)
        return path

    def test_ejaan_ganda_dan_huruf_besar_digabung(self):
        with tempfile.TemporaryDirectory() as d:
            call_command('export_koperasi_ringkas', excel=str(self.buat_excel(d)), out=d, verbosity=0)
            call_command('import_koperasi', data_dir=d, verbosity=0)
        sektor = KoperasiRekap.objects.filter(kelompok=kd.KELOMPOK_SEKTOR)
        self.assertEqual(sorted(sektor.values_list('detail', 'tahun', 'koperasi')),
                         [('Industri Pengolahan', 2024, 1), ('Industri Pengolahan', 2025, 6)])
        self.assertEqual(set(KoperasiRekap.objects.values_list('nama_kab', flat=True)), {'Kota Tanjungbalai'})   # ejaan terbaru
        s25 = sektor.get(tahun=2025)
        self.assertEqual((s25.aktif, s25.kode_kab, s25.kode_prov), (4, '1272', '12'))
        self.assertAlmostEqual(s25.aset, 1234.57)
        self.assertFalse(KoperasiRekap.objects.filter(kode_kab='1273').exists())        # kabupaten kosong dilewati

    def test_impor_berulang_tidak_menggandakan_dan_bila_kosong_dilewati(self):
        with tempfile.TemporaryDirectory() as d:
            call_command('export_koperasi_ringkas', excel=str(self.buat_excel(d)), out=d, verbosity=0)
            call_command('import_koperasi', data_dir=d, verbosity=0)
            n = KoperasiRekap.objects.count()
            call_command('import_koperasi', data_dir=d, verbosity=0)
            self.assertEqual(KoperasiRekap.objects.count(), n)
            KoperasiRekap.objects.filter(tahun=2024).delete()
            call_command('import_koperasi', data_dir=d, bila_kosong=True, verbosity=0)
            self.assertFalse(KoperasiRekap.objects.filter(tahun=2024).exists())          # tidak disentuh

    def test_berkas_atau_excel_hilang_memberi_pesan_jelas(self):
        from django.core.management.base import CommandError
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(CommandError, 'export_koperasi_ringkas'):
                call_command('import_koperasi', data_dir=d, verbosity=0)
            with self.assertRaisesRegex(CommandError, 'File tidak ditemukan'):
                call_command('export_koperasi_ringkas', excel=str(Path(d) / 'tidak-ada.xlsx'), out=d, verbosity=0)


class BerkasKoperasiBawaanTest(APITestCase):
    """Berkas ringkas yang di-commit di api/data/ (yang dipakai Docker) harus utuh dan konsisten."""

    @classmethod
    def setUpTestData(cls):
        call_command('import_koperasi', verbosity=0)

    def test_semua_kelompok_menjumlah_ke_total_yang_sama_tiap_tahun(self):
        from django.db.models import Sum
        total = dict(KoperasiRekap.objects.filter(kelompok=kd.KELOMPOK_TOTAL).values_list('tahun').annotate(s=Sum('koperasi')))
        self.assertEqual(sorted(total), list(range(2019, 2027)))
        for kel in (kd.KELOMPOK_JENIS, kd.KELOMPOK_BENTUK, kd.KELOMPOK_SEKTOR, kd.KELOMPOK_KELOMPOK):
            per_tahun = dict(KoperasiRekap.objects.filter(kelompok=kel).values_list('tahun').annotate(s=Sum('koperasi')))
            self.assertEqual(per_tahun, total, kel)

    def test_angka_acuan_dari_excel_sumber(self):
        from django.db.models import Sum
        jenis = KoperasiRekap.objects.filter(kelompok=kd.KELOMPOK_JENIS, detail__in=kd.DETAIL_KDKMP)
        per_tahun = dict(jenis.values_list('tahun').annotate(s=Sum('koperasi')))
        self.assertEqual({t: v for t, v in per_tahun.items() if t < 2025}, {})            # KDKMP baru ada sejak 2025
        self.assertEqual(per_tahun[2025], 74653 + 8606)                                    # = "KDKMP 83259" pada Sheet6
        total25 = KoperasiRekap.objects.filter(kelompok=kd.KELOMPOK_TOTAL, tahun=2025).aggregate(s=Sum('koperasi'))['s']
        self.assertEqual(total25, 319352)
        self.assertEqual(KoperasiRekap.objects.values('kode_kab').distinct().count(), 540)
        self.assertEqual(KoperasiRekap.objects.values('kode_prov').distinct().count(), 38)

    def test_sektor_seragam_tanpa_duplikat_huruf_besar_kecil(self):
        sektor = set(KoperasiRekap.objects.filter(kelompok=kd.KELOMPOK_SEKTOR).values_list('detail', flat=True))
        self.assertEqual(len(sektor), 17)
        self.assertEqual(len({s.upper() for s in sektor}), len(sektor))
