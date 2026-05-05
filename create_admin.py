import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Onlinevoting2026.settings')
django.setup()

from django.contrib.auth.models import User
from Onlinevoting2026.models import Voter

username = 'admin'
email = 'admin@ovs-srgi.com'
password = 'OVS@dmin2026#Secure'  # Strong password with mixed case, digits, special chars

# Create or reset the superuser
user, created = User.objects.get_or_create(username=username, defaults={'email': email})
if not created:
    print(f"User '{username}' already exists. Resetting password...")
user.set_password(password)
user.is_staff = True
user.is_superuser = True
user.email = email
user.save()
print(f"Superuser '{username}' {'created' if created else 'updated'} successfully!")

# Create or update linked Voter record with admin role
voter, v_created = Voter.objects.get_or_create(
    user=user,
    defaults={
        'aadhaar': '000000000000',
        'full_name': 'Administrator',
        'mobile': '0000000000',
        'email': email,
        'role': 'admin',
        'is_verified': True,
    }
)
if not v_created:
    voter.role = 'admin'
    voter.is_verified = True
    voter.save(update_fields=['role', 'is_verified'])

print(f"Admin Voter record {'created' if v_created else 'updated'} for '{username}'")
print(f"\n--- Admin Credentials ---")
print(f"Username: {username}")
print(f"Password: {password}")
print(f"Admin Login:  http://127.0.0.1:8000/admin-login/")
print(f"Django Admin: http://127.0.0.1:8000/admin/")
