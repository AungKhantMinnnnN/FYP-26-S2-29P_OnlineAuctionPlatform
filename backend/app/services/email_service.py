import smtplib
from email.mime.text import MIMEText

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL = "your_email@gmail.com"
PASSWORD = "your_app_password"

def send_otp_email(receiver: str, otp: str):
    msg = MIMEText(f"Your AuctionHub password reset code is: {otp}")
    msg["Subject"] = "AuctionHub Password Reset"
    msg["From"] = EMAIL
    msg["To"] = receiver

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)