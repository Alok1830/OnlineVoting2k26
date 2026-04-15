# SMS Integration Guide

## Setup Complete ✓

The Twilio SMS integration has been successfully configured!

### Current Configuration

✓ Configured via environment variables (see `.env` file)
- Account SID: Stored securely
- Phone Number: Stored securely  
- Auth Token: Stored securely

---

## How It Works

### Registration Flow
1. User enters mobile number during registration
2. Clicks "Get OTP"
3. Backend calls `/api/request-registration-otp/`
4. OTP is generated and sent via SMS to user's phone
5. User enters OTP in the form

### Login Flow
1. User enters Aadhaar number
2. Clicks "Get OTP"
3. Backend calls `/api/request-otp/`
4. OTP is generated and sent via SMS
5. User enters OTP to login

---

## Testing SMS

### Test Script
Run the quick test to verify SMS setup:

```bash
cd d:\OnlineVoting2k26
python manage.py shell < test_sms_integration.py
```

Expected output:
```
✓ Settings loaded:
  - Account SID: AC964b6b...
  - Phone: +16413632102

Testing SMS sending...
✓ SUCCESS: SMS4a7c1d3p8f2k...
```

### Manual Test
1. Register at: http://127.0.0.1:8000/registration/
   - Aadhaar: `123456789012`
   - Mobile: Your actual 10-digit phone number
   - Name: Test
   - Click "Get OTP"
   - You should **receive an SMS** with the OTP

---

## Debugging

### View Logs
Logs are saved to: `voting_app.log`

```bash
tail -f voting_app.log
```

### Common Issues

#### 1. **"Server error" on OTP request**
   - Check if Twilio credentials are correct
   - Verify Account SID and Auth Token
   - Run: `python manage.py shell`

#### 2. **SMS not received**
   - Check phone number format: `+91XXXXXXXXXX` (India)
   - Verify phone is not on Twilio blacklist
   - Check Twilio account balance/trial credits
   - Verify phone number is in Verified Caller section

#### 3. **Invalid Phone Format Error**
   - Mobile must be exactly **10 digits**
   - System adds `+91` prefix automatically
   - Example: `9876543210` → `+919876543210`

#### 4. **Twilio API Errors**
   - Check logs in console and `voting_app.log`
   - Common: "Invalid phone number" - format issue
   - Common: "Account suspended" - check Twilio dashboard
   - Common: "Auth failed" - wrong credentials

---

## Production Notes

### Security
- **Remove** `'otp_code'` from API responses in production
- Keep credentials in environment variables, not hardcoded
- Use `.env` file with `python-dotenv`

### Example (Production)
```python
# settings.py
import os
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
```

### Update Response (Production)
Remove in [`views.py`](views.py#L80):
```python
# Remove this line from API response:
'otp_code': otp.otp_code  # ← REMOVE IN PRODUCTION
```

---

## API Endpoints

### Request OTP (Login)
```
POST /api/request-otp/
Content-Type: application/json

{
  "aadhaar": "123456789012"
}

Response:
{
  "message": "OTP sent to your registered mobile number",
  "otp_code": "123456"
}
```

### Request OTP (Registration)
```
POST /api/request-registration-otp/
Content-Type: application/json

{
  "aadhaar": "123456789012",
  "mobile": "9876543210"
}

Response:
{
  "message": "OTP sent to your mobile number",
  "otp_code": "123456"
}
```

---

## File Changes

- ✓ `settings.py` - Added Twilio credentials and logging config
- ✓ `sms_utils.py` - SMS sending utility with error logging
- ✓ `views.py` - Updated OTP requests with SMS integration
- ✓ `urls.py` - Added registration OTP endpoint
- ✓ `static/js/registration.js` - Updated to use new endpoint
- ✓ `voting_app.log` - Application logs (created on first run)

---

## Ready to Test!

Your voting system now sends OTP via SMS!

### Next Steps:
1. Run server: `python manage.py runserver`
2. Test registration: http://127.0.0.1:8000/registration/
3. Check logs: `voting_app.log`
4. Test login: http://127.0.0.1:8000/login/

Questions? Check console output and `voting_app.log` for detailed error messages.
