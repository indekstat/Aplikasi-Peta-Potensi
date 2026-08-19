from django.core.management.base import BaseCommand
from api.models import Province, District, SubDistrict
import urllib.request
import json
import time

class Command(BaseCommand):
    help = 'Seeds subdistricts from API Emsifa'

    def handle(self, *args, **kwargs):
        self.stdout.write("Fetching Provinces from API...")
        req_headers = {'User-Agent': 'Mozilla/5.0'}
        prov_req = urllib.request.Request("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json", headers=req_headers)
        with urllib.request.urlopen(prov_req) as response:
            provinces_data = json.loads(response.read().decode())
        
        self.stdout.write("Mapping and fetching subdistricts...")
        
        for p in provinces_data:
            prov_name = p['name']
            prov_obj = Province.objects.filter(name=prov_name).first()
            if not prov_obj:
                continue
                
            dist_req = urllib.request.Request(f"https://www.emsifa.com/api-wilayah-indonesia/api/regencies/{p['id']}.json", headers=req_headers)
            try:
                with urllib.request.urlopen(dist_req) as response:
                    districts_data = json.loads(response.read().decode())
                
                for d in districts_data:
                    dist_name = d['name']
                    dist_obj = District.objects.filter(province=prov_obj, name=dist_name).first()
                    
                    if dist_obj and not SubDistrict.objects.filter(district=dist_obj).exists():
                        # Fetch subdistricts
                        subdist_req = urllib.request.Request(f"https://www.emsifa.com/api-wilayah-indonesia/api/districts/{d['id']}.json", headers=req_headers)
                        try:
                            with urllib.request.urlopen(subdist_req) as res:
                                subdist_data = json.loads(res.read().decode())
                            
                            subdist_objects = [
                                SubDistrict(district=dist_obj, name=sd['name'], lat=0.0, lon=0.0)
                                for sd in subdist_data
                            ]
                            SubDistrict.objects.bulk_create(subdist_objects)
                            self.stdout.write(f"Added {len(subdist_objects)} subdistricts for {dist_name}")
                        except Exception as e:
                            self.stdout.write(f"Error fetching subdistricts for {dist_name}: {e}")
                        
                        time.sleep(0.05) # Rate limiting
                        
            except Exception as e:
                self.stdout.write(f"Failed to fetch districts for {prov_name}: {e}")

        self.stdout.write(self.style.SUCCESS("Finished seeding subdistricts!"))
