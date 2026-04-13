#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Onlinevoting2026.settings')
sys.path.insert(0, 'd:\\OnlineVoting2k26')

django.setup()

from Onlinevoting2026.sms_utils import send_otp_sms

print("\n" + "="*60)
print("TWILIO SMS TEST - MULTIPLE USERS")
print("="*60)

while True:
    print("\nEnter phone number (10 digits, without country code)")
    print("Example: 9305381302")
    phone_input = input("Phone: ").strip()
    
    if len(phone_input) != 10 or not phone_input.isdigit():
        print("✗ Invalid format. Must be 10 digits.")
        continue
    
    test_phone = f"+91{phone_input}"
    
    print("\nEnter OTP to send (6 digits)")
    otp_input = input("OTP: ").strip()
    
    if len(otp_input) != 6 or not otp_input.isdigit():
        print("✗ Invalid OTP format. Must be 6 digits.")
        continue
    
    print(f"\nSending test OTP...")
    print(f"Phone: {test_phone}")
    print(f"OTP: {otp_input}")
    
    success, result = send_otp_sms(test_phone, otp_input)
    
    print(f"\nResult: {'✓ SUCCESS' if success else '✗ FAILED'}")
    print(f"Message/Error: {result}")
    
    if success:
        print("\n✓ Twilio SMS sent successfully!")
    else:
        print("\n✗ SMS failed. Check credentials and phone format.")
    
    again = input("\nTest another number? (y/n): ").strip().lower()
    if again != 'y':
        break

print("="*60 + "\n")
