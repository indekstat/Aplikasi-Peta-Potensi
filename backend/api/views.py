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
    permission_classes = [AllowAny]

class SubsectorViewSet(viewsets.ModelViewSet):
    queryset = Subsector.objects.all()
    serializer_class = SubsectorSerializer
    permission_classes = [AllowAny]

class CommodityViewSet(viewsets.ModelViewSet):
    queryset = Commodity.objects.all()
    serializer_class = CommoditySerializer
    permission_classes = [AllowAny]

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

    all_prods = ProductionData.objects.filter(year=year).select_related('district', 'subdistrict', 'subdistrict__district', 'commodity')
    
    kab_prod = {}       # (district_id -> commodity_id -> value)
    kab_total = {}      # (district_id -> total_value)
    kec_prod = {}       # (subdistrict_id -> commodity_id -> value)
    kec_total = {}      # (subdistrict_id -> total_value)
    kec_info = {}       # (subdistrict_id -> subdistrict)
    com_info = {}       # (commodity_id -> commodity)
    
    for p in all_prods:
        com_info[p.commodity_id] = p.commodity
        if p.subdistrict_id is None:
            if p.district_id:
                if p.district_id not in kab_prod:
                    kab_prod[p.district_id] = {}
                kab_prod[p.district_id][p.commodity_id] = p.value
                kab_total[p.district_id] = kab_total.get(p.district_id, 0.0) + p.value
        else:
            if p.subdistrict_id not in kec_prod:
                kec_prod[p.subdistrict_id] = {}
            kec_prod[p.subdistrict_id][p.commodity_id] = p.value
            kec_total[p.subdistrict_id] = kec_total.get(p.subdistrict_id, 0.0) + p.value
            kec_info[p.subdistrict_id] = p.subdistrict

    lq_prod = []
    for subdist_id, commodities in kec_prod.items():
        subdist = kec_info[subdist_id]
        dist_id = subdist.district_id
        
        x_j = kec_total.get(subdist_id, 0.0)
        y = kab_total.get(dist_id, 0.0)
        
        # Fallback if no district level input exists for this district
        if y == 0.0:
            fallback_kab_prod = {}
            fallback_kab_total = 0.0
            for s_id, s_obj in kec_info.items():
                if s_obj.district_id == dist_id:
                    s_total = kec_total.get(s_id, 0.0)
                    fallback_kab_total += s_total
                    for c_id, val in kec_prod.get(s_id, {}).items():
                        fallback_kab_prod[c_id] = fallback_kab_prod.get(c_id, 0.0) + val
            ref_prod_map = fallback_kab_prod
            y = fallback_kab_total
        else:
            ref_prod_map = kab_prod.get(dist_id, {})
            
        if x_j > 0.0 and y > 0.0:
            for com_id, x_ij in commodities.items():
                y_i = ref_prod_map.get(com_id, 0.0)
                if y_i > 0.0:
                    lq = (x_ij / x_j) / (y_i / y)
                    com = com_info[com_id]
                    lq_prod.append({
                        'kecamatan': subdist.name,
                        'kabupaten': subdist.district.name if subdist.district else '',
                        'lat': subdist.lat,
                        'lon': subdist.lon,
                        'komoditas': com.name,
                        'icon': com.icon,
                        'lq': round(lq, 4),
                        'is_unggulan': lq >= 1
                    })

    return Response({
        'lq_pdrb': lq_pdrb,
        'lq_prod': lq_prod
    })
