from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
# router.register(r'', HomeViewSet, basename='home')

router.register(r'booking', BookingViewSet, basename='booking')
router.register(r'check-in', CheckInViewSet, basename='check-in')
router.register(r'account', AccountViewSet, basename='account')

router.register(r'login_jo', LoginViewSet, basename='login')
router.register(r'logout', LogoutViewSet, basename='logout')

router.register(r'security_scanner', SecurityScannerViewSet, basename='security_scanner')
router.register(r'ride_scanner', RideScannerViewSet, basename='ride_scanner')
router.register(r'sock_scanner', SocksScannerViewSet, basename='sock_scanner')

router.register(r'admin_dashboard', AdminDashboardViewSet, basename='admin_dashboard')
router.register(r'seller_dashboard', SellerDashboardViewSet, basename='seller_dashboard')
router.register(r'prebooking', PreBookingViewSet, basename='prebooking')
router.register(r'invite_prebooking', InvitePreBookingViewSet, basename='invite_prebooking')

urlpatterns = [
    path('', include(router.urls)),
]

