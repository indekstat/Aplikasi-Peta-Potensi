import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import ProductionData
from django.db.models import Count

print(ProductionData.objects.values('year').annotate(c=Count('id')))
