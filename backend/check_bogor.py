import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import District, SubDistrict, Commodity, ProductionData

districts = District.objects.filter(name__icontains="BOGOR")
for d in districts:
    print(f"District: {d.name} (ID: {d.id})")
    subs = SubDistrict.objects.filter(district=d)
    print(f"  Subdistricts: {[s.name for s in subs]}")

coms = Commodity.objects.all()[:10]
print(f"Commodities sample: {[c.name for c in coms]}")
