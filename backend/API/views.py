# views.py
from django.utils import timezone
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny , IsAuthenticated
from rest_framework.serializers import ModelSerializer, CharField, ValidationError
from app.models import OTP, ContactList, UserProfile
from .serializers import *
from django.core.mail import send_mail
from django.conf import settings
import random

def generate_otp(length=4):
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def generate_otp(length=6):
    return ''.join(str(random.randint(0, 9)) for _ in range(length))


class SendOtpView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=400)

        otp_code = generate_otp()

        # Update or create OTP entry
        otp_obj, created = OTP.objects.update_or_create(
            email=email,
            defaults={'otp_code': otp_code, 'created_at': timezone.now()}
        )

        try:
            send_mail(
                'Your OTP Code',
                f'Your OTP is {otp_code}',
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )
        except Exception as e:
            return Response({"error": f"Failed to send email: {str(e)}"}, status=500)

        return Response({"message": "OTP sent successfully"}, status=200)


class VerifyOtpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        username = request.data.get('username')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not email or not otp:
            return Response({"error": "Email and OTP are required"}, status=400)

        try:
            otp_obj = OTP.objects.get(email=email)
        except OTP.DoesNotExist:
            return Response({"error": "OTP not found, please request a new one."}, status=400)

        if otp_obj.is_expired():
            return Response({"error": "OTP expired, please request a new one."}, status=400)

        if otp_obj.otp_code != otp:
            return Response({"error": "Invalid OTP."}, status=400)

        # OTP is valid — you can delete it now or keep for auditing
        otp_obj.delete()

        user = User.objects.create(
            first_name = first_name , 
            last_name = last_name , 
            username = username , 
            email = email
        )

        user.set_password( password)

        user.save()

        

        # Return success — your frontend can proceed with signup or JWT login flow
        return Response({"message": "OTP verified successfully."}, status=200)
    



class ContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        contacts = ContactList.objects.filter(user = request.user)
        serializer = ContactListSerializer(contacts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post( self , request ) :

        data = json.loads(request.body)
        private_key = data.get('privateKey')

        print("private" , data)

        u_profile = UserProfile.objects.get(private_key = private_key)
        c_user = User.objects.get(username = u_profile.user )

        if ContactList.objects.filter( user = request.user).filter( contacts = c_user) : 

            return Response({ "error" : "This contact is already exist"} , status=status.HTTP_409_CONFLICT)

        contacts = ContactList.objects.create(user = request.user , contacts = c_user)


        return Response({"message" : "Contact Successfully Added"}, status=status.HTTP_200_OK)
    

   



class UserPrivateKeyView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            user_profile = UserProfile.objects.get(user=user)
            
        except UserProfile.DoesNotExist:

            return Response(
                {"message": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PrivateKeySerializer(user_profile)
        return Response(serializer.data, status=status.HTTP_200_OK)