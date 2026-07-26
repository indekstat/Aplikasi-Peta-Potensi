import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User

# Delete all users
User.objects.all().delete()
print("Semua user telah dihapus.")

# Create superuser
User.objects.create_superuser('superadmin', 'admin@indekstat.com', 'Indekstat@919')
print("Superadmin berhasil dibuat.")
