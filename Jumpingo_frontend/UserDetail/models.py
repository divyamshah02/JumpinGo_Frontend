from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid
import random
import string
from datetime import timedelta

def generate_user_id(role_code):
    """Generate unique role-prefixed user ID"""
    while True:
        digits = ''.join(random.choices(string.digits, k=10))
        user_id = f"{role_code}{digits}"
        if not User.objects.filter(user_id=user_id).exists():
            return user_id

class User(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("park_admin", "Park Admin"),
        ("security", "Security Staff"),
        ("ride_operator", "Ride Operator"),
        ("socks_handler", "Socks Handler"),
        ("seller", "External Seller"),
        ("cash_counter", "Cash Counter"),
        ("pre_booker", "Pre Booker"),
        ("customer", "Customer"),
    ]

    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default="customer")

    park = models.ForeignKey(
        "Park.Park",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Linked park for staff/seller roles"
    )

    contact_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(null=True, blank=True)
    name = models.CharField(max_length=255, blank=True, default="")
    user_id = models.CharField(max_length=16, unique=True, null=True, blank=True)

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, null=True, blank=True)

    is_active_user = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "contact_number"
    REQUIRED_FIELDS = ["role", "username"]

    def __str__(self):
        return f"{self.name or self.contact_number} ({self.role})"

    def save(self, *args, **kwargs):
        if not self.user_id:
            role_codes = {
                "super_admin": "SA",
                "park_admin": "PA",
                "security": "SE",
                "ride_operator": "RO",
                "socks_handler": "SH",
                "seller": "SL",
                "cash_counter": "CC",
                "pre_booker": "PB",
                "customer": "CU",
            }
            code = role_codes.get(self.role, "XX")
            self.user_id = generate_user_id(code)
            self.username = self.user_id
        super().save(*args, **kwargs)


class OTPVerification(models.Model):
    mobile = models.CharField(max_length=15)
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.mobile} - {self.otp}"
