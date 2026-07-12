from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum
from .models import District, Subsector, Commodity, PdrbData, ProductionData
from .serializers import (
    DistrictSerializer, SubsectorSerializer, CommoditySerializer,
    PdrbDataSerializer, ProductionDataSerializer
)

class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer

class SubsectorViewSet(viewsets.ModelViewSet):
    queryset = Subsector.objects.all()
    serializer_class = SubsectorSerializer

class CommodityViewSet(viewsets.ModelViewSet):
    queryset = Commodity.objects.all()
    serializer_class = CommoditySerializer

class PdrbDataViewSet(viewsets.ModelViewSet):
    queryset = PdrbData.objects.all()
    serializer_class = PdrbDataSerializer

class ProductionDataViewSet(viewsets.ModelViewSet):
    queryset = ProductionData.objects.all()
    serializer_class = ProductionDataSerializer

@api_view(['GET'])
def get_lq_analysis(request):
    # 1. Ambil data Provinsi (district = null) dan masukkan ke Dictionary
    prov_pdrbs = PdrbData.objects.filter(district__isnull=True).select_related('subsector')
    prov_pdrb_dict = {p.subsector_id: p.value for p in prov_pdrbs}
    total_prov_pdrb = sum(prov_pdrb_dict.values())
    
    prov_prods = ProductionData.objects.filter(district__isnull=True).select_related('commodity')
    prov_prod_dict = {p.commodity_id: p.value for p in prov_prods}
    total_prov_prod = sum(prov_prod_dict.values())

    # 2. Ambil SEMUA data Kabupaten sekaligus dalam 1 query untuk menghindari N+1 problem
    all_kab_pdrbs = PdrbData.objects.filter(district__isnull=False).select_related('district', 'subsector')
    kab_pdrb_items = {}
    kab_pdrb_totals = {}
    
    for p in all_kab_pdrbs:
        kab_id = p.district_id
        if kab_id not in kab_pdrb_items:
            kab_pdrb_items[kab_id] = []
            kab_pdrb_totals[kab_id] = 0
        kab_pdrb_items[kab_id].append(p)
        kab_pdrb_totals[kab_id] += p.value

    all_kab_prods = ProductionData.objects.filter(district__isnull=False).select_related('district', 'commodity')
    kab_prod_items = {}
    kab_prod_totals = {}
    
    for p in all_kab_prods:
        kab_id = p.district_id
        if kab_id not in kab_prod_items:
            kab_prod_items[kab_id] = []
            kab_prod_totals[kab_id] = 0
        kab_prod_items[kab_id].append(p)
        kab_prod_totals[kab_id] += p.value

    # 3. Kalkulasi LQ di Memory (Super Cepat)
    lq_pdrb = []
    for kab_id, items in kab_pdrb_items.items():
        total_kab_pdrb = kab_pdrb_totals[kab_id]
        if total_kab_pdrb > 0 and total_prov_pdrb > 0:
            for p in items:
                prov_val = prov_pdrb_dict.get(p.subsector_id, 0)
                if prov_val > 0:
                    lq = (p.value / total_kab_pdrb) / (prov_val / total_prov_pdrb)
                    if lq > 1:
                        lq_pdrb.append({
                            'kabupaten': p.district.name,
                            'sektor': p.subsector.name,
                            'lq': round(lq, 4)
                        })

    lq_prod = []
    for kab_id, items in kab_prod_items.items():
        total_kab_prod = kab_prod_totals[kab_id]
        if total_kab_prod > 0 and total_prov_prod > 0:
            for p in items:
                prov_val = prov_prod_dict.get(p.commodity_id, 0)
                if prov_val > 0:
                    lq = (p.value / total_kab_prod) / (prov_val / total_prov_prod)
                    if lq > 1:
                        lq_prod.append({
                            'kabupaten': p.district.name,
                            'komoditas': p.commodity.name,
                            'lq': round(lq, 4)
                        })

    return Response({
        'lq_pdrb': lq_pdrb,
        'lq_prod': lq_prod
    })
