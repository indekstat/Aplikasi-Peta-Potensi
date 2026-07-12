from django.core.management.base import BaseCommand
from api.models import District, Subsector, Commodity, PdrbData, ProductionData
import random

class Command(BaseCommand):
    help = 'Seeds initial dummy data'

    def handle(self, *args, **kwargs):
        if District.objects.count() > 0:
            self.stdout.write("Database already seeded.")
            return
            
        dummy_districts = [
            {'name': 'Surabaya', 'lat': -7.250445, 'lon': 112.768845},
            {'name': 'Malang', 'lat': -7.966620, 'lon': 112.632632},
            {'name': 'Sidoarjo', 'lat': -7.447800, 'lon': 112.718300},
            {'name': 'Banyuwangi', 'lat': -8.219200, 'lon': 114.369200},
            {'name': 'Jember', 'lat': -8.172100, 'lon': 113.699500}
        ]
        
        for d in dummy_districts:
            District.objects.create(**d)
            
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

        # Create dummy PDRB & Production
        districts_objs = list(District.objects.all())
        districts_with_prov = [None] + districts_objs
        
        subs_objs = Subsector.objects.all()
        coms_objs = Commodity.objects.all()
        
        random.seed(42)
        for dist in districts_with_prov:
            for s in subs_objs:
                val = random.randint(10000, 50000) if dist is None else random.randint(1000, 10000)
                PdrbData.objects.create(district=dist, subsector=s, value=val)
                
            for c in coms_objs:
                val = random.randint(5000, 20000) if dist is None else random.randint(500, 5000)
                ProductionData.objects.create(district=dist, commodity=c, value=val)

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with dummy data!"))
