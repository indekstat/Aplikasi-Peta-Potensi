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
