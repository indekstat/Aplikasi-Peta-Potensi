import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petapotensi.settings')
django.setup()
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Admin created")
else:
    print("Admin already exists")
