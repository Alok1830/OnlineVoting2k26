import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Onlinevoting2026.settings')
django.setup()

from django.contrib.auth.models import User

username = 'ASHUTOSH'
email = 'rachit7cr@gmail.com'
password = 'admin123'  # Change this to your desired password

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f"Superuser '{username}' created successfully!")
else:
    print(f"Superuser '{username}' already exists!")
