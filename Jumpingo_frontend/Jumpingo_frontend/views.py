from django.shortcuts import render, redirect



def home(request):
    return render(request, 'index.html')


def about(request):
    return render(request, 'about_us.html')


def attractions(request):
    return render(request, 'attractions.html')


def contact(request):
    return render(request, 'contact.html')


def privacy_policy(request):
    return render(request, 'privacy_policy.html')


def ticket(request):
    return render(request, 'ticket.html')
