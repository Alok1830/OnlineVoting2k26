from django.shortcuts import render

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
    