import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import Commodity

emoji_map = {
    'Kakao': '🍫',
    'Teh': '🍵',
    'Tebu': '🎋',
    'Cengkeh': '🍂',
    'Pala': '🌰',
    'Padi sawah': '🌾',
    'Sapi potong': '🐮',
    'Nilam': '🌿',
    'Jagung': '🌽',
    'Kedelai': '🫘'
}

for name, icon in emoji_map.items():
    Commodity.objects.filter(name__icontains=name).update(icon=icon)

print("Icons updated")
