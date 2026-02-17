from rest_framework import serializers
from .models import Park, Ride


class ParkSerializer(serializers.ModelSerializer):
    """Serializer for Park model."""
    class Meta:
        model = Park
        fields = [
            "id", "park_id", "name", "location",
            "is_active", "created_at"
        ]
        read_only_fields = ["id", "park_id", "created_at"]


class RideSerializer(serializers.ModelSerializer):
    """Serializer for Ride model."""
    park_name = serializers.CharField(source="park.name", read_only=True)

    class Meta:
        model = Ride
        fields = [
            "id", "ride_id", "name", "park", "park_name",
            "access_type", "price",
            "is_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "ride_id", "created_at", "updated_at"]
