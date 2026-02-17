from rest_framework import serializers
from .models import Booking, BookingRideAccess, PreBooking
from Park.models import Park, Ride


class BookingRideAccessSerializer(serializers.ModelSerializer):
    """Serializer for BookingRideAccess."""
    ride_name = serializers.CharField(source="ride.name", read_only=True)
    park_name = serializers.CharField(source="ride.park.name", read_only=True)
    remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = BookingRideAccess
        fields = [
            "id", "ride", "ride_name", "park_name",
            "total_allowed", "used_count", "remaining",
            "is_addon", "last_scanned_by", "last_scanned_at",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "remaining", "created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    """Serializer for main Booking model."""
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    customer_contact = serializers.CharField(source="customer.contact_number", read_only=True)
    park_name = serializers.CharField(source="park.name", read_only=True)
    ride_access = BookingRideAccessSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id", "booking_id", "park", "park_name",
            "customer", "customer_name", "customer_contact",
            "visit_date", "num_people",
            "total_amount", "payment_status", "payment_method",
            "sold_from", "sold_by", "commission_rate", "commission_amount",
            "qr_code_path",
            "checked_in", "checkedin_at", "entered", "entered_at",
            "entry_scanned", "entryscanned_at", "scanned_by",
            "ride_access", "created_at"
        ]
        read_only_fields = ["id", "booking_id", "created_at"]

    def create(self, validated_data):
        booking = Booking.objects.create(**validated_data)
        # Automatically create ride access for all PAID rides
        from Park.models import Ride
        paid_rides = Ride.objects.filter(park=booking.park, access_type="paid")
        for ride in paid_rides:
            BookingRideAccess.objects.create(
                booking=booking,
                ride=ride,
                total_allowed=booking.num_people
            )
        return booking


class PreBookingSerializer(serializers.ModelSerializer):
    """Serializer for pre-booking window."""
    park_name = serializers.CharField(source="park.name", read_only=True)
    confirmed_by_name = serializers.CharField(source="confirmed_by.name", read_only=True)

    class Meta:
        model = PreBooking
        fields = [
            "id", "prebooking_id", "park", "park_name",
            "customer_name", "customer_number", "num_people", "visit_date",
            "status", "booking", "notes",
            "created_at", "confirmed_at", "confirmed_by", "confirmed_by_name"
        ]
        read_only_fields = ["id", "prebooking_id", "booking", "created_at", "confirmed_at", "confirmed_by", "confirmed_by_name"]
