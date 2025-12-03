import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

sender = "booking@jumpingo.in"
app_password = "wbjkfjcfpvwzfwyk"
receiver = "divyamshah1234@gmail.com"

msg = MIMEMultipart()
msg["From"] = sender
msg["To"] = receiver
msg["Subject"] = "Test Email"

msg.attach(MIMEText("Hello from Python!", "plain"))

smtp_server = "smtp.office365.com"
smtp_port = 587

with smtplib.SMTP(smtp_server, smtp_port) as server:
    server.starttls()
    server.login(sender, app_password)
    server.sendmail(sender, receiver, msg.as_string())

print("Email sent!")
