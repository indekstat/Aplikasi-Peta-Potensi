from django.shortcuts import render, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
import urllib.request
import json
from .models import Subsector, Commodity, PdrbData, ProductionData, District, SubDistrict

GEOJSON_URL = 'https://raw.githubusercontent.com/ardian28/GeoJson-Indonesia-38-Provinsi/main/Kabupaten/38%20Provinsi%20Indonesia%20-%20Kabupaten.json'

def get_geojson_regions():
    # Helper to fetch and extract regions from GeoJSON
    req = urllib.request.Request(GEOJSON_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    jatim_features = [f for f in data.get('features', []) if f.get('properties', {}).get('WADMPR', '').lower() == 'jawa timur']
    
    hierarchy = {}
    for f in jatim_features:
        props = f['properties']
        kab = props.get('WADMKK') or props.get('KABKOT') or props.get('KABUPATEN')
        kec = props.get('WADMKC') or props.get('KECAMATAN')
        if kab:
            clean_kab = kab.title()
            if clean_kab not in hierarchy:
                hierarchy[clean_kab] = set()
            if kec:
                hierarchy[clean_kab].add(kec.title())
                
    # Convert sets to sorted lists
    for k in hierarchy:
        hierarchy[k] = sorted(list(hierarchy[k]))
    
    return hierarchy

@staff_member_required
def leveling_data_entry(request):
    if request.method == 'POST':
        # Handle saving data
        data_type = request.POST.get('data_type')
        year = int(request.POST.get('year', 2024))
        region_name = request.POST.get('region_name')
        
        if data_type == 'pdrb':
            # Need to get or create District just to satisfy ForeignKey, but it's hidden from admin UI
            dist, _ = District.objects.get_or_create(name=region_name, defaults={'lat': 0, 'lon': 0})
            subsectors = Subsector.objects.all()
            for sec in subsectors:
                val = request.POST.get(f'sec_{sec.id}')
                if val:
                    try:
                        obj, created = PdrbData.objects.get_or_create(year=year, district=dist, subsector=sec)
                        obj.value = float(val)
                        obj.save()
                    except ValueError:
                        pass
                        
        elif data_type == 'production':
            kab_name = request.POST.get('kab_name')
            dist, _ = District.objects.get_or_create(name=kab_name, defaults={'lat': 0, 'lon': 0})
            subdist, _ = SubDistrict.objects.get_or_create(name=region_name, district=dist, defaults={'lat': 0, 'lon': 0})
            
            commodities = Commodity.objects.all()
            for com in commodities:
                val = request.POST.get(f'com_{com.id}')
                if val:
                    try:
                        obj, created = ProductionData.objects.get_or_create(year=year, subdistrict=subdist, commodity=com)
                        obj.value = float(val)
                        obj.save()
                    except ValueError:
                        pass
                        
        return redirect(f"{request.path}?success=1&kab={request.POST.get('kab_name', '')}&kec={request.POST.get('region_name', '')}&year={year}")

    # GET Request: Render the Form
    hierarchy = get_geojson_regions()
    kabs = sorted(hierarchy.keys())
    
    selected_kab = request.GET.get('kab')
    selected_kec = request.GET.get('kec')
    selected_year = int(request.GET.get('year', 2024))
    
    context = {
        'kabs': kabs,
        'hierarchy_json': json.dumps(hierarchy),
        'selected_kab': selected_kab,
        'selected_kec': selected_kec,
        'selected_year': selected_year,
        'subsectors': Subsector.objects.all(),
        'commodities': Commodity.objects.all(),
        'success': request.GET.get('success') == '1'
    }
    
    # Pre-fill existing data if region is selected
    if selected_kab:
        dist = District.objects.filter(name=selected_kab).first()
        if not selected_kec:
            # We are entering PDRB (Kabupaten Level)
            existing = {}
            if dist:
                for p in PdrbData.objects.filter(district=dist, year=selected_year):
                    existing[p.subsector_id] = p.value
            context['existing_pdrb'] = existing
        else:
            # We are entering Production (Kecamatan Level)
            existing = {}
            if dist:
                subdist = SubDistrict.objects.filter(name=selected_kec, district=dist).first()
                if subdist:
                    for p in ProductionData.objects.filter(subdistrict=subdist, year=selected_year):
                        existing[p.commodity_id] = p.value
            context['existing_production'] = existing
            
    return render(request, 'admin/data_entry.html', context)
