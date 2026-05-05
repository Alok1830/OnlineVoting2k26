from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Voter, Election, Candidate, Vote, OTP
from django.utils import timezone
from datetime import timedelta
import random

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class VoterSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Voter
        fields = ['id', 'aadhaar', 'full_name', 'mobile', 'email', 'role', 'profile_picture', 'is_verified', 'user', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']


class VoterRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Voter
        fields = ['aadhaar', 'full_name', 'mobile', 'email', 'role', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        voter = Voter.objects.create(**validated_data)
        
        if password:
            user = User.objects.create_user(
                username=voter.aadhaar,
                email=voter.email or '',
                password=password
            )
            voter.user = user
            voter.save()
        
        return voter


class CandidateSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()
    symbol_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Candidate
        fields = ['id', 'election', 'voter', 'name', 'party', 'symbol', 'symbol_url', 'description', 'manifesto', 'status', 'vote_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_symbol_url(self, obj):
        if obj.symbol:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.symbol.url)
            return obj.symbol.url
        return None


class CandidateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for candidates to update their own candidacy details."""
    class Meta:
        model = Candidate
        fields = ['party', 'description', 'manifesto', 'symbol']


class ElectionDetailSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    total_votes = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)
    
    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'status', 'start_date', 'end_date', 'candidates', 'total_votes', 'created_at']
        read_only_fields = ['id', 'created_at', 'status']
    
    def get_total_votes(self, obj):
        return obj.votes.count()


class ElectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = ['id', 'title', 'description', 'status', 'start_date', 'end_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class VoteSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.name', read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)
    voter_aadhaar = serializers.CharField(source='voter.aadhaar', read_only=True)
    
    class Meta:
        model = Vote
        fields = ['id', 'election', 'candidate', 'candidate_name', 'election_title', 'voter_aadhaar', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def create(self, validated_data):
        voter = self.context['request'].voter
        election = validated_data['election']
        candidate = validated_data['candidate']
        
        # Check if the election is currently active and within time limits
        now = timezone.now()
        if election.status != 'active':
            raise serializers.ValidationError("This election is not currently active.")
        if not (election.start_date <= now <= election.end_date):
            raise serializers.ValidationError("Voting is closed for this election. The current time is outside the election's start and end dates.")

        # Check if voter already voted in this election
        if Vote.objects.filter(election=election, voter=voter).exists():
            raise serializers.ValidationError("You have already voted in this election.")
        
        # Check if candidate belongs to this election
        if candidate.election != election:
            raise serializers.ValidationError("Candidate does not belong to this election.")
        
        vote = Vote.objects.create(
            election=election,
            candidate=candidate,
            voter=voter
        )
        return vote


class OTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTP
        fields = ['aadhaar', 'otp_code']
        read_only_fields = ['otp_code']
    
    def create(self, validated_data):
        aadhaar = validated_data['aadhaar']
        # Generate OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Delete old OTPs
        OTP.objects.filter(aadhaar=aadhaar).delete()
        
        # Create new OTP (valid for 10 minutes)
        otp = OTP.objects.create(
            aadhaar=aadhaar,
            otp_code=otp_code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        return otp
