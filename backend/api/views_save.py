from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import District, SubDistrict, PdrbData, ProductionData, Subsector, Commodity, UserActivity

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
        dist, _ = District.objects.get_or_create(name=kab_name, defaults={'lat': 0, 'lon': 0})
        
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
        
        # Log activity
        if saved_count > 0:
            UserActivity.objects.create(
                user=request.user,
                action=f"Menyimpan {saved_count} data PDRB untuk {kab_name}",
                ip_address=get_client_ip(request)
            )
            
        return Response({'status': 'success', 'message': f'{saved_count} data PDRB berhasil disimpan'})
        
    elif data_type == 'production':
        # ... (keep existing production logic) ...
        kec_name = request.data.get('kec_name')
        dist, _ = District.objects.get_or_create(name=kab_name, defaults={'lat': 0, 'lon': 0})
        subdist, _ = SubDistrict.objects.get_or_create(name=kec_name, district=dist, defaults={'lat': 0, 'lon': 0})
        
        for com_id_str, val_str in data.items():
            if val_str:
                try:
                    val = float(val_str)
                    com = Commodity.objects.get(id=int(com_id_str))
                    obj, created = ProductionData.objects.get_or_create(year=int(request.data.get('year', 2024)), subdistrict=subdist, commodity=com)
                    obj.value = val
                    obj.save()
                except (ValueError, Commodity.DoesNotExist):
                    pass
                    
        return Response({'status': 'success', 'message': 'Production Data saved successfully'})
        
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
