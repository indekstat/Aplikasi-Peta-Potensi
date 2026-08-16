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
                
                # Get sectors present in the latest year
                sectors = kab_by_year[latest_year].keys()
                
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
                        
                    # Calculate LQ for latest year
                    kab_val = kab_by_year[latest_year].get(sec_name, 0)
                    prov_val = prov_by_year.get(latest_year, {}).get(sec_name, 0)
                    
                    kab_tot = kab_by_year[latest_year].get(total_key, sum([v for k, v in kab_by_year[latest_year].items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in kab_by_year[latest_year].items() if "produk domestik" not in k.lower()])
                    prov_tot = prov_by_year.get(latest_year, {}).get(total_key, sum([v for k, v in prov_by_year.get(latest_year, {}).items() if "produk domestik" not in k.lower()])) if total_key else sum([v for k, v in prov_by_year.get(latest_year, {}).items() if "produk domestik" not in k.lower()])
                    
                    if kab_tot > 0 and prov_tot > 0 and prov_val > 0:
                        lq = (kab_val / kab_tot) / (prov_val / prov_tot)
                    else:
                        lq = 0
                        
                    # Calculate SSA and Klassen if len(years) > 1
                    ssa = 0
                    kuadran = 0
                    
                    if len(years) > 1:
                        # Average growth rate
                        rn_kab = []
                        rn_prov = []
                        for i in range(1, len(years)):
                            y0 = years[i-1]
                            y1 = years[i]
                            
                            val0_kab = kab_by_year[y0].get(sec_name, 0)
                            val1_kab = kab_by_year[y1].get(sec_name, 0)
                            if val0_kab > 0:
                                rn_kab.append((val1_kab - val0_kab) / val0_kab)
                                
                            val0_prov = prov_by_year.get(y0, {}).get(sec_name, 0)
                            val1_prov = prov_by_year.get(y1, {}).get(sec_name, 0)
                            if val0_prov > 0:
                                rn_prov.append((val1_prov - val0_prov) / val0_prov)
                                
                        ri = sum(rn_kab) / len(rn_kab) if rn_kab else 0
                        Ri = sum(rn_prov) / len(rn_prov) if rn_prov else 0
                        
                        si = kab_val / kab_tot if kab_tot > 0 else 0
                        Si = prov_val / prov_tot if prov_tot > 0 else 0
                        
                        # SSA: IMij (Proportional Shift) -> I5*(S5-$S$22)
                        # Where S22 = Average growth of Prov total
                        Rn_list = []
                        for i in range(1, len(years)):
                            y0 = years[i-1]
                            y1 = years[i]
                            t0_prov = prov_by_year.get(y0, {}).get(total_key, 0) if total_key else sum([v for k, v in prov_by_year.get(y0, {}).items() if "produk domestik" not in k.lower()])
                            t1_prov = prov_by_year.get(y1, {}).get(total_key, 0) if total_key else sum([v for k, v in prov_by_year.get(y1, {}).items() if "produk domestik" not in k.lower()])
                            if t0_prov > 0:
                                Rn_list.append((t1_prov - t0_prov) / t0_prov)
                        Rn = sum(Rn_list) / len(Rn_list) if Rn_list else 0
                        
                        # Base year value
                        Yij_0 = kab_by_year[years[0]].get(sec_name, 0)
                        NSij = Yij_0 * Rn
                        IMij = Yij_0 * (Ri - Rn)
                        RSij = Yij_0 * (ri - Ri)
                        
                        ssa = NSij + IMij + RSij # Total Shift
                        
                        if ri > Ri and si > Si:
                            kuadran = 1
                            klassen[0] += 1
                        elif ri < Ri and si > Si:
                            kuadran = 2
                            klassen[1] += 1
                        elif ri > Ri and si < Si:
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
