from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData
from .serializers import (
    ProvinceSerializer, DistrictSerializer, SubDistrictSerializer, SubsectorSerializer, CommoditySerializer,
    PdrbDataSerializer, ProductionDataSerializer
)
from rest_framework.exceptions import ValidationError

class ProvinceViewSet(viewsets.ModelViewSet):
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer
    permission_classes = [AllowAny]

class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]

class SubDistrictViewSet(viewsets.ModelViewSet):
    queryset = SubDistrict.objects.all()
    serializer_class = SubDistrictSerializer

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
    year = request.GET.get('year')
    if not year:
        year = 2024
    year = int(year)

    # --- 1. LQ PDRB (Sektor) ---
    # LQ Sektor i di Kab J = (PDRB Sektor i di Kab J / Total PDRB di Kab J) / (PDRB Sektor i di Provinsi / Total PDRB Provinsi)

    # Ambil semua data PDRB Kabupaten di tahun tsb (hanya yg punya district)
    all_kab_pdrbs = PdrbData.objects.filter(year=year, district__isnull=False).select_related('district', 'subsector')
    
    kab_pdrb_totals = {}       # Total PDRB per Kabupaten
    prov_pdrb_sektor = {}      # Total PDRB per Sektor di tingkat Provinsi
    total_prov_pdrb = 0        # Total seluruh PDRB Provinsi
    kab_pdrb_items = {}
    
    for p in all_kab_pdrbs:
        kab_id = p.district_id
        sec_id = p.subsector_id
        val = p.value
        
        # Populate kab_pdrb_items
        if kab_id not in kab_pdrb_items:
            kab_pdrb_items[kab_id] = []
        kab_pdrb_items[kab_id].append(p)
        
        # Kab Total
        kab_pdrb_totals[kab_id] = kab_pdrb_totals.get(kab_id, 0) + val
        
        # Prov Sektor Total
        prov_pdrb_sektor[sec_id] = prov_pdrb_sektor.get(sec_id, 0) + val
        
        # Prov Grand Total
        total_prov_pdrb += val

    lq_pdrb = []
    for kab_id, items in kab_pdrb_items.items():
        total_kab_pdrb = kab_pdrb_totals.get(kab_id, 0)
        if total_kab_pdrb > 0 and total_prov_pdrb > 0:
            for p in items:
                prov_val = prov_pdrb_sektor.get(p.subsector_id, 0)
                if prov_val > 0:
                    lq = (p.value / total_kab_pdrb) / (prov_val / total_prov_pdrb)
                    lq_pdrb.append({
                        'kabupaten': p.district.name,
                        'sektor': p.subsector.name,
                        'icon': p.subsector.icon,
                        'lq': round(lq, 4),
                        'is_unggulan': lq >= 1
                    })

    # --- 2. LQ Produksi (Komoditas) ---
    # LQ Komoditas i di Kec J = (Prod Komoditas i di Kec J / Total Prod di Kec J) / (Prod Komoditas i di Kab / Total Prod Kab)

    all_kec_prods = ProductionData.objects.filter(year=year, subdistrict__isnull=False).select_related('subdistrict', 'subdistrict__district', 'commodity')
    
    kec_prod_totals = {}       # Total Prod per Kecamatan
    kab_prod_komoditas = {}    # Total Prod per Komoditas di tingkat Kabupaten (kab_id -> com_id -> val)
    kab_prod_totals = {}       # Total seluruh Prod per Kabupaten
    kec_prod_items = {}
    
    for p in all_kec_prods:
        kec_id = p.subdistrict_id
        kab_id = p.subdistrict.district_id
        com_id = p.commodity_id
        val = p.value
        
        if kec_id not in kec_prod_items:
            kec_prod_items[kec_id] = []
        kec_prod_items[kec_id].append(p)
        
        # Kec Total
        kec_prod_totals[kec_id] = kec_prod_totals.get(kec_id, 0) + val
        
        # Kab Komoditas Total
        if kab_id not in kab_prod_komoditas:
            kab_prod_komoditas[kab_id] = {}
        kab_prod_komoditas[kab_id][com_id] = kab_prod_komoditas[kab_id].get(com_id, 0) + val
        
        # Kab Grand Total
        kab_prod_totals[kab_id] = kab_prod_totals.get(kab_id, 0) + val

    lq_prod = []
    for kec_id, items in kec_prod_items.items():
        total_kec_prod = kec_prod_totals.get(kec_id, 0)
        if items and total_kec_prod > 0:
            kab_id = items[0].subdistrict.district_id
            total_kab_prod = kab_prod_totals.get(kab_id, 0)
            
            if total_kab_prod > 0:
                for p in items:
                    kab_val = kab_prod_komoditas.get(kab_id, {}).get(p.commodity_id, 0)
                    if kab_val > 0:
                        lq = (p.value / total_kec_prod) / (kab_val / total_kab_prod)
                        lq_prod.append({
                            'kecamatan': p.subdistrict.name,
                            'kabupaten': p.subdistrict.district.name,
                            'lat': p.subdistrict.lat,
                            'lon': p.subdistrict.lon,
                            'komoditas': p.commodity.name,
                            'icon': p.commodity.icon,
                            'lq': round(lq, 4),
                            'is_unggulan': lq >= 1
                        })

    return Response({
        'lq_pdrb': lq_pdrb,
        'lq_prod': lq_prod
    })
