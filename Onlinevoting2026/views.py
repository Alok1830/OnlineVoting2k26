from django.shortcuts import render
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import authenticate
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Voter, Election, Candidate, Vote, OTP
from .serializers import (
    VoterSerializer, VoterRegistrationSerializer, 
    ElectionSerializer, ElectionDetailSerializer,
    CandidateSerializer, CandidateUpdateSerializer,
    VoteSerializer, OTPSerializer
)
from .sms_utils import send_otp_sms
import jwt
import logging

logger = logging.getLogger(__name__)


def _digits_only(value):
    return ''.join(ch for ch in str(value or '').strip() if ch.isdigit())


def _get_valid_otp(aadhaar, otp_code):
    """Return latest matching, unverified, non-expired OTP record."""
    normalized_aadhaar = _digits_only(aadhaar)
    normalized_otp = _digits_only(otp_code)
    if len(normalized_aadhaar) != 12 or len(normalized_otp) != 6:
        return None

    now = timezone.now()
    return (
        OTP.objects
        .filter(
            aadhaar=normalized_aadhaar,
            otp_code=normalized_otp,
            is_verified=False,
            expires_at__gte=now
        )
        .order_by('-created_at')
        .first()
    )

# Template Views
def landing_page(request):
    return render(request, "landing_page.html")

def login(request):
    return render(request, "login.html")

def admin_login_page(request):
    return render(request, "admin_login.html")

def registration(request):
    return render(request, "registration.html")

def admin_panel(request):
    return render(request, "admin_panel.html")

def voter_panel(request):
    return render(request, "voter_panel.html")

def candidate_panel(request):
    return render(request, "candidate_panel.html")

def profile(request):
    return render(request, "profile.html")


# API Views
@api_view(['POST'])
def request_otp(request):
    """Generate and send OTP to registered mobile via SMS."""
    mobile = _digits_only(request.data.get('mobile'))

    logger.info(f"Login OTP request for mobile: {mobile}")

    if len(mobile) != 10:
        logger.warning(f"Invalid mobile format: {mobile}")
        return Response(
            {'error': 'Invalid mobile number. Must be 10 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if verified voter exists for this mobile
    try:
        voter = Voter.objects.get(mobile=mobile, is_verified=True)
    except Voter.DoesNotExist:
        logger.warning(f"Mobile {mobile} not found in verified voters")
        return Response(
            {'error': 'Mobile number not found. Please register first.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Generate OTP
    serializer = OTPSerializer(data={'aadhaar': voter.aadhaar})
    if serializer.is_valid():
        otp = serializer.save()
        logger.info(f"OTP generated for Aadhaar linked to mobile {mobile}")

        # Send OTP via Twilio SMS
        phone_number = f"+91{voter.mobile}" if not voter.mobile.startswith('+') else voter.mobile
        logger.info(f"Sending SMS to {phone_number}")

        success, result = send_otp_sms(phone_number, otp.otp_code)

        if success:
            logger.info(f"OTP sent successfully. Message SID: {result}")
            return Response({
                'message': 'OTP sent to your registered mobile number'
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Failed to send SMS: {result}")
            return Response(
                {'error': f'Failed to send OTP. Error: {result}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    logger.error(f"OTP serialization failed: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def register_voter(request):
    """Register a new voter"""
    aadhaar = _digits_only(request.data.get('aadhaar'))
    otp_code = _digits_only(request.data.get('otp_code'))

    # Verify OTP
    otp = _get_valid_otp(aadhaar, otp_code)
    if not otp:
        return Response(
            {'error': 'Invalid OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )

    mobile = _digits_only(request.data.get('mobile'))
    if len(mobile) != 10:
        return Response(
            {'error': 'Invalid mobile number. Must be 10 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Voter.objects.filter(mobile=mobile).exists():
        return Response(
            {'error': 'Mobile number already registered. Please login.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    request_data = request.data.copy()
    request_data['aadhaar'] = aadhaar
    request_data['mobile'] = mobile

    # Register voter
    serializer = VoterRegistrationSerializer(data=request_data)
    if serializer.is_valid():
        voter = serializer.save(is_verified=True)
        otp.is_verified = True
        otp.save(update_fields=['is_verified'])
        return Response(VoterSerializer(voter).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_voter(request):
    """Login voter with registered mobile and OTP."""
    mobile = _digits_only(request.data.get('mobile'))
    otp_code = _digits_only(request.data.get('otp_code'))

    if len(mobile) != 10:
        return Response(
            {'error': 'Invalid mobile number. Must be 10 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        voter = Voter.objects.get(mobile=mobile, is_verified=True)
    except Voter.DoesNotExist:
        return Response(
            {'error': 'Mobile number not registered'},
            status=status.HTTP_404_NOT_FOUND
        )

    otp = _get_valid_otp(voter.aadhaar, otp_code)
    if not otp:
        return Response(
            {'error': 'Invalid OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )

    otp.is_verified = True
    otp.save(update_fields=['is_verified'])

    try:
        voter_data = VoterSerializer(voter).data

        # Generate JWT token
        payload = {
            'voter_id': str(voter.id),
            'aadhaar': voter.aadhaar,
            'mobile': voter.mobile,
            'role': voter.role
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

        return Response({
            'message': 'Login successful',
            'token': token,
            'voter': voter_data
        }, status=status.HTTP_200_OK)
    except Voter.DoesNotExist:
        return Response(
            {'error': 'Voter not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# --- Login throttling (in-memory, per IP) ---
_login_attempts = {}   # ip -> {'count': int, 'locked_until': datetime | None}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 900  # 15 minutes


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _check_throttle(ip):
    """Return (allowed: bool, remaining_seconds: int)."""
    entry = _login_attempts.get(ip)
    if not entry:
        return True, 0
    if entry.get('locked_until'):
        remaining = (entry['locked_until'] - timezone.now()).total_seconds()
        if remaining > 0:
            return False, int(remaining)
        # Lockout expired — reset
        _login_attempts.pop(ip, None)
    return True, 0


def _record_failed_attempt(ip):
    entry = _login_attempts.setdefault(ip, {'count': 0, 'locked_until': None})
    entry['count'] += 1
    if entry['count'] >= MAX_LOGIN_ATTEMPTS:
        entry['locked_until'] = timezone.now() + timedelta(seconds=LOCKOUT_SECONDS)
        logger.warning(f"Admin login locked for IP {ip} after {MAX_LOGIN_ATTEMPTS} failed attempts")


def _clear_attempts(ip):
    _login_attempts.pop(ip, None)


@api_view(['POST'])
def admin_login(request):
    """Login admin with username and password (with brute-force protection)."""
    ip = _get_client_ip(request)

    # Check throttle
    allowed, remaining = _check_throttle(ip)
    if not allowed:
        return Response(
            {'error': f'Too many failed attempts. Try again in {remaining // 60} min {remaining % 60} sec.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)
    if user is None:
        _record_failed_attempt(ip)
        logger.warning(f"Failed admin login attempt for '{username}' from {ip}")
        return Response(
            {'error': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not (user.is_staff or user.is_superuser):
        return Response(
            {'error': 'Access denied. Admin privileges required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Successful login — clear throttle
    _clear_attempts(ip)

    # Find or create a linked Voter record with admin role
    try:
        voter = Voter.objects.get(user=user)
    except Voter.DoesNotExist:
        # Auto-create an admin Voter record linked to the Django user
        voter = Voter.objects.create(
            user=user,
            aadhaar='000000000000',
            full_name=user.get_full_name() or user.username,
            mobile='0000000000',
            email=user.email or '',
            role='admin',
            is_verified=True,
        )

    # Ensure role is admin
    if voter.role != 'admin':
        voter.role = 'admin'
        voter.save(update_fields=['role'])

    voter_data = VoterSerializer(voter).data

    payload = {
        'voter_id': str(voter.id),
        'aadhaar': voter.aadhaar,
        'mobile': voter.mobile,
        'role': voter.role,
        'is_superuser': user.is_superuser,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    logger.info(f"Admin login successful for '{username}' from {ip}")

    return Response({
        'message': 'Admin login successful',
        'token': token,
        'voter': voter_data,
    }, status=status.HTTP_200_OK)


def _get_voter_from_token(request):
    """Extract voter from JWT token in Authorization header."""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        voter_id = payload.get('voter_id')
        return Voter.objects.get(id=voter_id)
    except (jwt.DecodeError, jwt.ExpiredSignatureError, Voter.DoesNotExist):
        return None


@api_view(['GET'])
def my_candidacies(request):
    """Get all candidacies for the logged-in voter/candidate."""
    voter = _get_voter_from_token(request)
    if not voter:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    candidacies = Candidate.objects.filter(voter=voter).select_related('election')
    serializer = CandidateSerializer(candidacies, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@parser_classes([MultiPartParser, FormParser])
def update_candidacy(request, candidacy_id):
    """Allow a candidate to update their own manifesto, symbol, party, description."""
    voter = _get_voter_from_token(request)
    if not voter:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        candidacy = Candidate.objects.get(id=candidacy_id, voter=voter)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidacy not found or not yours'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CandidateUpdateSerializer(candidacy, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        # Return full candidate data
        full_serializer = CandidateSerializer(candidacy, context={'request': request})
        return Response(full_serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def request_registration_otp(request):
    """Generate and send OTP for new voter registration"""
    aadhaar = _digits_only(request.data.get('aadhaar'))
    mobile = _digits_only(request.data.get('mobile'))

    logger.info(f"Registration OTP request for Aadhaar: {aadhaar}")

    if len(aadhaar) != 12:
        logger.warning(f"Invalid Aadhaar format: {aadhaar}")
        return Response(
            {'error': 'Invalid Aadhaar number. Must be 12 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(mobile) != 10:
        logger.warning(f"Invalid mobile format: {mobile}")
        return Response(
            {'error': 'Invalid mobile number. Must be 10 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if aadhaar already registered
    if Voter.objects.filter(aadhaar=aadhaar).exists():
        logger.warning(f"Aadhaar {aadhaar} already registered")
        return Response(
            {'error': 'Aadhaar already registered. Please login.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Voter.objects.filter(mobile=mobile).exists():
        logger.warning(f"Mobile {mobile} already registered")
        return Response(
            {'error': 'Mobile number already registered. Please login.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate OTP
    serializer = OTPSerializer(data={'aadhaar': aadhaar})
    if serializer.is_valid():
        otp = serializer.save()
        logger.info(f"OTP generated for {aadhaar}: {otp.otp_code}")
        
        # Send OTP via Twilio SMS
        phone_number = f"+91{mobile}"
        logger.info(f"Sending SMS to {phone_number}")
        
        success, result = send_otp_sms(phone_number, otp.otp_code)
        
        if success:
            logger.info(f"OTP sent successfully. Message SID: {result}")
            return Response({
                'message': 'OTP sent to your mobile number'
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Failed to send SMS: {result}")
            return Response(
                {'error': f'Failed to send OTP. Error: {result}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    logger.error(f"OTP serialization failed: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ElectionViewSet(viewsets.ModelViewSet):
    """ViewSet for elections"""
    queryset = Election.objects.all()
    serializer_class = ElectionSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ElectionDetailSerializer
        return ElectionSerializer
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get election results (Admin only)"""
        # Ensure only Admins can view results
        voter = _get_voter_from_token(request)
        if not voter or voter.role != 'admin':
            return Response({'error': 'Authentication required. Admin access only.'}, status=status.HTTP_403_FORBIDDEN)

        election = self.get_object()
        candidates = election.candidates.all()
        candidate_serializer = CandidateSerializer(candidates, many=True)
        return Response({
            'election': ElectionDetailSerializer(election).data,
            'results': candidate_serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active elections"""
        elections = Election.objects.filter(status='active')
        serializer = self.get_serializer(elections, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming elections"""
        elections = Election.objects.filter(status='upcoming')
        serializer = self.get_serializer(elections, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Get completed elections"""
        elections = Election.objects.filter(status='completed')
        serializer = self.get_serializer(elections, many=True)
        return Response(serializer.data)


class CandidateViewSet(viewsets.ModelViewSet):
    """ViewSet for candidates"""
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        election_id = self.request.query_params.get('election')
        if election_id:
            return Candidate.objects.filter(election=election_id)
        return Candidate.objects.all()


class VoteViewSet(viewsets.ModelViewSet):
    """ViewSet for voting"""
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Cast a vote"""
        aadhaar = request.data.get('voter_aadhaar')
        
        try:
            voter = Voter.objects.get(aadhaar=aadhaar)
            request.voter = voter
        except Voter.DoesNotExist:
            return Response(
                {'error': 'Voter not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(voter=voter)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VoterViewSet(viewsets.ModelViewSet):
    """ViewSet for voters"""
    queryset = Voter.objects.all()
    serializer_class = VoterSerializer
    permission_classes = [AllowAny]
    