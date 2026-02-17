from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'booking-api', BookingViewSet, basename='booking-api')
router.register(r'check-in-api', CheckInViewSet, basename='check-in-api')
router.register(r'qr-verify-api', QRVerificationViewSet, basename='qr-verify-api')
router.register(r'ride-scanner-api', RideScannerViewSet, basename='ride-scanner-api')
router.register(r'addon-api', AddOnViewSet, basename='addon-api')
router.register(r'socks-scanner-api', SocksScannerViewSet, basename='socks-scanner-api')
router.register(r'prebooking-api', PreBookingViewSet, basename='prebooking-api')

urlpatterns = [
    path('', include(router.urls)),
]
