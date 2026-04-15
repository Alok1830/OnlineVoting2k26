from django.shortcuts import render
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Voter, Election, Candidate, Vote, OTP
from .serializers import (
    VoterSerializer, VoterRegistrationSerializer, 
    ElectionSerializer, ElectionDetailSerializer,
    CandidateSerializer, VoteSerializer, OTPSerializer
)
from .sms_utils import send_otp_sms
import jwt
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Template Views
def landing_page(request):
    return render(request, "landing_page.html")

def login(request):
    return render(request, "login.html")

def registration(request):
    return render(request, "registration.html")

def admin_panel(request):
    return render(request, "admin_panel.html")

def voter_panel(request):
    return render(request, "voter_panel.html")

def profile(request):
    return render(request, "profile.html")


# API Views
@api_view(['POST'])
def request_otp(request):
    """Generate and send OTP to aadhaar via SMS"""
    aadhaar = request.data.get('aadhaar')
    
    logger.info(f"Login OTP request for Aadhaar: {aadhaar}")
    
    if not aadhaar or len(aadhaar) != 12:
        logger.warning(f"Invalid Aadhaar format: {aadhaar}")
        return Response(
            {'error': 'Invalid Aadhaar number'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if voter exists
    try:
        voter = Voter.objects.get(aadhaar=aadhaar)
    except Voter.DoesNotExist:
        logger.warning(f"Aadhaar {aadhaar} not found in system")
        return Response(
            {'error': 'Aadhaar not found. Please register first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate OTP
    serializer = OTPSerializer(data={'aadhaar': aadhaar})
    if serializer.is_valid():
        otp = serializer.save()
        logger.info(f"OTP generated for {aadhaar}: {otp.otp_code}")
        
        # Send OTP via Twilio SMS
        phone_number = f"+91{voter.mobile}" if not voter.mobile.startswith('+') else voter.mobile
        logger.info(f"Sending SMS to {phone_number}")
        
        success, result = send_otp_sms(phone_number, otp.otp_code)
        
        if success:
            logger.info(f"✓ OTP sent successfully. Message SID: {result}")
            return Response({
                'message': 'OTP sent to your registered mobile number',
                'otp_code': otp.otp_code  # For development/testing only - remove in production
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"✗ Failed to send SMS: {result}")
            return Response(
                {'error': f'Failed to send OTP. Error: {result}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    logger.error(f"OTP serialization failed: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def register_voter(request):
    """Register a new voter"""
    aadhaar = request.data.get('aadhaar')
    otp_code = request.data.get('otp_code')
    
    # Verify OTP
    try:
        otp = OTP.objects.get(aadhaar=aadhaar, otp_code=otp_code)
        if otp.expires_at < timezone.now():
            return Response(
                {'error': 'OTP expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except OTP.DoesNotExist:
        return Response(
            {'error': 'Invalid OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Register voter
    serializer = VoterRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        voter = serializer.save(is_verified=True)
        otp.is_verified = True
        otp.save()
        return Response(VoterSerializer(voter).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_voter(request):
    """Login voter with aadhaar and OTP"""
    aadhaar = request.data.get('aadhaar')
    otp_code = request.data.get('otp_code')
    
    # Verify OTP
    try:
        otp = OTP.objects.get(aadhaar=aadhaar, otp_code=otp_code)
        if otp.expires_at < timezone.now():
            return Response(
                {'error': 'OTP expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except OTP.DoesNotExist:
        return Response(
            {'error': 'Invalid OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        voter = Voter.objects.get(aadhaar=aadhaar, is_verified=True)
        voter_data = VoterSerializer(voter).data
        
        # Generate JWT token
        payload = {
            'voter_id': str(voter.id),
            'aadhaar': voter.aadhaar,
            'role': voter.role
        }
        token = jwt.encode(payload, 'your-secret-key', algorithm='HS256')
        
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


@api_view(['POST'])
def request_registration_otp(request):
    """Generate and send OTP for new voter registration"""
    aadhaar = request.data.get('aadhaar')
    mobile = request.data.get('mobile')
    
    logger.info(f"Registration OTP request for Aadhaar: {aadhaar}")
    
    if not aadhaar or len(aadhaar) != 12:
        logger.warning(f"Invalid Aadhaar format: {aadhaar}")
        return Response(
            {'error': 'Invalid Aadhaar number. Must be 12 digits.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not mobile or len(mobile) != 10:
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
            logger.info(f"✓ OTP sent successfully. Message SID: {result}")
            return Response({
                'message': 'OTP sent to your mobile number',
                'otp_code': otp.otp_code  # For development/testing only
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"✗ Failed to send SMS: {result}")
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
        """Get election results"""
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
    