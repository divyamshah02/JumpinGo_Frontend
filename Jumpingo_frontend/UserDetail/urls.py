from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'otp-api', OtpAuthViewSet, basename='otp-api')
router.register(r'internal-login-api', InternalLoginAuthViewSet, basename='internal-login-api')
router.register(r'is-user-logged-in-api', IsUserLoggedInViewSet, basename='is-user-logged-in-api')
router.register(r'update-user-api', UserDetailViewSet, basename='update-user-api')
router.register(r'user-profile-api', UserProfileViewSet, basename='user-profile-api')

router.register(r'admin-api', AdminDashboardViewSet, basename='admin-api')
router.register(r'seller-api', SellerDashboardViewSet, basename='seller-api')
router.register(r'account-api', CustomerAccountViewSet, basename='account-api')

urlpatterns = [
    path('', include(router.urls)),
]
