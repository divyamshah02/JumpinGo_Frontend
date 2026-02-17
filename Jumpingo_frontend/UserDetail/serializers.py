from rest_framework import serializers
from .models import User, OTPVerification

class UserSerializer(serializers.ModelSerializer):
    """
    Handles both reading user details and creating new users.
    Auto-generates user_id via model save().
    """

    # Read-only computed fields
    park_name = serializers.CharField(source='park.name', read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "user_id",
            "name",
            "email",
            "contact_number",
            "role",
            "park",
            "park_name",
            "is_active_user",
            "commission_rate",
            "created_at",
            "updated_at"
        ]
        read_only_fields = ["user_id", "created_at", "updated_at"]

    def validate(self, attrs):
        """Role-based validation rules"""
        role = attrs.get("role")
        park = attrs.get("park")

        if role in ["park_admin", "security", "ride_operator", "seller", "cash_counter"] and not park:
            raise serializers.ValidationError(
                {"park": "This role must be assigned to a park."}
            )

        if role == "super_admin" and park:
            raise serializers.ValidationError(
                {"park": "Super Admin should not be linked to a specific park."}
            )

        return attrs

    def create(self, validated_data):
        """
        Create user safely.
        Super Admin or Park Admin can create staff/sellers.
        """
        user = User.objects.create(**validated_data)
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    """
    For public-facing API (OTP login/profile view)
    """
    class Meta:
        model = User
        fields = ["user_id", "name", "contact_number", "role", "park"]
        read_only_fields = fields


class OTPVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for debugging / admin use only.
    """
    class Meta:
        model = OTPVerification
        fields = ["id", "mobile", "otp", "is_verified", "attempt_count", "created_at", "expires_at"]
        read_only_fields = ["id", "is_verified", "attempt_count", "created_at"]
