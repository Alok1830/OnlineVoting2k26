from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from django.conf import settings
from django.conf.urls.static import static

# API Router
router = DefaultRouter()
router.register(r'elections', views.ElectionViewSet, basename='election')
router.register(r'candidates', views.CandidateViewSet, basename='candidate')
router.register(r'votes', views.VoteViewSet, basename='vote')
router.register(r'voters', views.VoterViewSet, basename='voter')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Web Pages
    path('', views.landing_page, name='landing_page'),
    path('login/', views.login, name='login'),
    path('registration/', views.registration, name='registration'),
    path('admin_panel/', views.admin_panel, name='admin_panel'),
    path('voter_panel/', views.voter_panel, name='voter_panel'),
    path('profile/', views.profile, name='profile'),
    
    # API Endpoints
    path('api/', include(router.urls)),
    path('api/request-otp/', views.request_otp, name='request_otp'),
    path('api/request-registration-otp/', views.request_registration_otp, name='request_registration_otp'),
    path('api/register/', views.register_voter, name='register_voter'),
    path('api/login/', views.login_voter, name='login_voter'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
