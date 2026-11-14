from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import koperasi_data as kd
from .models import KoperasiRekap
from .permissions import IsSuperuserOrKoperasi

KPI_FIELD = ['koperasi', 'aktif', 'tidak_aktif', 'bersertifikat', 'sudah_rat', 'anggota', 'anggota_pria',
             'anggota_wanita', 'tenaga_kerja', 'modal_sendiri', 'modal_luar', 'aset', 'volume_usaha', 'shu']
TOP_KELOMPOK = 15


def _jumlah(qs, *fields):
    """Jumlah beberapa field sekaligus; nilai kosong dianggap 0."""
    hasil = qs.aggregate(**{f: Sum(f) for f in fields})
    return {f: hasil[f] or 0 for f in fields}


def _bulat(v):
    return int(round(v)) if v is not None else 0


def _per_detail(qs, kelompok):
    """Satu sudut pandang rekap (mis. jenis koperasi) diringkas per detail, terbesar dulu."""
    rows = (qs.filter(kelompok=kelompok).values('detail')
            .annotate(koperasi=Sum('koperasi'), aktif=Sum('aktif'), anggota=Sum('anggota'))
            .order_by('-koperasi', 'detail'))
    return [{'nama': r['detail'], 'koperasi': r['koperasi'] or 0, 'aktif': r['aktif'] or 0, 'anggota': r['anggota'] or 0}
            for r in rows]


def _ringkas_kdkmp(qs_jenis):
    """KDKMP = Desa + Kelurahan Merah Putih pada Jenis Koperasi; sisanya koperasi reguler."""
    kdkmp = {d: _jumlah(qs_jenis.filter(detail=d), 'koperasi', 'aktif', 'anggota') for d in kd.DETAIL_KDKMP}
    total = {f: sum(v[f] for v in kdkmp.values()) for f in ('koperasi', 'aktif', 'anggota')}
    return kdkmp, total


@api_view(['GET'])
@permission_classes([IsSuperuserOrKoperasi])
def overview_koperasi(request):
    """Overview koperasi Indonesia (Kemenkop, level kabupaten/kota), hanya superadmin dan akun koperasi desa.

    ?tahun=2026&prov=11&kab=1101 . Tanpa prov = nasional; prov = satu provinsi; kab = satu kabupaten/kota.
    Setiap kelompok rekap (jenis, bentuk, sektor, kelompok) menjumlah ke total yang sama; tidak dijumlahkan lintas kelompok."""
    semua = KoperasiRekap.objects
    tahun_tersedia = sorted(semua.values_list('tahun', flat=True).distinct())
    if not tahun_tersedia:
        return Response({'kosong': True, 'tahun_tersedia': []})

    try:
        tahun = int(request.GET.get('tahun') or tahun_tersedia[-1])
    except ValueError:
        return Response({'detail': 'tahun harus berupa angka'}, status=400)
    if tahun not in tahun_tersedia:
        return Response({'detail': f'Data tahun {tahun} tidak tersedia'}, status=400)

    prov, kab = request.GET.get('prov') or None, request.GET.get('kab') or None
    lingkup_qs = semua.all()
    nama_prov = nama_kab = None
    if prov:
        lingkup_qs = lingkup_qs.filter(kode_prov=prov)
        nama_prov = lingkup_qs.values_list('nama_prov', flat=True).first()
        if not nama_prov:
            return Response({'detail': 'Provinsi tidak ditemukan'}, status=404)
    if kab:
        if prov and not kab.startswith(prov):
            return Response({'detail': 'Kabupaten/kota bukan bagian dari provinsi tersebut'}, status=400)
        lingkup_qs = lingkup_qs.filter(kode_kab=kab)
        nama_kab = lingkup_qs.order_by('-tahun').values_list('nama_kab', flat=True).first()
        if not nama_kab:
            return Response({'detail': 'Kabupaten/kota tidak ditemukan'}, status=404)

    tahun_qs = lingkup_qs.filter(tahun=tahun)
    total_qs = tahun_qs.filter(kelompok=kd.KELOMPOK_TOTAL)
    jenis_qs = tahun_qs.filter(kelompok=kd.KELOMPOK_JENIS)

    kpi = _jumlah(total_qs, *KPI_FIELD)
    kdkmp_rinci, kdkmp = _ringkas_kdkmp(jenis_qs)
    kpi.update({
        'persen_aktif': round(kpi['aktif'] / kpi['koperasi'] * 100, 1) if kpi['koperasi'] else None,
        'kdkmp': kdkmp['koperasi'], 'kdkmp_aktif': kdkmp['aktif'], 'kdkmp_anggota': kdkmp['anggota'],
        'kdkmp_desa': kdkmp_rinci['Desa Merah Putih']['koperasi'],
        'kdkmp_kelurahan': kdkmp_rinci['Kelurahan Merah Putih']['koperasi'],
        'reguler': kpi['koperasi'] - kdkmp['koperasi'], 'reguler_aktif': kpi['aktif'] - kdkmp['aktif'],
        'reguler_anggota': kpi['anggota'] - kdkmp['anggota'],
        'persen_kdkmp': round(kdkmp['koperasi'] / kpi['koperasi'] * 100, 1) if kpi['koperasi'] else None,
    })
    for f in ('modal_sendiri', 'modal_luar', 'aset', 'volume_usaha', 'shu'):
        kpi[f] = _bulat(kpi[f])

    # Tren seluruh tahun pada lingkup yang sama.
    tren_total = {r['tahun']: r for r in lingkup_qs.filter(kelompok=kd.KELOMPOK_TOTAL).values('tahun')
                  .annotate(koperasi=Sum('koperasi'), aktif=Sum('aktif'), anggota=Sum('anggota'))}
    tren_kdkmp = {r['tahun']: r for r in lingkup_qs.filter(kelompok=kd.KELOMPOK_JENIS, detail__in=kd.DETAIL_KDKMP)
                  .values('tahun').annotate(koperasi=Sum('koperasi'), aktif=Sum('aktif'))}
    tren = []
    for t in tahun_tersedia:
        total, k = tren_total.get(t, {}), tren_kdkmp.get(t, {})
        koperasi, kd_n = total.get('koperasi') or 0, k.get('koperasi') or 0
        aktif, kd_aktif = total.get('aktif') or 0, k.get('aktif') or 0
        tren.append({'tahun': t, 'koperasi': koperasi, 'aktif': aktif, 'kdkmp': kd_n, 'reguler': koperasi - kd_n,
                     'kdkmp_aktif': kd_aktif, 'reguler_aktif': aktif - kd_aktif, 'anggota': total.get('anggota') or 0})

    jenis = [{**j, 'kdkmp': j['nama'] in kd.DETAIL_KDKMP} for j in _per_detail(tahun_qs, kd.KELOMPOK_JENIS)]
    kelompok = _per_detail(tahun_qs, kd.KELOMPOK_KELOMPOK)

    # Tabel wilayah: nasional -> per provinsi; provinsi/kabupaten -> kabupaten/kota dalam provinsi.
    if prov:
        tingkat, kunci, nama_field = 'kabupaten', 'kode_kab', 'nama_kab'
        dasar = semua.filter(kode_prov=prov, tahun=tahun)
    else:
        tingkat, kunci, nama_field = 'provinsi', 'kode_prov', 'nama_prov'
        dasar = semua.filter(tahun=tahun)
    nama_map = {r[kunci]: r[nama_field] for r in
                (semua.filter(kode_prov=prov) if prov else semua).order_by('tahun').values(kunci, nama_field).distinct()}
    wil_total = {r[kunci]: r for r in dasar.filter(kelompok=kd.KELOMPOK_TOTAL).values(kunci)
                 .annotate(koperasi=Sum('koperasi'), aktif=Sum('aktif'), anggota=Sum('anggota'))}
    wil_kd = {r[kunci]: r for r in dasar.filter(kelompok=kd.KELOMPOK_JENIS, detail__in=kd.DETAIL_KDKMP).values(kunci)
              .annotate(koperasi=Sum('koperasi'))}
    wilayah = []
    for kode, r in wil_total.items():
        koperasi = r['koperasi'] or 0
        kd_n = (wil_kd.get(kode) or {}).get('koperasi') or 0
        wilayah.append({'kode': kode, 'nama': nama_map.get(kode, kode), 'koperasi': koperasi, 'aktif': r['aktif'] or 0,
                        'kdkmp': kd_n, 'reguler': koperasi - kd_n, 'anggota': r['anggota'] or 0,
                        'persen_kdkmp': round(kd_n / koperasi * 100, 1) if koperasi else None})
    wilayah.sort(key=lambda w: (-w['koperasi'], w['nama']))

    opsi_prov = [{'kode': r['kode_prov'], 'nama': r['nama_prov']}
                 for r in semua.order_by('kode_prov').values('kode_prov', 'nama_prov').distinct()]
    opsi_prov = list({o['kode']: o for o in opsi_prov}.values())      # satu nama per kode (ejaan terakhir)
    opsi_kab = [{'kode': k, 'nama': n} for k, n in sorted(nama_map.items(), key=lambda x: x[1])] if prov else []

    return Response({
        'tahun': tahun, 'tahun_tersedia': tahun_tersedia,
        'lingkup': {'tingkat': 'kabupaten' if kab else ('provinsi' if prov else 'nasional'),
                    'prov': {'kode': prov, 'nama': nama_prov} if prov else None,
                    'kab': {'kode': kab, 'nama': nama_kab} if kab else None},
        'kpi': kpi, 'tren': tren, 'jenis': jenis,
        'bentuk': _per_detail(tahun_qs, kd.KELOMPOK_BENTUK),
        'sektor': _per_detail(tahun_qs, kd.KELOMPOK_SEKTOR),
        'kelompok': kelompok[:TOP_KELOMPOK], 'kelompok_lainnya': sum(k['koperasi'] for k in kelompok[TOP_KELOMPOK:]),
        'wilayah': {'tingkat': tingkat, 'baris': wilayah},
        'opsi': {'provinsi': opsi_prov, 'kabupaten': opsi_kab},
    })
