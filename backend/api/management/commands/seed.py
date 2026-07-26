from django.core.management.base import BaseCommand
from api.models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData
import random
import urllib.request
import json
import time

class Command(BaseCommand):
    help = 'Seeds initial dummy data using real region names from API Emsifa'

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
            
        self.stdout.write("Fetching Provinces from API...")
        req_headers = {'User-Agent': 'Mozilla/5.0'}
        prov_req = urllib.request.Request("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json", headers=req_headers)
        with urllib.request.urlopen(prov_req) as response:
            provinces_data = json.loads(response.read().decode())
        
        prov_objs = []
        prov_map = {}
        for p in provinces_data:
            prov = Province.objects.create(name=p['name'])
            prov_objs.append(prov)
            prov_map[p['id']] = prov

        self.stdout.write(f"Created {len(prov_objs)} Provinces.")

        # Create subsectors and commodities first
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
        
        subs_objs = list(Subsector.objects.all())
        coms_objs = list(Commodity.objects.all())

        random.seed(42)
        year = 2024

        self.stdout.write("Fetching Districts (Kab/Kota) and generating dummy PDRB...")
        
        # We will only fetch districts for a few provinces to save time in seeding, 
        # or fetch all if it's fast enough. Let's fetch all (34 requests is fast).
        
        for prov_id, prov_obj in prov_map.items():
            dist_req = urllib.request.Request(f"https://www.emsifa.com/api-wilayah-indonesia/api/regencies/{prov_id}.json", headers=req_headers)
            try:
                with urllib.request.urlopen(dist_req) as response:
                    districts_data = json.loads(response.read().decode())
                
                for d in districts_data:
                    dist = District.objects.create(province=prov_obj, name=d['name'], lat=0.0, lon=0.0)
                    
                    # Generate Dummy PDRB
                    for s in subs_objs:
                        val = random.randint(1000, 10000)
                        PdrbData.objects.create(year=year, district=dist, subsector=s, value=val)
                        
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Failed to fetch districts for {prov_obj.name}: {str(e)}"))
            
            time.sleep(0.1) # Be nice to the API

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with all provinces & districts and dummy PDRB values!"))
