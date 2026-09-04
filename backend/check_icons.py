import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import Commodity
coms = Commodity.objects.filter(name__icontains="Padi")
for c in coms:
    print(f"Name: {c.name}, Icon: '{c.icon}'")
