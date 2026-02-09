from django.shortcuts import render, redirect
from django.http import JsonResponse
from .send_email import *

def home(request):
    return render(request, 'index.html')


def about(request):
    return render(request, 'about_us.html')


def attractions(request):
    return render(request, 'attractions.html')


def contact(request):
    return render(request, 'contact.html')

def gallery(request):
    return render(request, 'gallery.html')

def get_in_touch(request):
    return render(request, 'get_in_touch.html')

def privacy_policy(request):
    return render(request, 'privacy_policy.html')


def ticket(request):
    return render(request, 'ticket.html')

def send_contact_email_req(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        email = request.POST.get('email')
        number = request.POST.get('number')
        message = request.POST.get('message')
        reason = request.POST.get('reason')
        print(request.POST)
        send_support_email(
            name=name,
            email=email,
            number=number,
            message=message,
            reason=reason,
        )

        return JsonResponse({'success': True})

def send_booking_email_req(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        number = request.POST.get('number')
        tickets = request.POST.get('tickets')
        date = request.POST.get('date')
        send_booking_email(
            name=name, 
            number=number, 
            tickets=tickets, 
            date=date            
        )
        return JsonResponse({'success': True})
