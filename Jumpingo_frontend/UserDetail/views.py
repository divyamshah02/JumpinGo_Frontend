from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ParseError
from rest_framework.decorators import action

from django.utils import timezone
from django.core.paginator import Paginator
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth.hashers import check_password, make_password
from django.db import models

from .models import *
from .serializers import *
from Booking.models import *
from Booking.serializers import BookingSerializer
from Park.models import Ride
from Park.serializers import RideSerializer

import random
from datetime import datetime, timedelta

from utils.decorators import *



class TempViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    @check_authentication()
    def list(self, request):
        any_get_data = request.query_params.get('any_get_data')
        if not any_get_data:
            return Response(
                        {
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data": None,
                            "error": "Missing any_get_data."
                        }, status=status.HTTP_400_BAD_REQUEST)

        data = {}
        return Response(
                    {
                        "success": True,
                        "user_not_logged_in": False,
                        "user_unauthorized": False,
                        "data": data,
                        "error": None
                    }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role='admin')
    def create(self, request):
            any_post_data = request.data.get('any_post_data')
            if not any_post_data:
                return Response(
                            {
                                "success": False,
                                "user_not_logged_in": False,
                                "user_unauthorized": False,
                                "data": None,
                                "error": "Missing any_post_data."
                            }, status=status.HTTP_400_BAD_REQUEST)

            data = {}         

            return Response(
                        {
                            "success": True,  
                            "user_not_logged_in": False,
                            "user_unauthorized": False,                       
                            "data": data,
                            "error": None
                        }, status=status.HTTP_201_CREATED)


class OtpAuthViewSet(viewsets.ViewSet):

    @handle_exceptions
    def create(self, request):
        """
        API 1: Generate OTP
        """
        mobile = request.data.get("mobile")
        if not mobile:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Mobile number is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        otp = self.generate_send_otp(contact_number=mobile)
        otp_obj = OTPVerification.objects.create(
            mobile=mobile,
            otp=otp,
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=False,
            attempt_count=0
        )

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {"otp_id": otp_obj.id, "otp": otp},  # remove otp in production
            "error": None
        }, status=status.HTTP_201_CREATED)

    # @handle_exceptions
    def update(self, request, pk):
        """
        API 2: Verify OTP & Login/Register
        """

        otp_id = pk
        otp = request.data.get("otp")
        
        if not otp_id or not otp:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "otp_id & otp are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = OTPVerification.objects.get(id=otp_id)
        except OTPVerification.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid OTP ID."
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_obj.is_verified:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP already used."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.expires_at < timezone.now():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP expired."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.attempt_count >= 3:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Maximum attempts reached."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.otp != otp:
            otp_obj.attempt_count += 1
            otp_obj.save()
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Incorrect OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        # OTP is correct
        otp_obj.is_verified = True
        otp_obj.save()

        user = User.objects.filter(contact_number=otp_obj.mobile).first()

        if user:
            user_details_filled = bool(user.first_name and user.last_name and user.email)
        else:
            user = User.objects.create(
                contact_number=otp_obj.mobile,
                role='customer'
            )
            user_details_filled = False

        old_session_id = request.session.get('session_token')

        login(request, user)
        new_session_id = request.session.get('session_token')

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "otp_verified": True,
                "user_id": user.user_id,
                "user_details": user_details_filled,
                "old_session_id": old_session_id
            },
            "error": None
        }, status=status.HTTP_200_OK)

    def generate_send_otp(self, contact_number):
        otp = ''.join(random.choices('0123456789', k=6))
        print(f"Sending OTP: {otp} to {contact_number}")

        return otp


class InternalLoginAuthViewSet(viewsets.ViewSet):

    @handle_exceptions
    def create(self, request):
        """
        API 1: Generate OTP
        """
        mobile = request.data.get("mobile")
        if not mobile:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Mobile number is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        user_exists = User.objects.filter(contact_number=mobile, role__in=['super_admin', 'park_admin', 'security', 'ride_operator', 'socks_handler', 'seller', 'cash_counter', 'pre_booker']).first()
        if user_exists is None:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No internal user found with this mobile number."
            }, status=status.HTTP_404_NOT_FOUND)

        otp = self.generate_send_otp(contact_number=mobile)
        otp_obj = OTPVerification.objects.create(
            mobile=mobile,
            otp=otp,
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=False,
            attempt_count=0
        )

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {"otp_id": otp_obj.id, "otp": otp},  # remove otp in production
            "error": None
        }, status=status.HTTP_201_CREATED)

    # @handle_exceptions
    def update(self, request, pk):
        """
        API 2: Verify OTP & Login/Register
        """

        otp_id = pk
        otp = request.data.get("otp")
        
        if not otp_id or not otp:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "otp_id & otp are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = OTPVerification.objects.get(id=otp_id)
        except OTPVerification.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid OTP ID."
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_obj.is_verified:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP already used."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.expires_at < timezone.now():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP expired."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.attempt_count >= 3:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Maximum attempts reached."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.otp != otp:
            otp_obj.attempt_count += 1
            otp_obj.save()
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Incorrect OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        # OTP is correct
        otp_obj.is_verified = True
        otp_obj.save()

        user = User.objects.filter(contact_number=otp_obj.mobile).first()

        if not user:
             return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No internal user found with this mobile number."
            }, status=status.HTTP_404_NOT_FOUND)

        old_session_id = request.session.get('session_token')

        login(request, user)
        new_session_id = request.session.get('session_token')

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "otp_verified": True,
                "user_id": user.user_id,
                "role": user.role,
                "old_session_id": old_session_id
            },
            "error": None
        }, status=status.HTTP_200_OK)

    def generate_send_otp(self, contact_number):
        otp = ''.join(random.choices('0123456789', k=6))
        print(f"Sending OTP: {otp} to {contact_number}")

        return otp


class IsUserLoggedInViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    @check_authentication()
    def list(self, request):
        user = request.user
        userData = User.objects.filter(user_id=user.user_id).first()
        user_data = UserSerializer(userData).data
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": user_data,
            "error": None
        }, status=status.HTTP_200_OK)


class UserDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    def create(self, request):
        """
        API 3: Fill User Details after OTP verification
        """
        user = request.user

        firstName = request.data.get('firstName')
        lastName = request.data.get('lastName')
        email = request.data.get('email')
        address = request.data.get('address')
        city = request.data.get('city')
        alternate_phone = request.data.get('alternate_phone', "")
        pincode = request.data.get('pincode')

        user_obj = User.objects.get(user_id=user.user_id)
        user_obj.first_name = firstName
        user_obj.last_name = lastName
        user_obj.email = email
        user_obj.alternate_phone = alternate_phone
        user_obj.save()

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": "User details updated successfully.",
            "error": None
        }, status=status.HTTP_200_OK)


class UserProfileViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    @check_authentication()
    def list(self, request):
        user_id = request.user.user_id
        
        try:
            user = User.objects.get(user_id=user_id)
            user_data = UserSerializer(user).data

            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"user": user_data},
                "error": None
            }, status=200)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found."
            }, status=404)

    @handle_exceptions
    # @check_authentication(required_role="baker")
    def update(self, request, pk=None):
        """
        Update user profile information
        """
        user_id = request.user.user_id
        data = request.data.copy()
        data['user_id'] = user_id
        
        user_pk = pk
        
        try:
            user = User.objects.get(user_id=user_id)
            data['role'] = user.role
            data['contact_number'] = user.contact_number
            
            serializer = UserSerializer(user, data=data, partial=False)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": serializer.data,
                    "error": None
                }, status=status.HTTP_200_OK)
            
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found."
            }, status=404)

    @handle_exceptions
    @check_authentication(required_role=['cash_counter', 'seller', 'super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def search_customers(self, request):
        """Search for customers by name or phone number"""
        search_query = request.query_params.get('search', '').strip()
        
        if not search_query or len(search_query) < 2:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Search query must be at least 2 characters"
            }, status=status.HTTP_400_BAD_REQUEST)

        today = datetime.today()
        # Search by name or phone number
        customers = PreBooking.objects.filter(
            models.Q(customer_name__icontains=search_query) |
            models.Q(customer_number__icontains=search_query),
            visit_date=today,
            is_an_invite=False,
            is_booked=False
        ).values('id', 'customer_name', 'customer_number', 'num_people', 'visit_date')

        customers_list = []
        for customer in customers:
            customers_list.append({
                'id': customer['id'],
                'name': customer['customer_name'],
                'phone': customer['customer_number'],
                'num_people': customer['num_people'],
                'visit_date': customer['visit_date']
            })

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": customers_list,
            "error": None
        }, status=status.HTTP_200_OK)


def login_to_account(request):
    try:
        request_user = request.user
        username = request.GET.get('username')
        print(username)

        user = User.objects.get(username=username)

        if request_user.is_staff:
            print('Staff')
            login(request, user)

        return HttpResponse('DONE')
        return redirect('dashboard-list')

    except Exception as e:
        print(e)
        return HttpResponse('DONE')
        return redirect('dashboard-list')


class AdminDashboardViewSet(viewsets.ViewSet):
    """
    Admin Dashboard API for managing users, bookings, and rides
    """
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    def list(self, request):
        """Get dashboard statistics"""
        try:
            park_id = request.query_params.get('park_id')
            date_filter = request.query_params.get('date_filter', '')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Filter by park if provided
            bookings = Booking.objects.all()
            if park_id:
                bookings = bookings.filter(park__park_id=park_id)
            
            today = timezone.now().date()
            if date_filter == 'today':
                bookings = bookings.filter(visit_date=today)
            elif date_filter == 'month':
                bookings = bookings.filter(
                    visit_date__year=today.year,
                    visit_date__month=today.month
                )
            elif date_filter == 'year':
                bookings = bookings.filter(visit_date__year=today.year)
            elif date_filter == 'custom' and start_date and end_date:
                bookings = bookings.filter(
                    visit_date__gte=start_date,
                    visit_date__lte=end_date
                )
            
            # Calculate statistics
            total_bookings = bookings.count()
            total_revenue = bookings.filter(payment_status='success').aggregate(
                total=models.Sum('total_amount')
            )['total'] or 0
            
            total_revenue_cash = bookings.filter(payment_status='success', payment_method='cash').aggregate(
                total=models.Sum('total_amount')
            )['total'] or 0
            
            total_revenue_online = bookings.filter(payment_status='success', payment_method='online').aggregate(
                total=models.Sum('total_amount')
            )['total'] or 0

            today_bookings = bookings.filter(visit_date=today).count()
            checked_in_today = bookings.filter(
                visit_date=today, 
                checked_in=True
            ).count()
            
            return Response({
                "success": True,
                "data": {
                    "total_bookings": total_bookings,
                    "total_revenue": float(total_revenue),
                    "total_revenue_cash": float(total_revenue_cash),
                    "total_revenue_online": float(total_revenue_online),
                    "today_bookings": today_bookings,
                    "checked_in_today": checked_in_today,
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def bookings(self, request):
        """Get all bookings with filters"""
        try:
            # Get filter parameters
            park_id = request.query_params.get('park_id')
            date_filter = request.query_params.get('date_filter', '')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search')
            payment_status = request.query_params.get('payment_status')
            
            # Base queryset
            bookings = Booking.objects.select_related('customer', 'park', 'sold_by').all()
            
            # Apply filters
            if park_id:
                bookings = bookings.filter(park__park_id=park_id)
            
            today = timezone.now().date()
            if date_filter == 'today':
                bookings = bookings.filter(visit_date=today)
            elif date_filter == 'month':
                bookings = bookings.filter(
                    visit_date__year=today.year,
                    visit_date__month=today.month
                )
            elif date_filter == 'year':
                bookings = bookings.filter(visit_date__year=today.year)
            
            if start_date and end_date:
                print(start_date)
                print(end_date)
                bookings = bookings.filter(
                    visit_date__gte=start_date,
                    visit_date__lte=end_date
                )
            
            if payment_status:
                bookings = bookings.filter(payment_status=payment_status)
            if search:
                bookings = bookings.filter(
                    models.Q(booking_id__icontains=search) |
                    models.Q(customer__name__icontains=search) |
                    models.Q(customer__contact_number__icontains=search)
                )
            
            # Order by created date
            bookings = bookings.order_by('-created_at')
            
            bookings_data = []
            for booking in bookings:
                bookings_data.append({
                    'id': booking.id,
                    'booking_id': booking.booking_id,
                    'customer_name': booking.customer.name if booking.customer else None,
                    'customer_contact': booking.customer.contact_number if booking.customer else None,
                    'visit_date': booking.visit_date,
                    'num_people': booking.num_people,
                    'total_amount': str(booking.total_amount),
                    'payment_status': booking.payment_status,
                    'payment_method': booking.payment_method,
                    'sold_from': booking.sold_from,
                    'sold_by_name': booking.sold_by.name if booking.sold_by else None,
                    'sold_by_role': booking.sold_by.role if booking.sold_by else None,
                    'checked_in': booking.checked_in,
                    'created_at': booking.created_at,
                })
            
            return Response({
                "success": True,
                "data": bookings_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def users(self, request):
        """Get all users with filters"""
        try:
            # Get filter parameters
            role = request.query_params.get('role')
            park_id = request.query_params.get('park_id')
            search = request.query_params.get('search')
            exclude_customer = request.query_params.get('exclude_customer', 'false').lower() == 'true'
            
            # Base queryset
            users = User.objects.all()
            
            if exclude_customer:
                users = users.exclude(role='customer')
            
            # Apply filters
            if role:
                users = users.filter(role=role)
            if park_id:
                users = users.filter(park__park_id=park_id)
            if search:
                users = users.filter(
                    models.Q(name__icontains=search) |
                    models.Q(contact_number__icontains=search) |
                    models.Q(user_id__icontains=search)
                )
            
            # Order by created date
            users = users.order_by('-created_at')
            
            # Serialize
            serializer = UserSerializer(users, many=True)
            
            return Response({
                "success": True,
                "data": serializer.data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['post'])
    def create_user(self, request):
        """Create a new user"""
        try:
            serializer = UserSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "error": None,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    "success": False,
                    "data": None,
                    "error": serializer.errors,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['put'])
    def update_user(self, request, pk=None):
        """Update user details"""
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "error": None,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "data": None,
                    "error": serializer.errors,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "User not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def rides(self, request):
        """Get all rides with filters"""
        try:
            # Get filter parameters
            park_id = request.query_params.get('park_id')
            access_type = request.query_params.get('access_type')
            search = request.query_params.get('search')
            
            # Base queryset
            rides = Ride.objects.select_related('park').all()
            
            # Apply filters
            if park_id:
                rides = rides.filter(park__park_id=park_id)
            if access_type:
                rides = rides.filter(access_type=access_type)
            if search:
                rides = rides.filter(
                    models.Q(name__icontains=search) |
                    models.Q(description__icontains=search)
                )
            
            # Order by name
            rides = rides.order_by('name')
            
            # Serialize
            serializer = RideSerializer(rides, many=True)
            
            return Response({
                "success": True,
                "data": serializer.data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['post'])
    def create_ride(self, request):
        """Create a new ride"""
        try:
            # Get park_id from request data
            park_id = request.data.get('park')
            
            # Validate park exists
            try:
                park = User.objects.get(id=park_id)
            except User.DoesNotExist:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Park not found",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = RideSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "error": None,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    "success": False,
                    "data": None,
                    "error": serializer.errors,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['put'])
    def update_ride(self, request, pk=None):
        """Update ride details"""
        try:
            ride = Ride.objects.get(pk=pk)
            serializer = RideSerializer(ride, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "error": None,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "data": None,
                    "error": serializer.errors,
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Ride.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "Ride not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def addons(self, request):
        """Get all add-on purchases with filters"""
        try:
            from Booking.models import AddOn
            
            # Get filter parameters
            park_id = request.query_params.get('park_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search')
            
            # Base queryset
            addons = AddOn.objects.select_related('booking', 'booking__customer', 'ride', 'sold_by').all()
            
            # Apply filters
            if park_id:
                addons = addons.filter(booking__park__park_id=park_id)
            if start_date:
                addons = addons.filter(created_at__date__gte=start_date)
            if end_date:
                addons = addons.filter(created_at__date__lte=end_date)
            if search:
                addons = addons.filter(
                    models.Q(addon_id__icontains=search) |
                    models.Q(booking__booking_id__icontains=search) |
                    models.Q(booking__customer__name__icontains=search)
                )
            
            # Order by created date
            addons = addons.order_by('-created_at')
            
            addons_data = []
            for addon in addons:
                addons_data.append({
                    'id': addon.id,
                    'addon_id': addon.addon_id,
                    'booking_id': addon.booking.booking_id,
                    'customer_name': addon.booking.customer.name if addon.booking.customer else None,
                    'customer_contact': addon.booking.customer.contact_number if addon.booking.customer else None,
                    'ride_name': addon.ride.name,
                    'additional_entries': addon.additional_entries,
                    'price_per_entry': str(addon.price_per_entry),
                    'total_amount': str(addon.total_amount),
                    'source': addon.source,
                    'sold_by_name': addon.sold_by.name if addon.sold_by else None,
                    'payment_method': addon.payment_method,
                    'payment_status': addon.payment_status,
                    'created_at': addon.created_at,
                })
            
            return Response({
                "success": True,
                "data": addons_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def external_sellers(self, request):
        """Get all external sellers with their statistics"""
        try:
            park_id = request.query_params.get('park_id')
            date_filter = request.query_params.get('date_filter', 'today')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Get all sellers
            sellers = User.objects.filter(role='seller')
            if park_id:
                sellers = sellers.filter(park__park_id=park_id)
            
            sellers_data = []
            today = timezone.now().date()
            
            for seller in sellers:
                # Filter bookings by created_at date
                bookings = Booking.objects.filter(sold_by=seller)
                
                if date_filter == 'today':
                    bookings = bookings.filter(created_at__date=today)
                elif date_filter == 'month':
                    bookings = bookings.filter(
                        created_at__year=today.year,
                        created_at__month=today.month
                    )
                elif date_filter == 'year':
                    bookings = bookings.filter(created_at__year=today.year)
                elif date_filter == 'custom' and start_date and end_date:
                    bookings = bookings.filter(
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    )
                
                total_sales = bookings.filter(payment_status='success').aggregate(
                    total=models.Sum('total_amount')
                )['total'] or 0
                
                total_commission = bookings.filter(payment_status='success').aggregate(
                    total=models.Sum('commission_amount')
                )['total'] or 0
                
                sellers_data.append({
                    'id': seller.id,
                    'user_id': seller.user_id,
                    'name': seller.name,
                    'contact_number': seller.contact_number,
                    'commission_rate': str(seller.commission_rate) if hasattr(seller, 'commission_rate') else '0',
                    'total_bookings': bookings.count(),
                    'total_sales': str(total_sales),
                    'total_commission': str(total_commission),
                })
            
            return Response({
                "success": True,
                "data": sellers_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['get'])
    def cash_counters(self, request):
        """Get all cash counters with their statistics"""
        try:
            park_id = request.query_params.get('park_id')
            date_filter = request.query_params.get('date_filter', 'today')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Get all cash counters
            cash_counters = User.objects.filter(role='cash_counter')
            if park_id:
                cash_counters = cash_counters.filter(park__park_id=park_id)
            
            counters_data = []
            today = timezone.now().date()
            
            for counter in cash_counters:
                # Filter bookings by created_at date
                bookings = Booking.objects.filter(sold_by=counter)
                
                if date_filter == 'today':
                    bookings = bookings.filter(created_at__date=today)
                elif date_filter == 'month':
                    bookings = bookings.filter(
                        created_at__year=today.year,
                        created_at__month=today.month
                    )
                elif date_filter == 'year':
                    bookings = bookings.filter(created_at__year=today.year)
                elif date_filter == 'custom' and start_date and end_date:
                    bookings = bookings.filter(
                        created_at__date__gte=start_date,
                        created_at__date__lte=end_date
                    )
                
                total_sales = bookings.filter(payment_status='success').aggregate(
                    total=models.Sum('total_amount')
                )['total'] or 0
                
                total_revenue = bookings.filter(payment_status='success').aggregate(
                    total=models.Sum('total_amount')
                )['total'] or 0
                
                total_revenue_cash = bookings.filter(payment_status='success', payment_method='cash').aggregate(
                    total=models.Sum('total_amount')
                )['total'] or 0
                
                total_revenue_online = bookings.filter(payment_status='success', payment_method='online').aggregate(
                    total=models.Sum('total_amount')
                )['total'] or 0

                
                counters_data.append({
                    'id': counter.id,
                    'user_id': counter.user_id,
                    'name': counter.name,
                    'contact_number': counter.contact_number,
                    'total_bookings': bookings.count(),
                    'total_revenue': float(total_revenue),
                    'total_revenue_cash': float(total_revenue_cash),
                    'total_revenue_online': float(total_revenue_online),
                    'total_sales': str(total_sales),
                })
            
            return Response({
                "success": True,
                "data": counters_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['get'])
    def seller_bookings(self, request, pk=None):
        """Get bookings for a specific seller filtered by created_at"""
        try:
            seller = User.objects.get(pk=pk, role='seller')
            
            date_filter = request.query_params.get('date_filter', 'today')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search')
            
            # Filter bookings by seller and created_at
            bookings = Booking.objects.filter(sold_by=seller).select_related('customer', 'park')
            
            today = timezone.now().date()
            if date_filter == 'today':
                bookings = bookings.filter(created_at__date=today)
            elif date_filter == 'month':
                bookings = bookings.filter(
                    created_at__year=today.year,
                    created_at__month=today.month
                )
            elif date_filter == 'year':
                bookings = bookings.filter(created_at__year=today.year)
            elif date_filter == 'custom' and start_date and end_date:
                bookings = bookings.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                )
            
            if search:
                bookings = bookings.filter(
                    models.Q(booking_id__icontains=search) |
                    models.Q(customer__name__icontains=search)
                )
            
            bookings = bookings.order_by('-created_at')
            
            bookings_data = []
            for booking in bookings:
                bookings_data.append({
                    'id': booking.id,
                    'booking_id': booking.booking_id,
                    'customer_name': booking.customer.name if booking.customer else None,
                    'customer_contact': booking.customer.contact_number if booking.customer else None,
                    'visit_date': booking.visit_date,
                    'num_people': booking.num_people,
                    'total_amount': str(booking.total_amount),
                    'commission_amount': str(booking.commission_amount),
                    'payment_status': booking.payment_status,
                    'payment_method': booking.payment_method,
                    'commission_paid': booking.commission_paid,  # Use commission_paid field
                    'created_at': booking.created_at,
                })
            
            return Response({
                "success": True,
                "data": bookings_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "Seller not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['get'])
    def cash_counter_bookings(self, request, pk=None):
        """Get bookings for a specific cash counter filtered by created_at"""
        try:
            counter = User.objects.get(pk=pk, role='cash_counter')
            
            date_filter = request.query_params.get('date_filter', 'today')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search')
            
            # Filter bookings by cash counter and created_at
            bookings = Booking.objects.filter(sold_by=counter).select_related('customer', 'park')
            
            today = timezone.now().date()
            if date_filter == 'today':
                bookings = bookings.filter(created_at__date=today)
            elif date_filter == 'month':
                bookings = bookings.filter(
                    created_at__year=today.year,
                    created_at__month=today.month
                )
            elif date_filter == 'year':
                bookings = bookings.filter(created_at__year=today.year)
            elif date_filter == 'custom' and start_date and end_date:
                bookings = bookings.filter(
                    created_at__date__gte=start_date,
                    created_at__date__lte=end_date
                )
            
            if search:
                bookings = bookings.filter(
                    models.Q(booking_id__icontains=search) |
                    models.Q(customer__name__icontains=search)
                )
            
            bookings = bookings.order_by('-created_at')
            
            bookings_data = []
            for booking in bookings:
                bookings_data.append({
                    'id': booking.id,
                    'booking_id': booking.booking_id,
                    'customer_name': booking.customer.name if booking.customer else None,
                    'customer_contact': booking.customer.contact_number if booking.customer else None,
                    'visit_date': booking.visit_date,
                    'num_people': booking.num_people,
                    'total_amount': str(booking.total_amount),
                    'payment_status': booking.payment_status,
                    'payment_method': booking.payment_method,
                    'sale_confirmed': booking.sale_confirmed,  # Use sale_confirmed field
                    'created_at': booking.created_at,
                })
            
            return Response({
                "success": True,
                "data": bookings_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "Cash counter not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['post'])
    def confirm_payment(self, request):
        """Confirm payment for seller/cash counter bookings"""
        try:
            user_id = request.data.get('user_id')
            booking_ids = request.data.get('booking_ids', [])
            
            if not user_id or not booking_ids:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "user_id and booking_ids are required",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update bookings
            updated_count = Booking.objects.filter(
                id__in=booking_ids,
                sold_by__id=user_id
            ).update(payment_confirmed=True)
            
            return Response({
                "success": True,
                "data": {
                    "updated_count": updated_count,
                    "message": f"Payment confirmed for {updated_count} bookings"
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Add new actions here
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['post'])
    def mark_commission_paid(self, request):
        """Mark commission as paid for seller bookings"""
        try:
            booking_ids = request.data.get('booking_ids', [])
            
            if not booking_ids:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "booking_ids are required",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update bookings
            updated_count = Booking.objects.filter(
                id__in=booking_ids
            ).update(commission_paid=True)
            
            return Response({
                "success": True,
                "data": {
                    "updated_count": updated_count,
                    "message": f"Commission marked as paid for {updated_count} bookings"
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=False, methods=['post'])
    def mark_sale_confirmed(self, request):
        """Mark sale as confirmed for cash counter bookings"""
        try:
            booking_ids = request.data.get('booking_ids', [])
            
            if not booking_ids:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "booking_ids are required",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update bookings
            updated_count = Booking.objects.filter(
                id__in=booking_ids
            ).update(sale_confirmed=True)
            
            return Response({
                "success": True,
                "data": {
                    "updated_count": updated_count,
                    "message": f"Sale confirmed for {updated_count} bookings"
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed information for a specific booking including add-ons, socks, and ride access"""
        try:
            booking = Booking.objects.select_related('customer', 'park', 'sold_by').get(id=pk)
            
            # Get ride access information
            ride_access = BookingRideAccess.objects.filter(booking=booking).select_related('ride')
            ride_access_data = []
            for access in ride_access:
                ride_access_data.append({
                    'ride_name': access.ride.name,
                    'access_type': access.ride.access_type,
                    'total_allowed': access.total_allowed,
                    'used_count': access.used_count,
                })
            
            # Get add-ons information
            addons = AddOn.objects.filter(booking=booking).select_related('ride')
            addons_data = []
            for addon in addons:
                addons_data.append({
                    'addon_id': addon.addon_id,
                    'ride_name': addon.ride.name,
                    'additional_entries': addon.additional_entries,
                    'price_per_entry': str(addon.price_per_entry),
                    'total_amount': str(addon.total_amount),
                    'source': addon.source,
                    'created_at': addon.created_at,
                })
            
            # Prepare response data
            booking_data = {
                'id': booking.id,
                'booking_id': booking.booking_id,
                'customer_name': booking.customer.name if booking.customer else None,
                'customer_contact': booking.customer.contact_number if booking.customer else None,
                'customer_email': booking.customer.email if booking.customer else None,
                'visit_date': booking.visit_date,
                'num_people': booking.num_people,
                'total_amount': str(booking.total_amount),
                'payment_status': booking.payment_status,
                'payment_method': booking.payment_method,
                'sold_from': booking.sold_from,
                'sold_by_name': booking.sold_by.name if booking.sold_by else None,
                'sold_by_role': booking.sold_by.role if booking.sold_by else None,
                'commission_amount': str(booking.commission_amount) if hasattr(booking, 'commission_amount') else '0',
                'commission_paid': booking.commission_paid if hasattr(booking, 'commission_paid') else False,
                'sale_confirmed': booking.sale_confirmed if hasattr(booking, 'sale_confirmed') else False,
                'checked_in': booking.checked_in,
                'checked_in_at': booking.checked_in_at if hasattr(booking, 'checked_in_at') else None,
                'socks_collected': booking.socks_collected if hasattr(booking, 'socks_collected') else 0,
                'socks_small': booking.socks_small if hasattr(booking, 'socks_small') else 0,
                'socks_medium': booking.socks_medium if hasattr(booking, 'socks_medium') else 0,
                'socks_large': booking.socks_large if hasattr(booking, 'socks_large') else 0,
                'socks_xlarge': booking.socks_xlarge if hasattr(booking, 'socks_xlarge') else 0,
                'created_at': booking.created_at,
                'ride_access': ride_access_data,
                'addons': addons_data,
            }
            
            return Response({
                "success": True,
                "data": booking_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "Booking not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['put'])
    def update_user(self, request, pk=None):
        """Update user information (name, email, status, commission rate)"""
        try:
            user = User.objects.get(id=pk)
            
            # Get data from request
            name = request.data.get('name', user.name)
            email = request.data.get('email', user.email)
            is_active_user = request.data.get('is_active_user', user.is_active_user)
            commission_rate = request.data.get('commission_rate')
            
            # Update user fields
            user.name = name
            user.email = email
            user.is_active_user = is_active_user
            
            if commission_rate is not None and user.role == 'seller':
                user.commission_rate = float(commission_rate)
            
            user.save()
            
            return Response({
                "success": True,
                "data": {
                    "user_id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "is_active_user": user.is_active_user,
                    "commission_rate": float(user.commission_rate) if user.commission_rate else 0,
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "User not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @handle_exceptions
    @check_authentication(required_role=['super_admin', 'park_admin'])
    @action(detail=True, methods=['post'])
    def update_password(self, request, pk=None):
        """Update password for a specific user"""
        try:
            user = User.objects.get(id=pk)
            
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            if not new_password or not confirm_password:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Both new_password and confirm_password are required.",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if new_password != confirm_password:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Passwords do not match.",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(new_password) < 6:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Password must be at least 6 characters long.",
                    "user_not_logged_in": False,
                    "user_unauthorized": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.set_password(new_password)
            user.save()
            
            return Response({
                "success": True,
                "data": {
                    "user_id": user.user_id,
                    "message": "Password updated successfully"
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": None,
                "error": "User not found",
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SellerDashboardViewSet(viewsets.ViewSet):
    """
    Seller/Cash Counter Dashboard API for viewing their own bookings
    """
    
    @handle_exceptions
    @check_authentication(required_role=['seller', 'cash_counter'])
    def list(self, request):
        """Get dashboard statistics for seller/cash counter"""
        try:
            user = request.user
            
            # Only allow sellers and cash counters
            if user.role not in ['seller', 'cash_counter']:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Unauthorized access",
                    "user_not_logged_in": False,
                    "user_unauthorized": True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Filter bookings by current user
            bookings = Booking.objects.filter(sold_by=user)
            
            # Calculate statistics
            total_bookings = bookings.count()
            total_revenue = bookings.filter(payment_status='success').aggregate(
                total=models.Sum('total_amount')
            )['total'] or 0
            
            today_bookings = bookings.filter(visit_date=timezone.now().date()).count()
            
            # Calculate commission for sellers
            commission_earned = 0
            if user.role == 'seller':
                commission_earned = bookings.filter(payment_status='success').aggregate(
                    total=models.Sum('commission_amount')
                )['total'] or 0
            
            return Response({
                "success": True,
                "data": {
                    "total_bookings": total_bookings,
                    "total_revenue": float(total_revenue),
                    "today_bookings": today_bookings,
                    "commission_earned": float(commission_earned),
                    "user_role": user.role,
                    "user_name": user.name,
                },
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication(required_role=['seller', 'cash_counter'])
    @action(detail=False, methods=['get'])
    def bookings(self, request):
        """Get bookings for current seller/cash counter with filters"""
        try:
            user = request.user
            
            # Only allow sellers and cash counters
            if user.role not in ['seller', 'cash_counter']:
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Unauthorized access",
                    "user_not_logged_in": False,
                    "user_unauthorized": True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get filter parameters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search')
            payment_status = request.query_params.get('payment_status')
            
            # Base queryset - only bookings sold by current user
            bookings = Booking.objects.filter(sold_by=user).select_related('customer', 'park')
            
            # Apply filters
            if start_date:
                bookings = bookings.filter(visit_date__gte=start_date)
            if end_date:
                bookings = bookings.filter(visit_date__lte=end_date)
            if payment_status:
                bookings = bookings.filter(payment_status=payment_status)
            if search:
                bookings = bookings.filter(
                    models.Q(booking_id__icontains=search) |
                    models.Q(customer__name__icontains=search) |
                    models.Q(customer__contact_number__icontains=search)
                )
            
            # Order by created date
            bookings = bookings.order_by('-created_at')
            
            bookings_data = []
            for booking in bookings:
                bookings_data.append({
                    'id': booking.id,
                    'booking_id': booking.booking_id,
                    'customer_name': booking.customer.name if booking.customer else None,
                    'customer_contact': booking.customer.contact_number if booking.customer else None,
                    'visit_date': booking.visit_date,
                    'num_people': booking.num_people,
                    'total_amount': str(booking.total_amount),
                    'commission_amount': str(booking.commission_amount) if user.role == 'seller' else None,
                    'payment_status': booking.payment_status,
                    'payment_method': booking.payment_method,
                    'checked_in': booking.checked_in,
                    'created_at': booking.created_at,
                })
            
            return Response({
                "success": True,
                "data": bookings_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerAccountViewSet(viewsets.ViewSet):
    """
    Customer Account API for profile management and booking history
    """
    
    @handle_exceptions
    @check_authentication()
    def list(self, request):
        """Get customer profile information"""
        try:
            user = request.user
            
            # Only allow customers
            if user.role != 'customer':
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Unauthorized access",
                    "user_not_logged_in": False,
                    "user_unauthorized": True
                }, status=status.HTTP_403_FORBIDDEN)
            
            user_data = {
                'user_id': user.user_id,
                'name': user.name,
                'email': user.email,
                'contact_number': user.contact_number,
                'created_at': user.created_at,
            }
            
            return Response({
                "success": True,
                "data": user_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication()
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """Update customer profile (name and email only)"""
        try:
            user = request.user
            
            # Only allow customers
            if user.role != 'customer':
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Unauthorized access",
                    "user_not_logged_in": False,
                    "user_unauthorized": True
                }, status=status.HTTP_403_FORBIDDEN)
            
            name = request.data.get('name')
            email = request.data.get('email')
            
            if name:
                user.name = name
            if email:
                user.email = email
            
            user.save()
            
            user_data = {
                'user_id': user.user_id,
                'name': user.name,
                'email': user.email,
                'contact_number': user.contact_number,
            }
            
            return Response({
                "success": True,
                "data": user_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @handle_exceptions
    @check_authentication()
    @action(detail=False, methods=['get'])
    def bookings(self, request):
        """Get all bookings for current customer"""
        try:
            user = request.user
            
            # Only allow customers
            if user.role != 'customer':
                return Response({
                    "success": False,
                    "data": None,
                    "error": "Unauthorized access",
                    "user_not_logged_in": False,
                    "user_unauthorized": True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get all bookings for this customer
            bookings = Booking.objects.filter(customer=user).select_related('park').order_by('-created_at')
            
            bookings_data = []
            for booking in bookings:
                bookings_data.append({
                    'id': booking.id,
                    'booking_id': booking.booking_id,
                    'visit_date': booking.visit_date,
                    'num_people': booking.num_people,
                    'total_amount': str(booking.total_amount),
                    'payment_status': booking.payment_status,
                    'payment_method': booking.payment_method,
                    'checked_in': booking.checked_in,
                    'qr_code_path': booking.qr_code_path,
                    'created_at': booking.created_at,
                    'park_name': booking.park.name if booking.park else None,
                })
            
            return Response({
                "success": True,
                "data": bookings_data,
                "error": None,
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "success": False,
                "data": None,
                "error": str(e),
                "user_not_logged_in": False,
                "user_unauthorized": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmailPasswordLoginViewSet(viewsets.ViewSet):
    """
    Email and Password Authentication ViewSet
    POST: Login with email and password
    """

    @handle_exceptions
    def create(self, request):
        """
        API: Email/Password Login
        """
        email = request.data.get("email")
        password = request.data.get("password")
        
        if not email or not password:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Email and password are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Find user by email
        user = User.objects.filter(email=email).first()

        if user is None:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid email or password."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Verify password
        if not check_password(password, user.password):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid email or password."
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Check if user is active
        if not user.is_active:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User account is inactive."
            }, status=status.HTTP_403_FORBIDDEN)

        # Log the user in
        old_session_id = request.session.get('session_token')
        login(request, user)
        new_session_id = request.session.get('session_token')

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "login_success": True,
                "user_id": user.user_id,
                "role": user.role,
                "email": user.email,
                "name": user.name,
                "old_session_id": old_session_id
            },
            "error": None
        }, status=status.HTTP_200_OK)
