from django.db import models
from django.utils import timezone
from django.conf import settings

import random
import string

from Park.models import Park, Ride


def generate_unique_id(prefix, model, field_name):
    """Generate a unique prefixed ID for any model field."""
    while True:
        random_digits = ''.join(random.choices(string.digits, k=10))
        unique_id = f"{prefix}{random_digits}"
        if not model.objects.filter(**{field_name: unique_id}).exists():
            return unique_id


# ----------------------------- BOOKING MODEL -----------------------------

class Booking(models.Model):
    """Represents a full customer booking (acts as the ticket)."""

    booking_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    park = models.ForeignKey("Park.Park", on_delete=models.CASCADE, related_name="bookings")

    # Linked Customer (User)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_bookings", limit_choices_to={"role": "customer"})

    visit_date = models.DateField()
    num_people = models.PositiveIntegerField(default=1)

    # Payment Info
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=[("pending", "Pending"), ("success", "Success"), ("failed", "Failed")], default="pending")
    payment_method = models.CharField(max_length=20, choices=[("online", "Online"), ("cash", "Cash")], default="cash")

    # Seller / Source Info
    sold_from = models.CharField(max_length=20, choices=[("cash_counter", "Cash Counter"), ("external_seller", "External Seller"), ("website", "Website")], null=True, blank=True)
    sold_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="sold_bookings", limit_choices_to={"role__in": ["seller", "cash_counter"]})
    sale_confirmed = models.BooleanField(default=False)

    # Commission (for sellers)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_paid = models.BooleanField(default=False)

    # Invite tracking fields
    is_an_invite = models.BooleanField(default=False)
    reference = models.CharField(max_length=255, blank=True, null=True, help_text="Reference for invite bookings (e.g. inviter's name or contact)")
    other_reference = models.CharField(max_length=255, blank=True, null=True, help_text="Additional reference info for invite bookings")

    # QR Code
    qr_code_path = models.CharField(max_length=255, null=True, blank=True)

    # Entry / Check-In Tracking
    checked_in = models.BooleanField(default=False)
    checkedin_at = models.DateTimeField(null=True, blank=True)

    entered = models.BooleanField(default=False)
    entered_at = models.DateTimeField(null=True, blank=True)

    entry_scanned = models.BooleanField(default=False)
    entryscanned_at = models.DateTimeField(null=True, blank=True)

    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="scanned_bookings",
        limit_choices_to={"role": "security"}
    )

    total_arrived = models.PositiveIntegerField(default=0)

    socks_collected = models.PositiveIntegerField(default=0)
    socks_small = models.PositiveIntegerField(default=0)
    socks_medium = models.PositiveIntegerField(default=0)
    socks_large = models.PositiveIntegerField(default=0)
    socks_xlarge = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        """Auto-generate booking_id like BKXXXXXXXXXX"""
        if not self.booking_id:
            self.booking_id = generate_unique_id(prefix="BK", model=Booking, field_name="booking_id")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_id} ({self.customer.name})"


# ----------------------------- RIDE ACCESS MODEL -----------------------------

class BookingRideAccess(models.Model):
    """Tracks ride access usage per booking."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="ride_access")
    ride = models.ForeignKey(Ride, on_delete=models.CASCADE)

    total_allowed = models.PositiveIntegerField(default=0)
    used_count = models.PositiveIntegerField(default=0)

    last_scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ride_scans",
        limit_choices_to={"role": "ride_operator"}
    )
    last_scanned_at = models.DateTimeField(null=True, blank=True)
    is_addon = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def remaining(self):
        return max(self.total_allowed - self.used_count, 0)

    def __str__(self):
        return f"{self.ride.name} - {self.booking.booking_id} ({self.remaining} left)"


# ----------------------------- ADDON MODEL -----------------------------

class AddOn(models.Model):
    """Tracks additional ride access purchases made after initial booking."""
    addon_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="addons")
    ride = models.ForeignKey(Ride, on_delete=models.CASCADE)
    
    # Source tracking
    source = models.CharField(
        max_length=20,
        choices=[("website", "Website"), ("cash_counter", "Cash Counter")],
        default="cash_counter"
    )
    sold_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="addon_sales",
        limit_choices_to={"role": "cash_counter"}
    )
    
    # Purchase details
    additional_entries = models.PositiveIntegerField(default=0)
    price_per_entry = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    payment_method = models.CharField(
        max_length=20,
        choices=[("cash", "Cash"), ("online", "Online")],
        default="cash"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("success", "Success"), ("failed", "Failed")],
        default="success"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    
    def save(self, *args, **kwargs):
        """Auto-generate addon_id like ADXXXXXXXXXX"""
        if not self.addon_id:
            self.addon_id = generate_unique_id(prefix="AO", model=AddOn, field_name="addon_id")
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.addon_id} - {self.ride.name} (+{self.additional_entries} entries)"


# ----------------------------- PRE-BOOKING MODEL -----------------------------

class PreBooking(models.Model):
    """Represents a pre-booking window entry before cash counter payment."""
    prebooking_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    park = models.ForeignKey("Park.Park", on_delete=models.CASCADE, related_name="prebookings")

    # Customer Information
    customer_name = models.CharField(max_length=255)
    customer_number = models.CharField(max_length=15)
    num_people = models.PositiveIntegerField(default=1)
    visit_date = models.DateField()
    is_an_invite = models.BooleanField(default=False)
    reference = models.CharField(max_length=255, blank=True, null=True, help_text="Reference for invite pre-bookings (e.g. inviter's name or contact)")
    other_reference = models.CharField(max_length=255, blank=True, null=True, help_text="Additional reference info for invite pre-bookings")
    is_booked = models.BooleanField(default=False)  # Indicates if this pre-booking has been converted to a full booking
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected"), ("confirmed", "Confirmed"), ("cancelled", "Cancelled"), ("expired", "Expired")],
        default="pending"
    )

    # Invite approval by admin (only for invite pre-bookings)
    approval_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")],
        default="pending",
        help_text="Admin approval status for invite pre-bookings"
    )
    approved_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount approved by admin for invite pre-booking (0 or any amount for discount)"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_invite_prebookings",
        limit_choices_to={"role": "park_admin"}
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejecting invite pre-booking")

    # Booking conversion
    booking = models.OneToOneField(
        Booking,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="from_prebooking"
    )

    # Optional notes
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="confirmed_prebookings",
        limit_choices_to={"role": "cash_counter"}
    )

    def save(self, *args, **kwargs):
        """Auto-generate prebooking_id like PBXXXXXXXXXX"""
        if not self.prebooking_id:
            self.prebooking_id = generate_unique_id(prefix="PB", model=PreBooking, field_name="prebooking_id")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prebooking_id} - {self.customer_name} ({self.visit_date})"
