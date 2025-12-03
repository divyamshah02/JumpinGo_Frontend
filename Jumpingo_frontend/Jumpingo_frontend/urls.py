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
    path('get_in_touch', get_in_touch, name='get_in_touch'),
    path('ticket', ticket, name='ticket'),
    path('privacy_policy', privacy_policy, name='privacy_policy'),
    
    path('send_contact_email_req', send_contact_email_req, name='send_contact_email_req'),
    path('send_booking_email_req', send_booking_email_req, name='send_booking_email_req'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
