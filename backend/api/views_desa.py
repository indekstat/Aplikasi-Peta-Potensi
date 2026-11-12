from django.db.models import Exists, OuterRef
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Desa, PodesKomoditas, UserProfile

TAHUN_PODES = 2025
LAPANGAN_USAHA = {1: 'Pertanian', 2: 'Industri', 3: 'Jasa'}
SUB_SEKTOR = {
    1: 'Tanaman Pangan', 2: 'Tanaman Hortikultura', 3: 'Tanaman Perkebunan', 4: 'Peternakan',
    5: 'Perikanan', 6: 'Kehutanan', 7: 'Jasa Pertanian',
}


@api_view(['GET'])
@permission_classes([AllowAny])
def desa_wilayah(request):
    """Daftar bertingkat untuk memilih desa saat mendaftar (publik, hanya baca).

    ?tingkat=provinsi | kabupaten&prov=11 | kecamatan&prov=11&kab=01 | desa&prov=11&kab=01&kec=010
    Tingkat desa menyertakan `terdaftar` agar desa yang sudah punya akun koperasi bisa dinonaktifkan."""
    tingkat = request.GET.get('tingkat')
    prov, kab, kec = request.GET.get('prov'), request.GET.get('kab'), request.GET.get('kec')

    def butuh(*params):
        return Response({'detail': f"Parameter {', '.join(params)} wajib diisi"}, status=400)

    if tingkat == 'provinsi':
        rows = Desa.objects.order_by('kode_prov').values('kode_prov', 'nama_prov').distinct()
        return Response([{'kode': r['kode_prov'], 'nama': r['nama_prov']} for r in rows])
    if tingkat == 'kabupaten':
        if not prov:
            return butuh('prov')
        rows = Desa.objects.filter(kode_prov=prov).order_by('kode_kab').values('kode_kab', 'nama_kab').distinct()
        return Response([{'kode': r['kode_kab'], 'nama': r['nama_kab']} for r in rows])
    if tingkat == 'kecamatan':
        if not (prov and kab):
            return butuh('prov', 'kab')
        rows = (Desa.objects.filter(kode_prov=prov, kode_kab=kab).order_by('kode_kec')
                .values('kode_kec', 'nama_kec').distinct())
        return Response([{'kode': r['kode_kec'], 'nama': r['nama_kec']} for r in rows])
    if tingkat == 'desa':
        if not (prov and kab and kec):
            return butuh('prov', 'kab', 'kec')
        terdaftar = Exists(UserProfile.objects.filter(desa=OuterRef('pk')))
        rows = (Desa.objects.filter(kode_prov=prov, kode_kab=kab, kode_kec=kec)
                .annotate(terdaftar=terdaftar).order_by('nama_desa', 'kode_desa'))
        return Response([{'iddesa': d.iddesa, 'nama': d.nama_desa, 'terdaftar': d.terdaftar} for d in rows])
    return Response({'detail': 'tingkat harus provinsi, kabupaten, kecamatan, atau desa'}, status=400)


def _desa_untuk(request):
    """Desa yang boleh dilihat: desa akun koperasi itu sendiri; superuser boleh memilih lewat ?desa_id=."""
    profile = getattr(request.user, 'profile', None)
    if request.user.is_superuser and request.GET.get('desa_id'):
        desa = Desa.objects.filter(iddesa=request.GET['desa_id']).first()
        if not desa:
            return None, Response({'detail': 'Desa tidak ditemukan'}, status=404)
        return desa, None
    if profile and profile.account_type == UserProfile.TIPE_KOPERASI and profile.desa_id:
        return profile.desa, None
    return None, Response({'detail': 'Akun ini tidak terhubung dengan desa'}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def komoditas_unggulan_desa(request):
    """Data Podes 2025 blok 906 (sumber penghasilan & komoditas utama) dan 907 (industri mikro-kecil) desa akun."""
    desa, error = _desa_untuk(request)
    if error:
        return error

    pertanian = desa.r906a == 1
    komoditas = None
    if pertanian and desa.r906c:
        nama = PodesKomoditas.objects.filter(kode=desa.r906c).values_list('nama', flat=True).first()
        komoditas = {'kode': desa.r906c, 'nama': nama or f'Kode {desa.r906c}'}

    return Response({
        'tahun': TAHUN_PODES,
        'desa': {
            'iddesa': desa.iddesa, 'nama_desa': desa.nama_desa, 'nama_kec': desa.nama_kec,
            'nama_kab': desa.nama_kab, 'nama_prov': desa.nama_prov,
        },
        'r906': {
            'lapangan_usaha': (
                {'kode': desa.r906a, 'label': LAPANGAN_USAHA.get(desa.r906a, '-')} if desa.r906a else None),
            'sub_sektor': (
                {'kode': desa.r906b, 'label': SUB_SEKTOR.get(desa.r906b, '-')} if pertanian and desa.r906b else None),
            'komoditas_utama': komoditas,
        },
        'r907': {
            'jumlah_industri_mikro_kecil': desa.r907a or 0,
            'jumlah_sentra_industri': desa.r907b or 0,
            'produk_sentra_industri': desa.r907c or None,
        },
    })
