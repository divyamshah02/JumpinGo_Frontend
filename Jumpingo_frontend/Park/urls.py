from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ParkViewSet, RideViewSet

router = DefaultRouter()
router.register(r'parks-api', ParkViewSet, basename='parks')
router.register(r'rides-api', RideViewSet, basename='rides')

urlpatterns = [
    path('', include(router.urls)),
]
