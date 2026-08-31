from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData
from django.db.models import Sum

def calculate_komoditas_unggulan(district, start_year, end_year):
    # Get the latest year from ProductionData for this district if not specified
    qs = ProductionData.objects.filter(district=district)
    if start_year:
        qs = qs.filter(year__gte=int(start_year))
    if end_year:
        qs = qs.filter(year__lte=int(end_year))
        
    latest_year_obj = qs.order_by('-year').first()
    if not latest_year_obj:
        return 0
        
    year = latest_year_obj.year
    
    all_prods = ProductionData.objects.filter(year=year).select_related('district', 'subdistrict', 'commodity')
    
    kab_prod = {}
    kab_total = {}
    kec_prod = {}
    kec_total = {}
    kec_info = {}
    
    for p in all_prods:
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

    unique_unggulan = set()
    for subdist_id, commodities in kec_prod.items():
        subdist = kec_info[subdist_id]
        if subdist.district_id != district.id:
            continue
            
        dist_id = subdist.district_id
        
        x_j = kec_total.get(subdist_id, 0.0)
        y = kab_total.get(dist_id, 0.0)
        
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
                    if lq >= 1:
                        unique_unggulan.add(com_id)

    return len(unique_unggulan)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dashboard_summary(request):
    province_name = request.GET.get('province', 'Jawa Timur')
    kab_name = request.GET.get('kabupaten', None)
    
    start_year = request.GET.get('start_year')
    end_year = request.GET.get('end_year')
    
    try:
        province = Province.objects.get(name__iexact=province_name)
    except Province.DoesNotExist:
        return Response({
            "stats": {"sektor": 0, "subsektor": 0, "komoditas": 0, "kecamatan": 0},
            "lq_summary": [],
            "klassen": [0, 0, 0, 0],
            "top_komoditas": [],
            "province_heatmap": [],
            "message": "Provinsi tidak ditemukan",
            "available_years": []
        })

    districts = District.objects.filter(province=province)
    total_kecamatan = SubDistrict.objects.filter(district__in=districts).count()
    total_komoditas = Commodity.objects.count()
    total_subsektor = Subsector.objects.count()
    total_sektor = 17

    stats = {
        "sektor": total_sektor,
        "subsektor": total_subsektor,
        "komoditas": total_komoditas,
        "kecamatan": total_kecamatan
    }
    
    lq_summary = []
    klassen = [0, 0, 0, 0]
    available_years = []
    province_heatmap = []
    message = None
    
    if kab_name:
        try:
            district = District.objects.get(name__iexact=kab_name, province=province)
            available_years = list(PdrbData.objects.filter(district=district).values_list('year', flat=True).distinct().order_by('year'))
            
            query_kwargs = {'district': district}
            if start_year:
                query_kwargs['year__gte'] = int(start_year)
            if end_year:
                query_kwargs['year__lte'] = int(end_year)
                
            kab_pdrb = PdrbData.objects.filter(**query_kwargs).select_related('subsector')
            
            kab_by_year = {}
            for p in kab_pdrb:
                if p.year not in kab_by_year:
                    kab_by_year[p.year] = {}
                kab_by_year[p.year][p.subsector.name] = p.value
                
            years = sorted(list(kab_by_year.keys()))
            
            if len(years) > 0:
                prov_pdrb = PdrbData.objects.filter(province=province, district__isnull=True, year__in=years).select_related('subsector')
                prov_by_year = {}
                for p in prov_pdrb:
                    if p.year not in prov_by_year:
                        prov_by_year[p.year] = {}
                    prov_by_year[p.year][p.subsector.name] = p.value
                
                latest_year = years[-1]
                sectors = sorted(list(kab_by_year[latest_year].keys()))
                
                total_key = next((k for k in sectors if "produk domestik bruto" in k.lower()), None)
                
                kab_totals = {}
                prov_totals = {}
                for y in years:
                    kab_totals[y] = kab_by_year[y].get(total_key, sum([v for k, v in kab_by_year[y].items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in kab_by_year[y].items() if "produk domestik" not in k.lower()])
                    prov_totals[y] = prov_by_year.get(y, {}).get(total_key, sum([v for k, v in prov_by_year.get(y, {}).items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in prov_by_year.get(y, {}).items() if "produk domestik" not in k.lower()])

                for sec_name in sectors:
                    if "produk domestik bruto" in sec_name.lower():
                        continue
                        
                    lq_list = []
                    for y in years:
                        kab_val_y = kab_by_year[y].get(sec_name, 0)
                        prov_val_y = prov_by_year.get(y, {}).get(sec_name, 0)
                        kab_tot_y = kab_totals[y]
                        prov_tot_y = prov_totals[y]
                        if kab_tot_y > 0 and prov_tot_y > 0 and prov_val_y > 0:
                            lq_y = (kab_val_y / kab_tot_y) / (prov_val_y / prov_tot_y)
                        else:
                            lq_y = 0
                        lq_list.append(lq_y)
                    
                    lq = sum(lq_list) / len(years) if len(years) > 0 else 0
                        
                    ssa = 0
                    kuadran = 0
                    
                    if len(years) > 1:
                        earliest_year = years[0]
                        latest_year = years[-1]
                        
                        val0_kab = kab_by_year[earliest_year].get(sec_name, 0)
                        val1_kab = kab_by_year[latest_year].get(sec_name, 0)
                        
                        val0_prov = prov_by_year.get(earliest_year, {}).get(sec_name, 0)
                        val1_prov = prov_by_year.get(latest_year, {}).get(sec_name, 0)
                        
                        t0_prov = prov_totals[earliest_year]
                        t1_prov = prov_totals[latest_year]
                        
                        ri = (val1_kab - val0_kab) / val0_kab if val0_kab > 0 else 0
                        Ri = (val1_prov - val0_prov) / val0_prov if val0_prov > 0 else 0
                        Rn = (t1_prov - t0_prov) / t0_prov if t0_prov > 0 else 0
                        
                        Cij = val0_kab * (ri - Rn)
                        ssa = Cij
                        
                        if lq >= 1 and Cij > 0:
                            kuadran = 1
                            klassen[0] += 1
                        elif lq >= 1 and Cij <= 0:
                            kuadran = 2
                            klassen[1] += 1
                        elif lq < 1 and Cij > 0:
                            kuadran = 3
                            klassen[2] += 1
                        else:
                            kuadran = 4
                            klassen[3] += 1
                    
                    lq_summary.append({
                        "sektor": sec_name,
                        "lq": round(lq, 2),
                        "ssa": round(ssa, 2) if len(years) > 1 else None,
                        "status": "Basis" if lq >= 1 else "Non-Basis",
                        "kuadran": kuadran if len(years) > 1 else None
                    })
                    
            if len(years) < 2:
                message = "Data PDRB < 2 tahun. SSA & Tipologi Klassen tidak dapat dihitung."

            unggulan_count = len([x for x in lq_summary if x['lq'] >= 1])
            prioritas_count = klassen[0] + klassen[1]
            komoditas_count = calculate_komoditas_unggulan(district, start_year, end_year)
            
            stats["sektor"] = unggulan_count
            stats["subsektor"] = prioritas_count
            stats["komoditas"] = komoditas_count
            
        except District.DoesNotExist:
            message = "Kabupaten tidak ditemukan."
    else:
        # Calculate summary for the entire province
        # province_heatmap: count of unggulan sectors (PDRB) for each district
        available_years = list(PdrbData.objects.filter(province=province).values_list('year', flat=True).distinct().order_by('year'))
        
        message = "Silakan pilih Kabupaten/Kota untuk melihat Analisis LQ & Klassen secara rinci."
        
        # Calculate heatmap (number of basis sectors per district) for the latest available year
        if available_years:
            y = available_years[-1]
            if end_year:
                y = int(end_year)
                
            prov_pdrb = PdrbData.objects.filter(province=province, district__isnull=True, year=y).select_related('subsector')
            prov_by_sec = {p.subsector.name: p.value for p in prov_pdrb}
            
            total_key = next((k for k in prov_by_sec.keys() if "produk domestik bruto" in k.lower()), None)
            prov_total = prov_by_sec.get(total_key, sum([v for k, v in prov_by_sec.items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in prov_by_sec.items() if "produk domestik" not in k.lower()])
            
            kab_pdrbs = PdrbData.objects.filter(province=province, district__isnull=False, year=y).select_related('district', 'subsector')
            
            kab_data = {}
            for p in kab_pdrbs:
                d_name = p.district.name
                if d_name not in kab_data:
                    kab_data[d_name] = {}
                kab_data[d_name][p.subsector.name] = p.value
                
            for d_name, data_sec in kab_data.items():
                kab_tot = data_sec.get(total_key, sum([v for k, v in data_sec.items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in data_sec.items() if "produk domestik" not in k.lower()])
                
                unggulan = 0
                for sec_name, kab_val in data_sec.items():
                    if "produk domestik bruto" in sec_name.lower():
                        continue
                    prov_val = prov_by_sec.get(sec_name, 0)
                    if kab_tot > 0 and prov_total > 0 and prov_val > 0:
                        lq = (kab_val / kab_tot) / (prov_val / prov_total)
                        if lq >= 1:
                            unggulan += 1
                
                province_heatmap.append({
                    "district": d_name,
                    "unggulan_count": unggulan
                })
        
        # Update province stats
        total_sektor_aktif = PdrbData.objects.filter(province=province, district__isnull=True).values('subsector').distinct().count()
        total_komoditas_aktif = ProductionData.objects.filter(district__in=districts).values('commodity').distinct().count()
        
        stats["sektor"] = total_sektor_aktif
        stats["subsektor"] = total_subsektor
        stats["komoditas"] = total_komoditas_aktif
        stats["kecamatan"] = total_kecamatan

    return Response({
        "stats": stats,
        "lq_summary": lq_summary,
        "klassen": klassen,
        "top_komoditas": [],
        "province_heatmap": province_heatmap,
        "message": message,
        "available_years": available_years
    })
