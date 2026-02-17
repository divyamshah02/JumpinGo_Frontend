from rest_framework import viewsets, status
from rest_framework.response import Response

from utils.decorators import handle_exceptions, check_authentication

from .models import Park, Ride
from .serializers import ParkSerializer, RideSerializer


class ParkViewSet(viewsets.ViewSet):
    """
    CRUD for Park.
    Accessible only to super_admin.
    """

    @handle_exceptions
    @check_authentication(required_role="super_admin")
    def list(self, request):
        parks = Park.objects.all().order_by("-created_at")
        serializer = ParkSerializer(parks, many=True)
        return Response({
            "success": True, "user_not_logged_in": False,
            "user_unauthorized": False, "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role="super_admin")
    def create(self, request):
        serializer = ParkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False, "user_not_logged_in": False,
                "user_unauthorized": False, "data": None, "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        park = serializer.save()
        return Response({
            "success": True, "user_not_logged_in": False,
            "user_unauthorized": False, "data": ParkSerializer(park).data, "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    @check_authentication(required_role="super_admin")
    def update(self, request, pk=None):
        try:
            park = Park.objects.get(pk=pk)
        except Park.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Park not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        serializer = ParkSerializer(park, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({
                "success": False, "data": None, "error": serializer.errors,
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response({
            "success": True, "data": serializer.data, "error": None,
            "user_not_logged_in": False, "user_unauthorized": False
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role="super_admin")
    def delete(self, request, pk=None):
        try:
            park = Park.objects.get(pk=pk)
        except Park.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Park not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        park.delete()
        return Response({
            "success": True, "data": "Park deleted successfully.", "error": None,
            "user_not_logged_in": False, "user_unauthorized": False
        }, status=status.HTTP_200_OK)


class RideViewSet(viewsets.ViewSet):
    """
    CRUD for Ride.
    Accessible to super_admin and park_admin.
    """

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    def list(self, request):
        user = request.user
        rides = Ride.objects.all().order_by("-created_at")
        if user.role == "park_admin":
            rides = rides.filter(park=user.park)
        serializer = RideSerializer(rides, many=True)
        return Response({
            "success": True, "user_not_logged_in": False,
            "user_unauthorized": False, "data": serializer.data, "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    def create(self, request):
        user = request.user
        data = request.data.copy()
        if user.role == "park_admin":
            data["park"] = user.park.id
        serializer = RideSerializer(data=data)
        if not serializer.is_valid():
            return Response({
                "success": False, "data": None, "error": serializer.errors,
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_400_BAD_REQUEST)
        ride = serializer.save()
        return Response({
            "success": True, "data": RideSerializer(ride).data, "error": None,
            "user_not_logged_in": False, "user_unauthorized": False
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    def update(self, request, pk=None):
        try:
            ride = Ride.objects.get(pk=pk)
        except Ride.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Ride not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        if user.role == "park_admin" and ride.park_id != user.park_id:
            return Response({
                "success": False, "data": None, "error": "Unauthorized ride update.",
                "user_not_logged_in": False, "user_unauthorized": True
            }, status=status.HTTP_403_FORBIDDEN)
        serializer = RideSerializer(ride, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({
                "success": False, "data": None, "error": serializer.errors,
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response({
            "success": True, "data": serializer.data, "error": None,
            "user_not_logged_in": False, "user_unauthorized": False
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    def delete(self, request, pk=None):
        try:
            ride = Ride.objects.get(pk=pk)
        except Ride.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Ride not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        ride.delete()
        return Response({
            "success": True, "data": "Ride deleted successfully.", "error": None,
            "user_not_logged_in": False, "user_unauthorized": False
        }, status=status.HTTP_200_OK)
