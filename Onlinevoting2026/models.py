from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
import uuid

class Voter(models.Model):
    ROLE_CHOICES = [
        ('voter', 'Voter'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    aadhaar = models.CharField(
        max_length=12,
        unique=True,
        validators=[RegexValidator(r'^\d{12}$', 'Aadhaar must be 12 digits')]
    )
    full_name = models.CharField(max_length=255)
    mobile = models.CharField(
        max_length=10,
        validators=[RegexValidator(r'^\d{10}$', 'Mobile must be 10 digits')]
    )
    email = models.EmailField(blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='voter')
    profile_picture = models.URLField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.aadhaar})"


class Election(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_by = models.ForeignKey(Voter, on_delete=models.SET_NULL, null=True, related_name='elections_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    name = models.CharField(max_length=255)
    party = models.CharField(max_length=255, blank=True)
    symbol = models.ImageField(upload_to='party_symbols/', blank=True, null=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('election', 'name')

    def __str__(self):
        return f"{self.name} - {self.election.title}"


class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='votes')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(Voter, on_delete=models.CASCADE, related_name='votes')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('election', 'voter')
        ordering = ['-timestamp']

    def __str__(self):
        return f"Vote by {self.voter.aadhaar} in {self.election.title}"


class OTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aadhaar = models.CharField(max_length=12)
    otp_code = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"OTP for {self.aadhaar}"
