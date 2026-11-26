from django.shortcuts import render, redirect
from django.http import JsonResponse
from .send_email import *
from utils.encrypt_decrypt import base64_to_text

def home(request):
    return render(request, 'index.html')


def about(request):
    return render(request, 'about_us.html')


def attractions(request):
    return render(request, 'attractions.html')

def bulk_booking(request):
    return render(request, 'bulk_booking.html')


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


import resend
from django.views.decorators.http import require_POST

resend.api_key = base64_to_text("cmVfN2R1ZldNdGlfRWZZWGZjMzk4d2JUbVJRMmJGS0VZdGFI")
IGNORED_FIELDS = {"csrfmiddlewaretoken", "reason"}


def _label(key):
    return key.replace("_", " ").replace("-", " ").strip().title()


@require_POST
def send_bulk_booking_email_req(request):    
    data = {
        key: ", ".join(v.strip() for v in request.POST.getlist(key) if v.strip())
        for key in request.POST
        if key not in IGNORED_FIELDS
    }
    data = {k: v for k, v in data.items() if v}

    if not data:
        return JsonResponse({"success": False, "error": "Empty form"}, status=400)

    lines = ["New Bulk Booking Enquiry", "-" * 28]
    lines += [f"{_label(k)}: {v}" for k, v in data.items()]
    body = "\n".join(lines)

    category = data.get("category", "General")
    name = data.get("full_name", "Unknown")
    subject = f"Bulk Booking - {category} - {name}".replace("\n", " ").replace("\r", " ")[:150]

    payload = {
        "from": "onboarding@resend.dev",
        "to": ["booking@jumpingo.in"],
        "subject": subject,
        "text": body,
    }
    if data.get("email"):
        payload["reply_to"] = data["email"]

    try:
        resend.Emails.send(payload)
    except Exception as exc:
        print("Resend error:", exc)
        return JsonResponse({"success": False}, status=500)

    return JsonResponse({"success": True})


@require_POST
def send_resend_contact_email_req(request):    
    data = {
        key: ", ".join(v.strip() for v in request.POST.getlist(key) if v.strip())
        for key in request.POST
        if key not in IGNORED_FIELDS
    }
    data = {k: v for k, v in data.items() if v}

    if not data:
        return JsonResponse({"success": False, "error": "Empty form"}, status=400)

    lines = ["New Contact Enquiry", "-" * 28]
    lines += [f"{_label(k)}: {v}" for k, v in data.items()]
    body = "\n".join(lines)
    
    name = data.get("full_name", "Unknown")
    subject = f"Contact Form - {name}".replace("\n", " ").replace("\r", " ")[:150]

    payload = {
        "from": "onboarding@resend.dev",
        "to": ["booking@jumpingo.in"],
        "subject": subject,
        "text": body,
    }
    if data.get("email"):
        payload["reply_to"] = data["email"]

    try:
        resend.Emails.send(payload)
    except Exception as exc:
        print("Resend error:", exc)
        return JsonResponse({"success": False}, status=500)

    return JsonResponse({"success": True})
