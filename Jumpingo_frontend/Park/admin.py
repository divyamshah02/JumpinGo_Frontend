from django.contrib import admin
from .models import Park, Ride


@admin.register(Park)
class ParkAdmin(admin.ModelAdmin):
    list_display = ("park_id", "name", "location", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("park_id", "name", "location")
    ordering = ("-created_at",)
    readonly_fields = ("park_id", "created_at")


@admin.register(Ride)
class RideAdmin(admin.ModelAdmin):
    list_display = (
        "ride_id", "name", "park", "access_type", "price",
        "is_active", "created_at", "updated_at"
    )
    list_filter = ("access_type", "is_active", "park")
    search_fields = ("ride_id", "name", "park__name")
    ordering = ("-created_at",)
    readonly_fields = ("ride_id", "created_at", "updated_at")
