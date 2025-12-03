import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587

BOOKING_SENDER = "booking@jumpingo.in"
SUPPORT_SENDER = "support@jumpingo.in"

BOOKING_APP_PASSWORD = "hyknwlvnpjpmpywj"  # Booking password
SUPPORT_APP_PASSWORD = "dwyzclgglrhrjsvp"  # Support password

DEFAULT_RECEIVER = "divyamshah1234@gmail.com"


def send_email(sender, password, receiver, subject, body):
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = sender
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(sender, password)
        server.sendmail(sender, sender, msg.as_string())

    print(f"Email sent from {sender}!")


def send_booking_email(name, number, tickets, date, receiver=DEFAULT_RECEIVER):
    subject = "New Booking Request"

    body = f"""
New Booking Request:

Name: {name}
Contact Number: {number}
Number of Tickets: {tickets}
Selected Date: {date}
    """.strip()

    send_email(
        sender=BOOKING_SENDER,
        password=BOOKING_APP_PASSWORD,
        receiver=receiver,
        subject=subject,
        body=body
    )


def send_support_email(name, email, number, message, reason, receiver=DEFAULT_RECEIVER):
    subject = f"Support Request - {reason}"

    body = f"""
New Support Request:

Name: {name}
Email: {email}
Contact Number: {number}
Reason: {reason}

Message:
{message}
    """.strip()

    send_email(
        sender=SUPPORT_SENDER,
        password=SUPPORT_APP_PASSWORD,
        receiver=receiver,
        subject=subject,
        body=body
    )


if __name__ == '__main__':
    send_booking_email(
        name="John Doe",
        number="9876543210",
        tickets=4,
        date="2025-12-05"
    )

    send_support_email(
        name="John Doe",
        email="john@example.com",
        number="9876543210",
        message="I need help with my booking.",
        reason="Booking Issue"
    )
