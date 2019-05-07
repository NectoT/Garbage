from email.message import EmailMessage, MIMEPart
import smtplib
from argparse import ArgumentParser
from django.contrib.auth.hashers import make_password

if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('email', help="No help for you")
    parser.add_argument('html')
    parser.add_argument('password')

    args = parser.parse_args()

    receiver = args.email
    sender = "nectot2@gmail.com"
    sender_password = "necto2002456123"
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(sender, sender_password)

    part = MIMEPart()

    message = EmailMessage()
    message.set_content(args.html, 'html')
    message['Subject'] = "Смена пароля"
    message["From"] = sender
    message["To"] = receiver

    server.send_message(message)
