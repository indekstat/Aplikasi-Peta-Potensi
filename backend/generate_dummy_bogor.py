import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import District, SubDistrict, Commodity, ProductionData

bogor = District.objects.filter(name__icontains="BOGOR").filter(name__icontains="KOTA").first()
if not bogor:
    print("Kota Bogor not found")
    exit()

subdistricts = SubDistrict.objects.filter(district=bogor)

base_coms = list(Commodity.objects.all()[:9])
padi = Commodity.objects.filter(name__icontains="padi").first()
if padi and padi not in base_coms:
    base_coms.append(padi)

year = 2024

print(f"Generating data for {bogor.name} in {year}")

created = 0
for sub in subdistricts:
    for com in base_coms:
        # Random production between 100 and 2000
        val = round(random.uniform(100.0, 2000.0), 2)
        
        # Make padi higher for some subdistricts to give interesting LQ
        if "padi" in com.name.lower():
            val = round(random.uniform(500.0, 5000.0), 2)
            
        ProductionData.objects.update_or_create(
            year=year,
            district=bogor,
            subdistrict=sub,
            commodity=com,
            defaults={'value': val}
        )
        created += 1

print(f"Generated {created} ProductionData records")
