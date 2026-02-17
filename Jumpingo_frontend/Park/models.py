from django.db import models
from django.utils import timezone
import random
import string


def generate_unique_id(prefix, model, field_name):
    """Generate a unique prefixed ID for any model field."""
    while True:
        random_digits = ''.join(random.choices(string.digits, k=6))
        unique_id = f"{prefix}{random_digits}"
        if not model.objects.filter(**{field_name: unique_id}).exists():
            return unique_id


class Park(models.Model):
    park_id = models.CharField(max_length=12, unique=True, blank=True, null=True)
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        """Auto-generate park_id like PK123456"""
        if not self.park_id:
            self.park_id = generate_unique_id(prefix="PK", model=Park, field_name="park_id")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.park_id})"


class Ride(models.Model):
    ACCESS_TYPE = (
        ("free", "Free"),
        ("paid", "Paid")        
    )
    access_type = models.CharField(max_length=32, choices=ACCESS_TYPE, default='free')   
    ride_id = models.CharField(max_length=12, unique=True, blank=True, null=True)
    park = models.ForeignKey(Park, on_delete=models.CASCADE, related_name="rides")

    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Auto-generate ride_id like RD123456"""
        if not self.ride_id:
            self.ride_id = generate_unique_id(prefix="RD", model=Ride, field_name="ride_id")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.ride_id})"


