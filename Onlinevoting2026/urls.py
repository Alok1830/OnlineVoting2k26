from django.contrib import admin
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.login, name='login'),
    path('registration/', views.registration, name='registration'),
    path('admin_panel/', views.admin_panel, name='admin_panel'),
    path('voter_panel/', views.voter_panel, name='voter_panel'),
    path('profile/', views.profile, name='profile'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])