import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import District, SubDistrict, PdrbData, ProductionData, Subsector, Commodity

@api_view(['POST'])
def save_data(request):
    data_type = request.data.get('type')
    year = int(request.data.get('year', 2024))
    kab_name = request.data.get('kab_name')
    data = request.data.get('data', {})
    
    if data_type == 'pdrb':
        dist, _ = District.objects.get_or_create(name=kab_name, defaults={'lat': 0, 'lon': 0})
        
        for sec_id_str, val_str in data.items():
            if val_str:
                try:
                    val = float(val_str)
                    sec = Subsector.objects.get(id=int(sec_id_str))
                    obj, created = PdrbData.objects.get_or_create(year=year, district=dist, subsector=sec)
                    obj.value = val
                    obj.save()
                except (ValueError, Subsector.DoesNotExist):
                    pass
                    
        return Response({'status': 'success', 'message': 'PDRB Data saved successfully'})
        
    elif data_type == 'production':
        kec_name = request.data.get('kec_name')
        dist, _ = District.objects.get_or_create(name=kab_name, defaults={'lat': 0, 'lon': 0})
        subdist, _ = SubDistrict.objects.get_or_create(name=kec_name, district=dist, defaults={'lat': 0, 'lon': 0})
        
        for com_id_str, val_str in data.items():
            if val_str:
                try:
                    val = float(val_str)
                    com = Commodity.objects.get(id=int(com_id_str))
                    obj, created = ProductionData.objects.get_or_create(year=year, subdistrict=subdist, commodity=com)
                    obj.value = val
                    obj.save()
                except (ValueError, Commodity.DoesNotExist):
                    pass
                    
        return Response({'status': 'success', 'message': 'Production Data saved successfully'})
        
    return Response({'status': 'error', 'message': 'Invalid type'}, status=400)
