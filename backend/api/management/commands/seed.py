from django.core.management.base import BaseCommand
from api.models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData
import random
import urllib.request
import json

class Command(BaseCommand):
    help = 'Seeds initial dummy data using real region names from GeoJSON'

    def handle(self, *args, **kwargs):
        # Clear existing data to ensure a clean seed
        self.stdout.write("Clearing existing data...")
        PdrbData.objects.all().delete()
        ProductionData.objects.all().delete()
        SubDistrict.objects.all().delete()
        District.objects.all().delete()
        Province.objects.all().delete()
        Commodity.objects.all().delete()
        Subsector.objects.all().delete()
            
        # 1. Create Province
        prov = Province.objects.create(name='Jawa Timur')
            
        self.stdout.write("Fetching Kecamatan GeoJSON to get real region names...")
        with open('jatim_kecamatan.geojson', 'r') as f:
            data = json.load(f)
        
        # Build hierarchy
        region_hierarchy = {}
        for f in data.get('features', []):
            props = f['properties']
            kab = props.get('NAME_2')
            kec = props.get('NAME_3')
            
            if kab and kec:
                clean_kab = kab.title()
                clean_kec = kec.title()
                
                # Calculate simple center
                geom = f.get('geometry', {})
                coords = geom.get('coordinates', [])
                def flatten(c):
                    res = []
                    for i in c:
                        if isinstance(i[0], (int, float)): res.append(i)
                        else: res.extend(flatten(i))
                    return res
                points = flatten(coords)
                lat, lon = 0.0, 0.0
                if points:
                    lats = [p[1] for p in points]
                    lons = [p[0] for p in points]
                    lat = sum(lats)/len(lats)
                    lon = sum(lons)/len(lons)

                if clean_kab not in region_hierarchy:
                    region_hierarchy[clean_kab] = {}
                region_hierarchy[clean_kab][clean_kec] = (lat, lon)
        
        self.stdout.write(f"Found {len(region_hierarchy)} Kabupaten/Kota in Jawa Timur.")
        
        # Seed Districts and SubDistricts
        created_districts = []
        for kab_name, kec_dict in region_hierarchy.items():
            dist = District.objects.create(province=prov, name=kab_name, lat=0.0, lon=0.0)
            created_districts.append(dist)
            # Create subdistricts
            for kec_name, (lat, lon) in kec_dict.items():
                SubDistrict.objects.create(district=dist, name=kec_name, lat=lat, lon=lon)

            
        subsectors = [
            'Pertanian, Kehutanan, dan Perikanan', 'Pertambangan dan Penggalian', 
            'Industri Pengolahan', 'Pengadaan Listrik dan Gas', 
            'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang', 'Konstruksi', 
            'Transportasi dan Pergudangan', 'Penyediaan Akomodasi dan Makan Minum', 
            'Informasi dan Komunikasi', 'Jasa Keuangan dan Asuransi', 'Real Estate', 
            'Jasa Perusahaan', 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib', 
            'Jasa Pendidikan', 'Jasa Kesehatan dan Kegiatan Sosial', 'Jasa lainnya'
        ]
        
        for s in subsectors:
            Subsector.objects.create(name=s)
            
        commodities = [
            'Minyak Cengkeh', 'Daun Cengkeh', 'Cengkeh Bunga Kering', 'Kakao', 
            'Kapuk Randu', 'Jambu Mete', 'Kelapa', 'Gula Kelapa', 'Kopi', 
            'Lada', 'Aren', 'Kapas', 'Nilam', 'Tembakau'
        ]
        
        for c in commodities:
            Commodity.objects.create(name=c)

        # Create dummy PDRB & Production
        self.stdout.write("Generating dummy PDRB and Production data...")
        districts_objs = list(District.objects.all())
        districts_with_prov = [None] + districts_objs
        
        subdistricts_objs = list(SubDistrict.objects.all())
        subdistricts_with_dist = [None] + subdistricts_objs
        
        subs_objs = list(Subsector.objects.all())
        coms_objs = list(Commodity.objects.all())
        
        random.seed(42)
        year = 2024
        
        # PDRB
        for dist in districts_with_prov:
            for s in subs_objs:
                val = random.randint(10000, 50000) if dist is None else random.randint(1000, 10000)
                PdrbData.objects.create(year=year, district=dist, subsector=s, value=val)
                
        # Production (Only assigning a subset of commodities per subdistrict to avoid crowding and improve realism)
        for sub in subdistricts_with_dist:
            # pick 3-6 random commodities for this subdistrict
            num_coms = random.randint(3, 6)
            selected_coms = random.sample(coms_objs, num_coms)
            for c in selected_coms:
                val = random.randint(5000, 20000) if sub is None else random.randint(500, 5000)
                ProductionData.objects.create(year=year, subdistrict=sub, commodity=c, value=val)

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with real region names and dummy values!"))
