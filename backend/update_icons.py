import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()

from api.models import Subsector, Commodity

# Update Subsectors
sektor_icons = {
    "Pertanian": "🌾",
    "Kehutanan": "🌲",
    "Perikanan": "🐟",
    "Pertambangan": "⛏️",
    "Industri": "🏭",
    "Pengadaan Air": "🚰",
    "Konstruksi": "🏗️",
    "Perdagangan": "🏪",
    "Transportasi": "🚚",
    "Akomodasi": "🏨",
    "Informasi": "📡",
    "Keuangan": "💰",
    "Real Estat": "🏠",
    "Jasa": "💼",
}

for subsector in Subsector.objects.all():
    matched = False
    for key, icon in sektor_icons.items():
        if key.lower() in subsector.name.lower():
            subsector.icon = icon
            subsector.save()
            matched = True
            break
    if not matched:
        subsector.icon = "📊"
        subsector.save()

# Update Commodities
komoditas_icons = {
    "Cengkeh": "🍂",
    "Kopi": "☕",
    "Kakao": "🍫",
    "Tebu": "🎋",
    "Kelapa": "🥥",
    "Padi": "🌾",
    "Jagung": "🌽",
    "Kedelai": "🫘",
    "Sapi": "🐄",
    "Kambing": "🐐",
    "Ayam": "🐔",
    "Susu": "🥛",
    "Telur": "🥚",
    "Ikan": "🐟",
    "Udang": "🦐",
    "Lele": "🐟",
    "Mangga": "🥭",
    "Pisang": "🍌",
    "Jeruk": "🍊",
    "Apel": "🍎",
    "Bawang": "🧅",
    "Cabai": "🌶️",
}

for commodity in Commodity.objects.all():
    matched = False
    for key, icon in komoditas_icons.items():
        if key.lower() in commodity.name.lower():
            commodity.icon = icon
            commodity.save()
            matched = True
            break
    if not matched:
        commodity.icon = "📦"
        commodity.save()

print("Icons updated successfully!")
