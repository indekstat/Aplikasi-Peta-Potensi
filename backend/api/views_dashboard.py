from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData
from django.db.models import Sum

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
            "message": "Provinsi tidak ditemukan"
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
    message = None
    
    if kab_name:
        try:
            district = District.objects.get(name__iexact=kab_name, province=province)
            
            # Fetch all available years for this district
            available_years = list(PdrbData.objects.filter(district=district).values_list('year', flat=True).distinct().order_by('year'))
            
            # Filter PdrbData for this district based on selected years
            query_kwargs = {'district': district}
            if start_year:
                query_kwargs['year__gte'] = int(start_year)
            if end_year:
                query_kwargs['year__lte'] = int(end_year)
                
            kab_pdrb = PdrbData.objects.filter(**query_kwargs).select_related('subsector')
            
            # Group by year
            kab_by_year = {}
            for p in kab_pdrb:
                if p.year not in kab_by_year:
                    kab_by_year[p.year] = {}
                kab_by_year[p.year][p.subsector.name] = p.value
                
            years = sorted(list(kab_by_year.keys()))
            
            if len(years) > 0:
                # Fetch Prov data for those years
                prov_pdrb = PdrbData.objects.filter(province=province, district__isnull=True, year__in=years).select_related('subsector')
                prov_by_year = {}
                for p in prov_pdrb:
                    if p.year not in prov_by_year:
                        prov_by_year[p.year] = {}
                    prov_by_year[p.year][p.subsector.name] = p.value
                
                latest_year = years[-1]
                
                # Get sectors present in the latest year, sorted alphabetically
                sectors = sorted(list(kab_by_year[latest_year].keys()))
                
                for sector in sectors:
                    # Only Level 1 sectors? The Excel has specific Level 1 sectors.
                    # We will calculate for all provided. 
                    # If total is not provided, we sum it up.
                    pass
                    
                # To simplify and ensure accurate calculations based on the Excel, we calculate LQ, SSA, Klassen for Level 1 sectors.
                # Find the Total PDRB
                total_key = next((k for k in sectors if "produk domestik bruto" in k.lower()), None)
                
                # We need to process each sector
                for sec_name in sectors:
                    if "produk domestik bruto" in sec_name.lower():
                        continue
                        
                # Precompute total PDRB values for each year to get average LQ
                kab_totals = {}
                prov_totals = {}
                for y in years:
                    kab_totals[y] = kab_by_year[y].get(total_key, sum([v for k, v in kab_by_year[y].items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in kab_by_year[y].items() if "produk domestik" not in k.lower()])
                    prov_totals[y] = prov_by_year.get(y, {}).get(total_key, sum([v for k, v in prov_by_year.get(y, {}).items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in prov_by_year.get(y, {}).items() if "produk domestik" not in k.lower()])

                # We need to process each sector
                for sec_name in sectors:
                    if "produk domestik bruto" in sec_name.lower():
                        continue
                        
                    # Calculate Average LQ over the years
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
                        
                    # Calculate SSA and Klassen if len(years) > 1
                    ssa = 0
                    kuadran = 0
                    
                    if len(years) > 1:
                        # Base and latest values
                        earliest_year = years[0]
                        latest_year = years[-1]
                        
                        val0_kab = kab_by_year[earliest_year].get(sec_name, 0)
                        val1_kab = kab_by_year[latest_year].get(sec_name, 0)
                        
                        val0_prov = prov_by_year.get(earliest_year, {}).get(sec_name, 0)
                        val1_prov = prov_by_year.get(latest_year, {}).get(sec_name, 0)
                        
                        t0_prov = prov_totals[earliest_year]
                        t1_prov = prov_totals[latest_year]
                        
                        # Total growth rate from t0 to t
                        ri = (val1_kab - val0_kab) / val0_kab if val0_kab > 0 else 0
                        Ri = (val1_prov - val0_prov) / val0_prov if val0_prov > 0 else 0
                        Rn = (t1_prov - t0_prov) / t0_prov if t0_prov > 0 else 0
                        
                        # Cij = Yij_t0 * (ri - Rn) -> Differential Shift (Competitive Shift) as defined in the Excel
                        Cij = val0_kab * (ri - Rn)
                        
                        ssa = Cij
                        
                        # Quadrant classification based on Average LQ and Cij (SSA)
                        # Kuadran I: LQ >= 1 & Cij > 0 (Maju & Tumbuh Cepat)
                        # Kuadran II: LQ >= 1 & Cij <= 0 (Maju tapi Tertekan) -> Frontend Kuadran 2
                        # Kuadran III: LQ < 1 & Cij > 0 (Potensial / Berkembang) -> Frontend Kuadran 3
                        # Kuadran IV: LQ < 1 & Cij <= 0 (Relatif Tertinggal) -> Frontend Kuadran 4
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
                message = "Data PDRB < 2 tahun. SSA & Klassen Tipology tidak dihitung."

        except District.DoesNotExist:
            message = "Kabupaten tidak ditemukan."
    else:
        message = "Silakan pilih Kabupaten/Kota untuk melihat Analisis LQ & Klassen."
        
    # Update stats based on actual calculation
    unggulan_count = len([x for x in lq_summary if x['lq'] >= 1])
    prioritas_count = klassen[0] + klassen[1] # Kuadran 1 & 2
    
    stats["sektor"] = unggulan_count if kab_name else 0
    stats["subsektor"] = prioritas_count if kab_name else 0
    stats["komoditas"] = 0 # Placeholder for actual commodity LQ
    
    top_komoditas = []

    return Response({
        "stats": stats,
        "lq_summary": lq_summary,
        "klassen": klassen,
        "top_komoditas": top_komoditas,
        "message": message,
        "available_years": available_years
    })
