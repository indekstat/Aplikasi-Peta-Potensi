from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import District, SubDistrict, PdrbData, ProductionData, Subsector, Commodity, UserActivity

def _norm(text):
    return " ".join(str(text or "").split()).casefold()


def _wilayah_penulisan(request, kab_name, prov_name=None):
    """Kabupaten yang boleh ditulis oleh akun ini: (district, None) atau (None, respons_error).

    Superuser boleh kabupaten mana pun yang sudah ada. User daerah hanya boleh menulis kabupaten asal akunnya (dan provinsinya),
    dan kabupaten itu harus sudah ada; data wilayah tidak dibuat dari input user."""
    if not kab_name:
        return None, Response({'status': 'error', 'message': 'kab_name is required'}, status=400)
    user = request.user
    if user.is_superuser:
        # Tidak membuat kabupaten dari input: District.province wajib, jadi dulu ini berakhir 500.
        qs = District.objects.filter(name=kab_name)
        if prov_name and qs.filter(province__name__iexact=prov_name).exists():
            qs = qs.filter(province__name__iexact=prov_name)
        if qs.count() > 1:
            return None, Response(
                {'status': 'error', 'message': 'Nama kabupaten ada di lebih dari satu provinsi; sertakan prov_name'},
                status=400,
            )
        dist = qs.first()
        if not dist:
            return None, Response({'status': 'error', 'message': 'Kabupaten tidak ditemukan'}, status=404)
        return dist, None

    profile = getattr(user, 'profile', None)
    if not profile or not profile.asal_kokab or not profile.asal_provinsi:
        return None, Response({'status': 'error', 'message': 'Akun belum memiliki wilayah asal'}, status=403)
    if _norm(kab_name) != _norm(profile.asal_kokab) or (prov_name and _norm(prov_name) != _norm(profile.asal_provinsi)):
        return None, Response(
            {'status': 'error', 'message': 'Anda hanya dapat menyimpan data untuk wilayah asal akun'}, status=403
        )
    dist = District.objects.filter(
        name__iexact=profile.asal_kokab, province__name__iexact=profile.asal_provinsi
    ).first()
    if not dist:
        return None, Response({'status': 'error', 'message': 'Kabupaten asal akun tidak ditemukan'}, status=404)
    return dist, None


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_data(request):
    data_type = request.data.get('type')
    kab_name = request.data.get('kab_name')
    data = request.data.get('data', {})
    
    if data_type == 'pdrb':
        prov_name = request.data.get('prov_name')
        dist, error = _wilayah_penulisan(request, kab_name, prov_name)
        if error:
            return error
        prov_data = request.data.get('prov_data', {})
        
        # data format: { "2024": { "A PERTANIAN": 100 }, "2023": ... }
        saved_count = 0
        for year_str, sector_data in data.items():
            if not isinstance(sector_data, dict):
                continue
                
            try:
                year = int(year_str)
            except ValueError:
                continue
                
            for sec_name, val_str in sector_data.items():
                if val_str is not None and val_str != "":
                    try:
                        val = float(val_str)
                        sec, _ = Subsector.objects.get_or_create(name=sec_name)
                        obj, created = PdrbData.objects.get_or_create(year=year, district=dist, subsector=sec)
                        obj.value = val
                        obj.save()
                        saved_count += 1
                    except ValueError:
                        pass
        
        # Save Prov data if provided
        if prov_name and prov_data:
            from .models import Province
            if request.user.is_superuser:
                prov_obj, _ = Province.objects.get_or_create(name=prov_name)
            else:
                prov_obj = dist.province  # sudah dicocokkan dengan provinsi asal akun
            for year_str, sector_list in prov_data.items():
                try:
                    year = int(year_str)
                except ValueError:
                    continue
                for item in sector_list:
                    sec_name = item.get('label')
                    val = item.get('value')
                    if sec_name and val is not None:
                        sec, _ = Subsector.objects.get_or_create(name=sec_name)
                        obj, created = PdrbData.objects.get_or_create(year=year, province=prov_obj, district=None, subsector=sec)
                        obj.value = float(val)
                        obj.save()
        
        # Log activity
        if saved_count > 0:
            UserActivity.objects.create(
                user=request.user,
                action=f"Menyimpan {saved_count} data PDRB untuk {kab_name}",
                ip_address=get_client_ip(request)
            )
            
        return Response({'status': 'success', 'message': f'{saved_count} data PDRB berhasil disimpan'})
        
    elif data_type == 'production':
        kec_name = request.data.get('kec_name')
        try:
            year = int(request.data.get('year', 2024))
        except (TypeError, ValueError):
            return Response({'status': 'error', 'message': 'Invalid year'}, status=400)
        dist, error = _wilayah_penulisan(request, kab_name)
        if error:
            return error
        
        saved_count = 0
        if kec_name:
            subdist, _ = SubDistrict.objects.get_or_create(name=kec_name, district=dist, defaults={'lat': 0, 'lon': 0})
            for com_id_str, val_str in data.items():
                if val_str is not None and val_str != "":
                    try:
                        val = float(val_str)
                        com = Commodity.objects.get(id=int(com_id_str))
                        obj, created = ProductionData.objects.get_or_create(
                            year=year,
                            district=dist,
                            subdistrict=subdist,
                            commodity=com
                        )
                        obj.value = val
                        obj.save()
                        saved_count += 1
                    except (ValueError, Commodity.DoesNotExist):
                        pass
            
            if saved_count > 0:
                UserActivity.objects.create(
                    user=request.user,
                    action=f"Menyimpan {saved_count} data produksi komoditas Kecamatan {kec_name} ({kab_name})",
                    ip_address=get_client_ip(request)
                )
            return Response({'status': 'success', 'message': f'{saved_count} data produksi Kecamatan berhasil disimpan'})
        else:
            for com_id_str, val_str in data.items():
                if val_str is not None and val_str != "":
                    try:
                        val = float(val_str)
                        com = Commodity.objects.get(id=int(com_id_str))
                        obj, created = ProductionData.objects.get_or_create(
                            year=year,
                            district=dist,
                            subdistrict=None,
                            commodity=com
                        )
                        obj.value = val
                        obj.save()
                        saved_count += 1
                    except (ValueError, Commodity.DoesNotExist):
                        pass
            
            if saved_count > 0:
                UserActivity.objects.create(
                    user=request.user,
                    action=f"Menyimpan {saved_count} data produksi komoditas Kabupaten {kab_name}",
                    ip_address=get_client_ip(request)
                )
            return Response({'status': 'success', 'message': f'{saved_count} data produksi Kabupaten berhasil disimpan'})
        
    return Response({'status': 'error', 'message': 'Invalid type'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pdrb_by_kab(request):
    kab_name = request.GET.get('kab_name')
    if not kab_name:
        return Response({'status': 'error', 'message': 'kab_name is required'}, status=400)
    
    qs = PdrbData.objects.filter(district__name=kab_name).select_related('subsector')
    
    # Return in format { year: { sector_name: value } }
    data = {}
    total_data = {}
    
    for item in qs:
        y_str = str(item.year)
        sec_name = item.subsector.name
        val = item.value
        
        if y_str not in data:
            data[y_str] = {}
        data[y_str][sec_name] = val
        
        total_data[y_str] = total_data.get(y_str, 0) + val
        
    return Response({
        'status': 'success',
        'kokabData': data,
        'totalKokab': total_data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_production_data(request):
    kab_name = request.GET.get('kab_name')
    year = request.GET.get('year')
    kec_name = request.GET.get('kec_name')
    
    if not kab_name or not year:
        return Response({'status': 'error', 'message': 'kab_name and year are required'}, status=400)
        
    try:
        year_int = int(year)
    except ValueError:
        return Response({'status': 'error', 'message': 'Invalid year'}, status=400)
        
    dist = District.objects.filter(name=kab_name).first()
    if not dist:
        return Response({'data': {}})
        
    if kec_name:
        subdist = SubDistrict.objects.filter(name=kec_name, district=dist).first()
        if not subdist:
            return Response({'data': {}})
        prods = ProductionData.objects.filter(year=year_int, district=dist, subdistrict=subdist)
    else:
        prods = ProductionData.objects.filter(year=year_int, district=dist, subdistrict=None)
        
    res_data = {p.commodity_id: p.value for p in prods}
    return Response({'data': res_data})
