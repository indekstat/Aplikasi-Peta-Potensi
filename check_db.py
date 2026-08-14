import os
import django
import sys

sys.path.append('/Users/indekstat27/Documents/GitHub/Aplikasi-Peta-Potensi/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import PdrbData

prov_data = PdrbData.objects.filter(district__isnull=True).values_list('province__name', 'year').distinct()
print("Province Data saved in DB:", list(prov_data))

kab_data = PdrbData.objects.filter(district__name__icontains="bogor").values_list('district__name', 'year').distinct()
print("Bogor Data saved in DB:", list(kab_data))
