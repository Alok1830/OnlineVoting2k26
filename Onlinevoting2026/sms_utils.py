from twilio.rest import Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_otp_sms(phone_number, otp_code):
    """Send OTP via SMS using Twilio"""
    try:
        logger.info(f"Attempting to send OTP to {phone_number}")
        
        # Validate phone number format
        if not phone_number.startswith('+'):
            logger.error(f"Invalid phone format: {phone_number}. Must start with +")
            return False, "Invalid phone number format. Must start with +"
        
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        message_body = f"Your OVS-SRGI voting OTP is: {otp_code}. Do not share this with anyone. Valid for 10 minutes."
        
        logger.info(f"Creating Twilio client and sending message to {phone_number}")
        
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        
        logger.info(f"✓ OTP sent successfully to {phone_number}. Message SID: {message.sid}, Status: {message.status}")
        return True, message.sid
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"✗ Error sending OTP to {phone_number}: {error_msg}")
        
        # Log specific Twilio errors
        if "Invalid" in error_msg:
            logger.error(f"  → Check phone number format and Twilio account settings")
        elif "not found" in error_msg.lower():
            logger.error(f"  → Twilio credentials not found or invalid")
        elif "unauthorized" in error_msg.lower():
            logger.error(f"  → Twilio authentication failed. Check SID and Auth Token")
        
        return False, error_msg

