#!/bin/bash
# Script migrasi data dari SQLite lokal ke PostgreSQL Docker
# Jalankan SEKALI SAJA setelah `docker compose up -d`
#
# Usage: bash migrate_sqlite_to_pg.sh

set -e

echo "===================================================="
echo "  Migrasi Data SQLite → PostgreSQL"
echo "===================================================="

# Cek container PostgreSQL
echo ""
echo "[1/5] Cek status container PostgreSQL..."
if ! docker compose ps db | grep -q "Up"; then
    echo "ERROR: Container 'db' belum running. Jalankan 'docker compose up -d' dulu."
    exit 1
fi
echo "✓ PostgreSQL berjalan"

# Jalankan migrate dulu agar tabel terbuat di PostgreSQL
echo ""
echo "[2/5] Membuat tabel di PostgreSQL (django migrate)..."
docker compose exec backend python manage.py migrate
echo "✓ Migrasi tabel selesai"

# Export data dari SQLite lokal menggunakan Django settings (SQLite mode)
echo ""
echo "[3/5] Export data dari SQLite lokal..."
cd backend
DB_HOST="" python3 -c "
import django, os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
os.environ['DB_HOST'] = ''
sys.path.insert(0, '.')
django.setup()
from django.core import management
with open('/tmp/data_export.json', 'w') as f:
    management.call_command(
        'dumpdata',
        '--natural-foreign', '--natural-primary',
        '--exclude=contenttypes',
        '--exclude=auth.permission',
        '--indent=2',
        stdout=f
    )
import json
with open('/tmp/data_export.json') as f:
    data = json.load(f)
print(f'Exported {len(data)} objects')
"
cd ..
echo "✓ Data ter-export"

# Copy fixture ke container lalu import
echo ""
echo "[4/5] Import data ke PostgreSQL..."
docker cp /tmp/data_export.json petapotensi_backend:/tmp/data_export.json
docker compose exec backend python manage.py loaddata /tmp/data_export.json
echo "✓ Data ter-import"

# Verifikasi
echo ""
echo "[5/5] Verifikasi data..."
docker compose exec backend python manage.py shell -c "
from django.contrib.auth.models import User
from api.models import Province, District
print('✓ Users     :', User.objects.count())
print('✓ Provinces :', Province.objects.count())
print('✓ Districts :', District.objects.count())
"

echo ""
echo "===================================================="
echo "  Migrasi selesai!"
echo "===================================================="
