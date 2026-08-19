import os
import json
from django.core.management.base import BaseCommand
from api.models import Commodity

class Command(BaseCommand):
    help = 'Import commodities list from commodities.json'

    def handle(self, *args, **options):
        json_path = os.path.join(os.path.dirname(__file__), 'commodities.json')
        if not os.path.exists(json_path):
            self.stdout.write(self.style.ERROR(f'JSON file not found at {json_path}'))
            return

        with open(json_path, 'r', encoding='utf-8') as f:
            records = json.load(f)

        self.stdout.write(f'Loading {len(records)} commodities from JSON...')
        
        created_count = 0
        updated_count = 0
        
        for r in records:
            name = r['name']
            kelompok = r['kelompok_utama']
            subkelompok = r['subkelompok']
            
            # Skip if name is empty or nan
            if not name or name.lower() == 'nan':
                continue
                
            commodity, created = Commodity.objects.get_or_create(
                name=name,
                defaults={
                    'kelompok_utama': kelompok,
                    'subkelompok': subkelompok
                }
            )
            
            if created:
                created_count += 1
            else:
                commodity.kelompok_utama = kelompok
                commodity.subkelompok = subkelompok
                commodity.save()
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(
            f'Import completed: {created_count} created, {updated_count} updated.'
        ))
