from rest_framework import viewsets, status
from rest_framework.response import Response

from django.utils.dateparse import parse_date

from utils.decorators import handle_exceptions  # your custom decorators
from django.shortcuts import render, redirect
from functools import wraps
from django.contrib.auth import authenticate, login, logout


def check_authentication(required_role=None):
    '''Checks if user is logged in or not.
    If required_role is passed (as str or list), will check for that as well.'''
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(self, request, *args, **kwargs):
            user = request.user
            session_info = {}

            if hasattr(request, 'session'):
                session_info = {
                    'session_key': request.session.session_key,
                    'session_expiry': request.session.get_expiry_date(),
                    'session_data_keys': list(request.session.keys()),
                }

            if not user.is_authenticated:
                # logger.warning(f"Unauthenticated access attempt: {request.path}")
                return redirect('login-list')

            if required_role:
                # Convert to list if it's a string
                allowed_roles = required_role if isinstance(required_role, (list, tuple, set)) else [required_role]
                
                if getattr(user, "role", None) not in allowed_roles:
                    # logger.warning(
                    #     f"Unauthorized access: User {user.id} role {user.role} "
                    #     f"required {allowed_roles}"
                    # )
                    return Response(
                        {
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": True,
                            "data": None,
                            "error": f"User role must be one of {allowed_roles}"
                        }, status=status.HTTP_403_FORBIDDEN
                    )

            return view_func(self, request, *args, **kwargs)

        return _wrapped_view
    return decorator


class LoginViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'login_with_email.html')
        return render(request, 'login.html')

class LogoutViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        logout(request)
        return redirect('login-list')


class BookingViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'booking.html')


class CheckInViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'checkin.html')


class AccountViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'account.html')


class SecurityScannerViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'security_scanner.html')


class RideScannerViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'ride_scanner.html')

class SocksScannerViewSet(viewsets.ViewSet):

    @handle_exceptions
    def list(self, request):
        return render(request, 'sock_scanner.html')

### Dashboards ###
class AdminDashboardViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'admin_dashboard.html')

class SellerDashboardViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'seller_dashboard.html')


class PreBookingViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'prebooking.html')

class InvitePreBookingViewSet(viewsets.ViewSet):

    @handle_exceptions
    @check_authentication()
    def list(self, request):
        return render(request, 'invite_prebooking.html')

class LogoutViewSet(viewsets.ViewSet):

    # @handle_exceptions
    # @check_authentication()
    def list(self, request):
        try:
            logout(request)
        except Exception as e:
            # logger.error(f"Error during logout: {str(e)}")
            pass  # Even if logout fails, we want to redirect to login page
        return redirect('login-list')
