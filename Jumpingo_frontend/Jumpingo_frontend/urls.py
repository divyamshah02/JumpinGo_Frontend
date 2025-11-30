from django.contrib import admin
from django.conf import settings
from django.urls import path, include
from django.conf.urls.static import static
from django.views.generic import RedirectView
from .views import *

urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url='/static/small_logo.png')),
    path('admin/', admin.site.urls),

    path('', home, name='home'),
    path('about', about, name='about'),
    path('attractions', attractions, name='attractions'),
    path('contact', contact, name='contact'),
    path('ticket', ticket, name='ticket'),
    path('privacy_policy', privacy_policy, name='privacy_policy'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
