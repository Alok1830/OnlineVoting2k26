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
    path('admin-login/', views.admin_login_page, name='admin_login_page'),
    path('registration/', views.registration, name='registration'),
    path('admin_panel/', views.admin_panel, name='admin_panel'),
    path('voter_panel/', views.voter_panel, name='voter_panel'),
    path('candidate_panel/', views.candidate_panel, name='candidate_panel'),
    path('profile/', views.profile, name='profile'),
    
    # API Endpoints
    path('api/', include(router.urls)),
    path('api/request-otp/', views.request_otp, name='request_otp'),
    path('api/request-registration-otp/', views.request_registration_otp, name='request_registration_otp'),
    path('api/register/', views.register_voter, name='register_voter'),
    path('api/login/', views.login_voter, name='login_voter'),
    path('api/admin-login/', views.admin_login, name='admin_login'),
    path('api/my-candidacies/', views.my_candidacies, name='my_candidacies'),
    path('api/candidacies/<uuid:candidacy_id>/update/', views.update_candidacy, name='update_candidacy'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
