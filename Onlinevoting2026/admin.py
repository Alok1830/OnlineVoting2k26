from django.contrib import admin
from .models import Voter, Election, Candidate, Vote, OTP

@admin.register(Voter)
class VoterAdmin(admin.ModelAdmin):
    list_display = ('aadhaar', 'full_name', 'role', 'is_verified', 'created_at')
    list_filter = ('role', 'is_verified', 'created_at')
    search_fields = ('aadhaar', 'full_name', 'email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status', 'start_date')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'party', 'election', 'created_at')
    list_filter = ('election', 'party')
    search_fields = ('name', 'party')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'voter', 'candidate', 'election', 'timestamp')
    list_filter = ('election', 'timestamp')
    search_fields = ('voter__aadhaar', 'candidate__name')
    readonly_fields = ('id', 'timestamp')


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('aadhaar', 'is_verified', 'created_at', 'expires_at')
    list_filter = ('is_verified', 'created_at')
    search_fields = ('aadhaar',)
    readonly_fields = ('id', 'created_at')
