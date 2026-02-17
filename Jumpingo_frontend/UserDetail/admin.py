from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPVerification

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("user_id", "username", "contact_number", "name", "role", "park", "is_active_user", "created_at")
    list_filter = ("role", "park", "is_active_user")
    search_fields = ("user_id", "contact_number", "name", "email")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("contact_number", "password")}),
        ("Personal info", {"fields": ("name", "email", "role", "park", "user_id", "commission_rate")}),
        ("Status", {"fields": ("is_active_user", "is_staff", "is_superuser")}),
    )

@admin.register(OTPVerification)
class OtpAdmin(admin.ModelAdmin):
    list_display = ('mobile', 'otp', 'is_verified', 'attempt_count', 'expires_at')
