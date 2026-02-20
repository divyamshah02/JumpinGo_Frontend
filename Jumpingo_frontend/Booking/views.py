from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action

from utils.decorators import handle_exceptions, check_authentication

from Park.models import Park, Ride
from .models import Booking, BookingRideAccess, AddOn, PreBooking
from .serializers import BookingSerializer, BookingRideAccessSerializer, PreBookingSerializer
from UserDetail.models import User

from django.conf import settings
from django.utils import timezone
from django.db import models

import os
import qrcode



class BookingViewSet(viewsets.ViewSet):
    """
    Handle bookings:
    - list: all bookings (admin/seller)
    - create: new booking
    - update: modify booking or mark entry
    - delete: cancel booking (if ever needed)
    """

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "seller", "cash_counter"])
    def list(self, request):
        user = request.user
        if user.role in ["seller", "cash_counter"]:
            bookings = Booking.objects.filter(sold_by=user)
        elif user.role == "park_admin":
            bookings = Booking.objects.filter(park=user.park)
        else:
            bookings = Booking.objects.all()
        serializer = BookingSerializer(bookings.order_by("-created_at"), many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    # @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "seller", "cash_counter", "customer"])
    def create(self, request):        
        data = request.data.copy()
        user = request.user

        # Auto-fill sold_by and sold_from based on user role
        if user.role != 'customer':
            customer_exists = User.objects.filter(contact_number=data["customer_mobile"]).first()
            if customer_exists:
                data["customer"] = customer_exists.id
            else:
                User.objects.create(
                    contact_number=data["customer_mobile"],
                    role="customer",
                    name=data["customer_name"],
                    email=data["customer_email"]
                )
                customer_details = User.objects.filter(contact_number=data["customer_mobile"]).first()
                data["customer"] = customer_details.id
        else:
            user_data = User.objects.get(id=user.id)
            if user.name is None or user.name == "":
                user_data.name = data["customer_name"]
            if user.email is None or user.email == "":
                user_data.email = data["customer_email"]
            user_data.save()

        if user.role == "seller":
            data["sold_from"] = "external_seller"
            data["sold_by"] = user.id
            data["commission_rate"] = getattr(user, "commission_rate", 0)
            data["commission_amount"] = float(data["total_amount"]) * (float(getattr(user, "commission_rate", 0)) / 100)
        elif user.role == "cash_counter":
            data["sold_from"] = "cash_counter"
            data["sold_by"] = user.id
            data["commission_rate"] = 0
        else:
            data["sold_from"] = "website"
            data["sale_confirmed"] = True
            data["sold_by"] = None
            data["commission_rate"] = 0
            data["customer"] = user.id

        serializer = BookingSerializer(data=data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        booking = serializer.save()
        get_pre_booking = PreBooking.objects.filter(customer_number=booking.customer.contact_number, visit_date=booking.visit_date, is_booked=False).first()
        if get_pre_booking:
            get_pre_booking.is_booked = True
            get_pre_booking.save()
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": BookingSerializer(booking).data,
            "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "security"])
    def update(self, request, pk=None):
        """
        Used to update booking lifecycle (check-in, entry scan, etc.).
        """
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({
                "success": False, "data": None,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        action = data.get("action")

        # Check-in (QR generation)
        if action == "check_in":
            booking.checked_in = True
            booking.checkedin_at = timezone.now()

        # Entry scan
        elif action == "entry_scan":
            booking.entered = True
            booking.entered_at = timezone.now()
            booking.entry_scanned = True
            booking.entryscanned_at = timezone.now()
            booking.scanned_by = request.user

        # Any other updates
        else:
            serializer = BookingSerializer(booking, data=data, partial=True)
            if not serializer.is_valid():
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()

        booking.save()
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": BookingSerializer(booking).data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin"])
    def delete(self, request, pk=None):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Booking not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response({
            "success": True, "data": "Booking deleted successfully.",
            "user_not_logged_in": False, "user_unauthorized": False,
            "error": None
        }, status=status.HTTP_200_OK)



class CheckInViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    def create(self, request):
        """
        When customer arrives at the park:
        - Verify booking ID and last 4 digits of mobile
        - Generate QR code
        - Create ride access records
        - Mark booking as checked-in
        """
        try:
            requested_booking_id = request.data.get("booking_id")
            last_four_digits = request.data.get("last_four_digits")
            
            if not last_four_digits or len(last_four_digits) != 4:
                return Response({
                    "success": False, "data": None, 
                    "error": "Please provide last 4 digits of mobile number.",
                    "user_not_logged_in": False, "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            booking = Booking.objects.get(booking_id=requested_booking_id)
            
            customer_mobile = booking.customer.contact_number
            if not customer_mobile.endswith(last_four_digits):
                return Response({
                    "success": False, "data": None, 
                    "error": "Invalid booking details. Please check your booking ID and mobile number.",
                    "user_not_logged_in": False, "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Booking.DoesNotExist:
            return Response({
                "success": False, "data": None, "error": "Booking not found.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)

        # Validation
        if booking.checked_in:
            return Response({
                "success": False, "data": None, "error": "Booking already checked in.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_400_BAD_REQUEST)

        ist_time = timezone.localtime(timezone.now())  # Converts UTC to Asia/Kolkata

        if booking.visit_date != ist_time.date():
            return Response({
                "success": False, "data": None, "error": "Booking is not for today.",
                "user_not_logged_in": False, "user_unauthorized": False
            }, status=status.HTTP_400_BAD_REQUEST)

        # --- Step 1: Generate QR Payload ---
        qr_payload = {
            "booking_id": booking.booking_id,
            "customer_name": booking.customer.name,
            "customer_phone": booking.customer.contact_number,
            "num_people": booking.num_people,
            "park_id": booking.park.park_id,
            "visit_date": str(booking.visit_date),
        }

        # --- Step 2: Generate QR Code ---
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        qr_dir = os.path.join(settings.MEDIA_ROOT, "qr_codes")
        os.makedirs(qr_dir, exist_ok=True)
        qr_filename = f"{booking.booking_id}.png"
        qr_path = os.path.join(qr_dir, qr_filename)
        img.save(qr_path)

        qr_url = f"{settings.MEDIA_URL}qr_codes/{qr_filename}"

        # --- Step 3: Create Ride Access Records (ALL rides - both paid and free) ---
        all_rides = Ride.objects.filter(park=booking.park, is_active=True)
        for ride in all_rides:
            # For paid rides, set total_allowed to num_people only if not free
            if ride.access_type == "paid":
                BookingRideAccess.objects.get_or_create(
                    booking=booking,
                    ride=ride,
                    defaults={"total_allowed": booking.num_people}
                )
            else:
                # For free rides, set to 0 initially (will be updated when used)
                BookingRideAccess.objects.get_or_create(
                    booking=booking,
                    ride=ride,
                    defaults={"total_allowed": 0}
                )

        # --- Step 4: Update Booking ---
        booking.qr_code_path = qr_url
        booking.checked_in = True
        booking.checkedin_at = timezone.now()
        booking.save()

        # --- Step 5: Return Success Response ---
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": "Check-in successful. QR code generated.",
                "qr_url": qr_url,
                "booking": {
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "num_people": booking.num_people,
                    "visit_date": str(booking.visit_date),
                }
            },
            "error": None
        }, status=status.HTTP_200_OK)


class QRVerificationViewSet(viewsets.ViewSet):
    """
    Handle QR code verification for security staff at entry
    """
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "security"])
    def create(self, request):
        """
        Verify QR code by booking ID
        Returns booking details and remaining arrivals without updating
        """
        booking_id = request.data.get("booking_id")
        
        if not booking_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Invalid booking ID. Booking not found."
                },
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if booking is checked-in
        if not booking.checked_in:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Booking not checked-in. Please complete check-in first.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check if visit date is today
        ist_time = timezone.localtime(timezone.now())
        if booking.visit_date != ist_time.date():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Booking is for {booking.visit_date}, not today.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "visit_date": str(booking.visit_date),
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        remaining_arrivals = booking.num_people - booking.total_arrived
        
        if remaining_arrivals <= 0:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": True,
                    "all_arrived": True,
                    "message": "All people have already entered.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "customer_mobile": booking.customer.contact_number,
                    "num_people": booking.num_people,
                    "total_arrived": booking.total_arrived,
                    "remaining": 0,
                    "visit_date": str(booking.visit_date),
                    "park_name": booking.park.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "all_arrived": False,
                "message": f"{remaining_arrivals} people can enter",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "customer_mobile": booking.customer.contact_number,
                "num_people": booking.num_people,
                "total_arrived": booking.total_arrived,
                "remaining": remaining_arrivals,
                "visit_date": str(booking.visit_date),
                "park_name": booking.park.name,
                "payment_type": booking.payment_method,
                "total_amount": str(booking.total_amount),
            },
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "security"])
    @action(detail=False, methods=['post'])
    def record_arrival(self, request):
        """
        Record number of people entering after security confirmation
        """
        booking_id = request.data.get("booking_id")
        num_arriving = request.data.get("num_arriving")
        
        if not booking_id or not num_arriving:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID and number of people arriving are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            num_arriving = int(num_arriving)
            if num_arriving <= 0:
                raise ValueError("Number of people must be positive")
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid number of people."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        remaining_arrivals = booking.num_people - booking.total_arrived
        
        # Check if enough space for arriving people
        if num_arriving > remaining_arrivals:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Only {remaining_arrivals} people can enter. You tried to enter {num_arriving}.",
                    "remaining": remaining_arrivals,
                },
                "error": f"Not enough space. Only {remaining_arrivals} people allowed."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update total_arrived
        booking.total_arrived += num_arriving
        
        # Mark as entered if this is the first arrival
        if not booking.entered:
            booking.entered = True
            booking.entered_at = timezone.now()
            booking.entry_scanned = True
            booking.entryscanned_at = timezone.now()
            booking.scanned_by = request.user
        
        booking.save()
        
        new_remaining = booking.num_people - booking.total_arrived
        
        # Return success
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "message": f"Entry recorded for {num_arriving} people",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "people_entered": num_arriving,
                "num_people": booking.num_people,
                "total_arrived": booking.total_arrived,
                "remaining": new_remaining,
            },
            "error": None
        }, status=status.HTTP_200_OK)


class RideScannerViewSet(viewsets.ViewSet):
    """
    Handle ride access verification for ride operators
    """
    
    @handle_exceptions
    @check_authentication()
    @action(detail=False, methods=['get'])
    def paid_rides(self, request):
        """
        Get all rides (paid and free) for the park
        """
        user = request.user
        
        # Get rides based on user's park
        if hasattr(user, 'park') and user.park:
            rides = Ride.objects.filter(park=user.park, is_active=True)
        else:
            # If no park assigned, get all rides (for super_admin)
            rides = Ride.objects.filter(is_active=True)
        
        rides_data = [{
            "id": ride.id,
            "name": ride.name,
            "price": str(ride.price) if ride.price else "0",
            "is_paid": ride.access_type == "paid",  # Added ride type indicator
        } for ride in rides]
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": rides_data,
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "ride_operator"])
    def create(self, request):
        """
        Verify ride access by booking ID and ride ID
        Returns available people count without updating
        """
        booking_id = request.data.get("booking_id")
        ride_id = request.data.get("ride_id")
        
        if not booking_id or not ride_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID and Ride ID are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Invalid booking ID. Booking not found."
                },
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            ride = Ride.objects.get(id=ride_id)
        except Ride.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Invalid ride ID. Ride not found."
                },
                "error": "Ride not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if booking is checked-in
        if not booking.checked_in:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Booking not checked-in. Please complete check-in first.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check if customer has entered the park
        if not booking.entered:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Customer has not entered the park yet.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check if visit date is today
        ist_time = timezone.localtime(timezone.now())
        if booking.visit_date != ist_time.date():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Booking is for {booking.visit_date}, not today.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "visit_date": str(booking.visit_date),
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check ride access
        try:
            ride_access = BookingRideAccess.objects.get(booking=booking, ride=ride)
        except BookingRideAccess.DoesNotExist:
            if ride.access_type == "free":
                ride_access = BookingRideAccess.objects.create(
                    booking=booking,
                    ride=ride,
                    total_allowed=0
                )
            else:
                return Response({
                    "success": True,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": {
                        "verified": False,
                        "message": f"No access to {ride.name}. This ride is not included in the booking.",
                        "booking_id": booking.booking_id,
                        "customer_name": booking.customer.name,
                        "ride_name": ride.name,
                    },
            "error": None
        }, status=status.HTTP_200_OK)


# ----------------------------- PRE-BOOKING VIEWSET -----------------------------

class PreBookingViewSet(viewsets.ViewSet):
    """
    Handle pre-bookings:
    - list: view all pre-bookings (with search and filter)
    - create: create new pre-booking
    - update: confirm pre-booking to convert to actual booking
    """

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "pre_booker", "invi_pre_booker"])
    def list(self, request):
        user = request.user
        search_query = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        invite_only = request.query_params.get('is_invite', False)

        if user.role in ["cash_counter", "pre_booker"]:
            prebookings = PreBooking.objects.filter(park=user.park)
        elif user.role == "park_admin":
            prebookings = PreBooking.objects.filter(park=user.park)
        elif user.role == "invi_pre_booker":
            prebookings = PreBooking.objects.filter(park=user.park, is_an_invite=True)
        else:
            prebookings = PreBooking.objects.all()
        
        if invite_only:
            prebookings = prebookings.filter(is_an_invite=True)

        # Search by customer name or number
        if search_query:
            prebookings = prebookings.filter(
                models.Q(customer_name__icontains=search_query) |
                models.Q(customer_number__icontains=search_query) |
                models.Q(prebooking_id__icontains=search_query)
            )

        # Filter by status
        if status_filter and status_filter in ['pending', 'confirmed', 'cancelled', 'expired']:
            prebookings = prebookings.filter(status=status_filter)

        serializer = PreBookingSerializer(prebookings.order_by("-created_at"), many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "pre_booker", "customer", "invi_pre_booker"])
    def retrieve(self, request, pk=None):
        """Get single pre-booking detail"""
        try:
            prebooking = PreBooking.objects.get(id=pk)
        except PreBooking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pre-booking not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = PreBookingSerializer(prebooking)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "pre_booker", "customer", "invi_pre_booker"])
    def create(self, request):
        data = request.data.copy()
        user = request.user
        print(data)
        # Determine park
        if user.role in ["cash_counter", "pre_booker", "invi_pre_booker"]:
            data["park"] = user.park.id if user.park else None
        elif user.role == "park_admin":
            data["park"] = user.park.id
        else:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": True,
                "data": None,
                "error": "Only authorized staff can create pre-bookings"
            }, status=status.HTTP_403_FORBIDDEN)

        # if user.role in ["cash_counter", "pre_booker", "invi_pre_booker"]:
        # first_park = Park.objects.order_by("id").first()
        # data["park"] = first_park.id

        serializer = PreBookingSerializer(data=data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        prebooking = serializer.save()
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": PreBookingSerializer(prebooking).data,
            "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    @action(detail=True, methods=['post'])
    def approve_invite(self, request, pk=None):
        """Admin approves invite pre-booking and sets discount amount"""
        try:
            prebooking = PreBooking.objects.get(id=pk)
        except PreBooking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pre-booking not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Only allow approval for invite pre-bookings
        if not prebooking.is_an_invite:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Can only approve invite pre-bookings"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check approval status
        if prebooking.approval_status != "pending":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Can only approve pending invites. Current status: {prebooking.approval_status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract approved amount from request
        data = request.data.copy()
        approved_amount = data.get("approved_amount", 0)
        
        try:
            approved_amount = float(approved_amount)
            if approved_amount < 0:
                raise ValueError("Approved amount cannot be negative")
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid approved amount"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update pre-booking with approval
        prebooking.approval_status = "approved"
        prebooking.approved_amount = approved_amount
        prebooking.approved_by = request.user
        prebooking.approved_at = timezone.now()
        prebooking.status = "approved"
        prebooking.save()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": PreBookingSerializer(prebooking).data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin"])
    @action(detail=True, methods=['post'])
    def reject_invite(self, request, pk=None):
        """Admin rejects invite pre-booking with reason"""
        try:
            prebooking = PreBooking.objects.get(id=pk)
        except PreBooking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pre-booking not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Only allow rejection for invite pre-bookings
        if not prebooking.is_an_invite:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Can only reject invite pre-bookings"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check approval status
        if prebooking.approval_status != "pending":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Can only reject pending invites. Current status: {prebooking.approval_status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract rejection reason from request
        data = request.data.copy()
        rejection_reason = data.get("rejection_reason", "No reason provided")

        # Update pre-booking with rejection
        prebooking.approval_status = "rejected"
        prebooking.approved_by = request.user
        prebooking.approved_at = timezone.now()
        prebooking.rejection_reason = rejection_reason
        prebooking.status = "cancelled"
        prebooking.save()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": PreBookingSerializer(prebooking).data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "invi_pre_booker"])
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Convert pre-booking to actual booking"""
        try:
            prebooking = PreBooking.objects.get(id=pk)
        except PreBooking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pre-booking not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # For invite pre-bookings, check if approved by admin
        if prebooking.is_an_invite and prebooking.approval_status != "approved":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Invite pre-booking must be approved by admin first. Current approval status: {prebooking.approval_status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # For non-invite bookings, check pending status
        if not prebooking.is_an_invite and prebooking.status != "pending":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Can only confirm pending pre-bookings. Current status: {prebooking.status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # For invite pre-bookings that are approved, status should be "approved"
        if prebooking.is_an_invite and prebooking.status != "approved":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Can only confirm approved invite pre-bookings. Current status: {prebooking.status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract data from request
        data = request.data.copy()
        
        # Use approved_amount for invite pre-bookings, otherwise use total_amount from request
        if prebooking.is_an_invite:
            total_amount = prebooking.approved_amount or 0
        else:
            total_amount = data.get("total_amount", 0)
        
        payment_method = data.get("payment_method", "cash")

        # Check if customer exists, otherwise create
        customer = User.objects.filter(contact_number=prebooking.customer_number).first()
        if not customer:
            customer = User.objects.create(
                contact_number=prebooking.customer_number,
                role="customer",
                name=prebooking.customer_name
            )

        # Create booking from pre-booking
        booking = Booking.objects.create(
            park=prebooking.park,
            customer=customer,
            visit_date=prebooking.visit_date,
            num_people=prebooking.num_people,
            total_amount=total_amount,
            payment_method=payment_method,
            payment_status="success",
            sold_from="cash_counter",
            sold_by=request.user,
            sale_confirmed=True,
            commission_rate=0,
            is_an_invite=prebooking.is_an_invite,
            reference=prebooking.reference,
            other_reference=prebooking.other_reference
        )

        # Create ride access for all paid rides
        paid_rides = Ride.objects.filter(park=prebooking.park, access_type="paid")
        for ride in paid_rides:
            BookingRideAccess.objects.create(
                booking=booking,
                ride=ride,
                total_allowed=prebooking.num_people
            )

        # Generate QR code
        # qr = qrcode.QRCode(version=1, box_size=10, border=5)
        # qr.add_data(booking.booking_id)
        # qr.make(fit=True)
        # img = qr.make_image(fill_color="black", back_color="white")

        # qr_path = os.path.join(settings.MEDIA_ROOT, "qr_codes", f"{booking.booking_id}.png")
        # os.makedirs(os.path.dirname(qr_path), exist_ok=True)
        # img.save(qr_path)
        # booking.qr_code_path = f"media/qr_codes/{booking.booking_id}.png"
        booking.save()

        # Update pre-booking status
        prebooking.status = "confirmed"
        prebooking.booking = booking
        prebooking.confirmed_at = timezone.now()
        prebooking.confirmed_by = request.user
        prebooking.save()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "prebooking": PreBookingSerializer(prebooking).data,
                "booking": BookingSerializer(booking).data
            },
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter"])
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pre-booking"""
        try:
            prebooking = PreBooking.objects.get(id=pk)
        except PreBooking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pre-booking not found"
            }, status=status.HTTP_404_NOT_FOUND)

        if prebooking.status in ["confirmed", "cancelled"]:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Cannot cancel pre-booking with status: {prebooking.status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        prebooking.status = "cancelled"
        prebooking.save()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": PreBookingSerializer(prebooking).data,
            "error": None
        }, status=status.HTTP_200_OK)
        
        if ride.access_type == "free":
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": True,
                    "is_free_ride": True,
                    "message": f"Free ride access available",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "customer_mobile": booking.customer.contact_number,
                    "ride_name": ride.name,
                    "ride_type": "free",
                    "used_count": ride_access.used_count,
                    "remaining": booking.num_people,  # For free rides, show num_people
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Calculate remaining people for paid rides
        remaining_people = ride_access.total_allowed - ride_access.used_count
        
        # Check if any people remaining (only for paid rides)
        if remaining_people <= 0:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"No remaining access to {ride.name}. All people have used this ride.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "ride_name": ride.name,
                    "total_allowed": ride_access.total_allowed,
                    "used_count": ride_access.used_count,
                    "remaining": remaining_people,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Return success with available count for paid rides
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "is_free_ride": False,
                "message": f"{remaining_people} people can enter {ride.name}",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "customer_mobile": booking.customer.contact_number,
                "ride_name": ride.name,
                "ride_type": "paid",
                "total_allowed": ride_access.total_allowed,
                "used_count": ride_access.used_count,
                "remaining": remaining_people,
            },
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "ride_operator"])
    @action(detail=False, methods=['post'])
    def use_ride(self, request):
        """
        Update ride access count after operator confirms number of people
        """
        booking_id = request.data.get("booking_id")
        ride_id = request.data.get("ride_id")
        num_people = request.data.get("num_people")
        
        if not booking_id or not ride_id or not num_people:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID, Ride ID, and number of people are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            num_people = int(num_people)
            if num_people <= 0:
                raise ValueError("Number of people must be positive")
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid number of people."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            ride = Ride.objects.get(id=ride_id)
        except Ride.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Ride not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            ride_access = BookingRideAccess.objects.get(booking=booking, ride=ride)
        except BookingRideAccess.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Ride access not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        if ride.access_type == "free":
            # Just track the usage, no limit check
            ride_access.used_count += num_people
            ride_access.total_allowed += num_people  # Increment total to match
            ride_access.last_scanned_by = request.user
            ride_access.last_scanned_at = timezone.now()
            ride_access.save()
            
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": True,
                    "message": f"Access granted for {num_people} people to {ride.name} (Free Ride)",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "ride_name": ride.name,
                    "ride_type": "free",
                    "people_entered": num_people,
                    "total_used": ride_access.used_count,
                    "remaining": booking.num_people,  # Always show booking num_people for free rides
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Calculate remaining people for paid rides
        remaining_people = ride_access.total_allowed - ride_access.used_count
        
        # Check if enough people remaining (only for paid rides)
        if num_people > remaining_people:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Only {remaining_people} people can enter. You tried to enter {num_people}.",
                    "remaining": remaining_people,
                },
                "error": f"Not enough access remaining. Only {remaining_people} people allowed."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update used count for paid rides
        ride_access.used_count += num_people
        ride_access.last_scanned_by = request.user
        ride_access.last_scanned_at = timezone.now()
        ride_access.save()
        
        new_remaining = ride_access.total_allowed - ride_access.used_count
        
        # Return success
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "message": f"Access granted for {num_people} people to {ride.name}",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "ride_name": ride.name,
                "ride_type": "paid",
                "people_entered": num_people,
                "total_allowed": ride_access.total_allowed,
                "used_count": ride_access.used_count,
                "remaining": new_remaining,
            },
            "error": None
        }, status=status.HTTP_200_OK)


class AddOnViewSet(viewsets.ViewSet):
    """
    Handle add-on ride purchases for customers already in the park
    """
    
    @handle_exceptions
    @check_authentication()
    @action(detail=False, methods=['get'])
    def paid_rides(self, request):
        """
        """
        user = request.user
        
        # Get rides based on user's park
        if hasattr(user, 'park') and user.park:
            rides = Ride.objects.filter(park=user.park, is_active=True)
        else:
            # If no park assigned, get all rides (for super_admin)
            rides = Ride.objects.filter(is_active=True)
        
        rides_data = [{
            "id": ride.id,
            "name": ride.name,
            "price": str(ride.price) if ride.price else "0",
            "is_paid": ride.access_type == "paid",  # Added ride type indicator
        } for ride in rides]
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": rides_data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "customer"])
    @action(detail=False, methods=['get'])
    def get_ride_access(self, request):
        """
        Get current ride access details for a booking
        Returns available entries for a specific ride
        """
        booking_id = request.query_params.get("booking_id")
        ride_id = request.query_params.get("ride_id")
        
        if not booking_id or not ride_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID and Ride ID are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if request.user.role == 'customer':
                booking = Booking.objects.get(booking_id=booking_id, customer=request.user.id)
            else:
                booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            ride = Ride.objects.get(id=ride_id)
        except Ride.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Ride not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if booking is checked-in
        if not booking.checked_in:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not checked-in. Customer must check-in first."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if customer has entered the park
        if not booking.entered:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Customer has not entered the park yet."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if visit date is today
        ist_time = timezone.localtime(timezone.now())
        if booking.visit_date != ist_time.date():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Add-ons can only be purchased for today's bookings. This booking is for {booking.visit_date}."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create ride access record
        ride_access, created = BookingRideAccess.objects.get_or_create(
            booking=booking,
            ride=ride,
            defaults={"total_allowed": 0}
        )
        
        remaining = ride_access.total_allowed - ride_access.used_count
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "ride_name": ride.name,
                "ride_price": str(ride.price) if ride.price else "0",
                "total_allowed": ride_access.total_allowed,
                "used_count": ride_access.used_count,
                "remaining": remaining,
            },
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "cash_counter", "customer"])
    def create(self, request):
        """
        Purchase additional ride entries
        Updates BookingRideAccess.total_allowed and creates AddOn record
        """
        
        booking_id = request.data.get("booking_id")
        ride_id = request.data.get("ride_id")
        additional_entries = request.data.get("additional_entries")
        payment_method = request.data.get("payment_method", "cash")
        
        if not booking_id or not ride_id or not additional_entries:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID, Ride ID, and number of additional entries are required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            additional_entries = int(additional_entries)
            if additional_entries <= 0:
                raise ValueError("Additional entries must be positive")
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid number of additional entries."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            if request.user.role == 'customer':
                booking = Booking.objects.get(booking_id=booking_id, customer=request.user.id)
            else:
                booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            ride = Ride.objects.get(id=ride_id)
        except Ride.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Ride not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if ride is paid
        if ride.access_type != "paid":
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Add-ons can only be purchased for paid rides."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if booking is checked-in
        if not booking.checked_in:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not checked-in. Customer must check-in first."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if customer has entered the park
        if not booking.entered:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Customer has not entered the park yet."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if visit date is today
        ist_time = timezone.localtime(timezone.now())
        if booking.visit_date != ist_time.date():
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Add-ons can only be purchased for today's bookings. This booking is for {booking.visit_date}."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create ride access record
        ride_access, created = BookingRideAccess.objects.get_or_create(
            booking=booking,
            ride=ride,
            defaults={"total_allowed": 0}
        )
        
        # Calculate price
        price_per_entry = ride.price if ride.price else 0
        total_amount = price_per_entry * additional_entries
        
        # Update total_allowed
        ride_access.total_allowed += additional_entries
        ride_access.is_addon = True
        ride_access.save()
        
        if request.user.role == 'customer':
            source = 'website'
        else:
            source = 'cash_counter'

        # Create AddOn record
        addon = AddOn.objects.create(
            booking=booking,
            ride=ride,
            source=source,
            sold_by=request.user,
            additional_entries=additional_entries,
            price_per_entry=price_per_entry,
            total_amount=total_amount,
            payment_method=payment_method,
            payment_status="success"
        )
        
        new_remaining = ride_access.total_allowed - ride_access.used_count
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "message": f"Successfully purchased {additional_entries} additional entries for {ride.name}",
                "addon_id": addon.addon_id,
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "ride_name": ride.name,
                "additional_entries": additional_entries,
                "price_per_entry": str(price_per_entry),
                "total_amount": str(total_amount),
                "new_total_allowed": ride_access.total_allowed,
                "used_count": ride_access.used_count,
                "remaining": new_remaining,
            },
            "error": None
        }, status=status.HTTP_201_CREATED)


class SocksScannerViewSet(viewsets.ViewSet):
    """
    Handle socks distribution for socks handlers
    """
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "socks_handler"])
    def create(self, request):
        """
        Verify booking and get socks collection status
        Returns available socks count without updating
        """
        booking_id = request.data.get("booking_id")
        
        if not booking_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Invalid booking ID. Booking not found."
                },
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if booking is checked-in
        if not booking.checked_in:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Booking not checked-in. Please complete check-in first.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check if customer has entered the park
        if not booking.entered:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "Customer has not entered the park yet. Security verification required.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Check if visit date is today
        ist_time = timezone.localtime(timezone.now())
        if booking.visit_date != ist_time.date():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Booking is for {booking.visit_date}, not today.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "visit_date": str(booking.visit_date),
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Calculate remaining socks
        remaining_socks = booking.num_people - booking.socks_collected
        
        # Check if all socks collected
        if remaining_socks <= 0:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": "All socks already collected.",
                    "booking_id": booking.booking_id,
                    "customer_name": booking.customer.name,
                    "total_people": booking.num_people,
                    "socks_collected": booking.socks_collected,
                    "remaining": 0,
                    "socks_small": booking.socks_small,
                    "socks_medium": booking.socks_medium,
                    "socks_large": booking.socks_large,
                    "socks_xlarge": booking.socks_xlarge,
                },
                "error": None
            }, status=status.HTTP_200_OK)
        
        # Return success with available count
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "message": f"{remaining_socks} socks can be collected",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "customer_mobile": booking.customer.contact_number,
                "total_people": booking.num_people,
                "socks_collected": booking.socks_collected,
                "remaining": remaining_socks,
                "socks_small": booking.socks_small,
                "socks_medium": booking.socks_medium,
                "socks_large": booking.socks_large,
                "socks_xlarge": booking.socks_xlarge,
            },
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    @check_authentication(required_role=["super_admin", "park_admin", "socks_handler"])
    @action(detail=False, methods=['post'])
    def distribute_socks(self, request):
        """
        Distribute socks after handler confirms sizes and quantities
        """
        booking_id = request.data.get("booking_id")
        socks_small = request.data.get("socks_small", 0)
        socks_medium = request.data.get("socks_medium", 0)
        socks_large = request.data.get("socks_large", 0)
        socks_xlarge = request.data.get("socks_xlarge", 0)
        
        if not booking_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            socks_small = int(socks_small)
            socks_medium = int(socks_medium)
            socks_large = int(socks_large)
            socks_xlarge = int(socks_xlarge)
            
            if any(x < 0 for x in [socks_small, socks_medium, socks_large, socks_xlarge]):
                raise ValueError("Sock quantities cannot be negative")
            
            total_socks_distributing = socks_small + socks_medium + socks_large + socks_xlarge
            
            if total_socks_distributing <= 0:
                raise ValueError("At least one sock must be distributed")
                
        except (ValueError, TypeError) as e:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": str(e) if str(e) else "Invalid sock quantities."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.select_related('customer', 'park').get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Booking not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate remaining socks
        remaining_socks = booking.num_people - booking.socks_collected
        
        # Check if enough socks remaining
        if total_socks_distributing > remaining_socks:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "verified": False,
                    "message": f"Only {remaining_socks} socks can be collected. You tried to distribute {total_socks_distributing}.",
                    "remaining": remaining_socks,
                },
                "error": f"Not enough socks remaining. Only {remaining_socks} socks allowed."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update sock counts
        booking.socks_collected += total_socks_distributing
        booking.socks_small += socks_small
        booking.socks_medium += socks_medium
        booking.socks_large += socks_large
        booking.socks_xlarge += socks_xlarge
        booking.save()
        
        new_remaining = booking.num_people - booking.socks_collected
        
        # Return success
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "verified": True,
                "message": f"Successfully distributed {total_socks_distributing} socks",
                "booking_id": booking.booking_id,
                "customer_name": booking.customer.name,
                "socks_distributed": total_socks_distributing,
                "distribution": {
                    "small": socks_small,
                    "medium": socks_medium,
                    "large": socks_large,
                    "xlarge": socks_xlarge,
                },
                "total_people": booking.num_people,
                "socks_collected": booking.socks_collected,
                "remaining": new_remaining,
                "cumulative_socks": {
                    "small": booking.socks_small,
                    "medium": booking.socks_medium,
                    "large": booking.socks_large,
                    "xlarge": booking.socks_xlarge,
                },
            },
            "error": None
        }, status=status.HTTP_200_OK)
