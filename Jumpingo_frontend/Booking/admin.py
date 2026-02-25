from django.contrib import admin
from .models import Booking, BookingRideAccess, AddOn, PreBooking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "booking_id", "customer", "park", "visit_date", "total_amount", 
        "num_people", "payment_status", "payment_method",
        "checked_in", "entered", "is_active_display", "created_at"
    )
    list_filter = ("payment_status", "payment_method", "checked_in", "entered", "park")
    search_fields = ("booking_id", "customer__name", "customer__contact_number", "park__name")
    ordering = ("-created_at",)
    readonly_fields = ("booking_id", "created_at", "entryscanned_at", "entered_at", "checkedin_at")

    def is_active_display(self, obj):
        return obj.park.is_active
    is_active_display.short_description = "Park Active"

@admin.register(PreBooking)
class PreBookingAdmin(admin.ModelAdmin):
    list_display = (
        "prebooking_id", "customer_name", "customer_number",  "visit_date",
        "num_people", "created_at"
    )
    search_fields = ("prebooking_id", "customer_name", "customer_number", "park__name")
    # ordering = ("-created_at",)
    # readonly_fields = ("prebooking_id", "created_at")

@admin.register(BookingRideAccess)
class BookingRideAccessAdmin(admin.ModelAdmin):
    list_display = (
        "booking", "ride", "total_allowed", "used_count",
        "remaining", "is_addon", "last_scanned_by", "last_scanned_at"
    )
    list_filter = ("is_addon", "ride__access_type", "ride__park")
    search_fields = ("booking__booking_id", "ride__name", "booking__customer__name")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = (
        "addon_id", "booking", "ride", "additional_entries", "price_per_entry", "total_amount",
        "payment_status", "payment_method", "sold_by", "created_at"
    )
    list_filter = ("payment_status", "payment_method", "ride__access_type", "booking__park")
    search_fields = ("addon_id", "booking__booking_id", "ride__name", "sold_by__name")
    ordering = ("-created_at",)
    readonly_fields = ("addon_id", "created_at")
    
    def save_model(self, request, obj, form, change):
        """Override save to automatically assign the current user as the 'sold_by'."""
        if not obj.sold_by and request.user.role == "cash_counter":
            obj.sold_by = request.user
        super().save_model(request, obj, form, change)

    def __str__(self):
        return f"{self.addon_id} - {self.ride.name} (+{self.additional_entries} entries)"