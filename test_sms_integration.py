"""
Quick test script to verify Twilio SMS integration
Run with: python manage.py shell < test_sms.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Onlinevoting2026.settings')
django.setup()

from Onlinevoting2026.sms_utils import send_otp_sms
from django.conf import settings

print("=" * 60)
print("TWILIO SMS INTEGRATION TEST")
print("=" * 60)

print(f"\n✓ Settings loaded:")
print(f"  - Account SID: {settings.TWILIO_ACCOUNT_SID[:10]}...")
print(f"  - Phone: {settings.TWILIO_PHONE_NUMBER}")

print(f"\nTesting SMS sending...")

# Test with a sample OTP
test_phone = "+919876543210"  # Change to your actual phone number
test_otp = "123456"

print(f"  Phone: {test_phone}")
print(f"  OTP: {test_otp}")

success, result = send_otp_sms(test_phone, test_otp)

print(f"\n{'✓ SUCCESS' if success else '✗ FAILED'}: {result}")

if not success:
    print(f"\nTroubleshooting:")
    print(f"  1. Check Twilio Account SID and Auth Token")
    print(f"  2. Verify phone number format (start with +country_code)")
    print(f"  3. Check Twilio account balance/trial credits")
    print(f"  4. Ensure phone number is verified in Twilio")
else:
    print(f"\n✓ SMS test successful!")
    print(f"  Message SID: {result}")

print("\n" + "=" * 60)
