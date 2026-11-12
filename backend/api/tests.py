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
