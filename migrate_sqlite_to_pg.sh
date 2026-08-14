#!/bin/bash
# Script migrasi data dari SQLite ke PostgreSQL
# Jalankan SEKALI SAJA setelah `docker compose up -d`
# 
# Usage: bash backend/migrate_sqlite_to_pg.sh

set -e

echo "===================================================="
echo "  Migrasi Data SQLite → PostgreSQL"
echo "===================================================="

# Pastikan container db sudah running
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
docker compose exec backend python manage.py migrate --run-syncdb
echo "✓ Migrasi tabel selesai"

# Export data dari SQLite sebagai JSON fixture
echo ""
echo "[3/5] Export data dari SQLite..."
docker compose exec backend python manage.py dumpdata \
    --natural-foreign \
    --natural-primary \
    --exclude=contenttypes \
    --exclude=auth.permission \
    --indent 2 \
    -o /tmp/sqlite_data.json
echo "✓ Data ter-export ke /tmp/sqlite_data.json"

# Load data ke PostgreSQL
echo ""
echo "[4/5] Import data ke PostgreSQL..."
docker compose exec backend python manage.py loaddata /tmp/sqlite_data.json
echo "✓ Data ter-import ke PostgreSQL"

# Verifikasi
echo ""
echo "[5/5] Verifikasi data..."
PROVINCE_COUNT=$(docker compose exec backend python manage.py shell -c "from api.models import Province; print(Province.objects.count())" 2>/dev/null | tail -1)
USER_COUNT=$(docker compose exec backend python manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.count())" 2>/dev/null | tail -1)

echo "✓ Jumlah Provinsi  : $PROVINCE_COUNT"
echo "✓ Jumlah User      : $USER_COUNT"
echo ""
echo "===================================================="
echo "  Migrasi selesai! Data SQLite berhasil dipindahkan"
echo "  ke PostgreSQL."
echo "===================================================="
