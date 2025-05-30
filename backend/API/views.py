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
import logging
from django.core.exceptions import ObjectDoesNotExist
from uuid import UUID

logger = logging.getLogger(__name__)

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
        try:
            contacts = ContactList.objects.filter(user=request.user)
            serializer = ContactListSerializer(contacts, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching contact list for user {request.user.id}: {str(e)}")
            return Response({"error": "Failed to retrieve contacts."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def post(self, request):
        private_key = request.data.get("privateKey")

        if not private_key:
            return Response({"error": "privateKey is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate UUID format
        try:
            private_key_uuid = UUID(private_key)
        except ValueError:
            return Response({"error": "Invalid private key format."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent user from adding themselves
        if private_key_uuid == request.user.userprofile.private_key:
            return Response({"error": "You can't add yourself as a contact."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_profile = UserProfile.objects.get(private_key=private_key_uuid)
        except UserProfile.DoesNotExist:
            return Response({"error": "No user found with the given private key."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching UserProfile with privateKey: {str(e)}")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        contact_user = user_profile.user

        if ContactList.objects.filter(user=request.user, contacts=contact_user).exists():
            return Response({"error": "This contact already exists."}, status=status.HTTP_409_CONFLICT)

        try:
            ContactList.objects.create(user=request.user, contacts=contact_user)
            return Response({"message": "Contact successfully added."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Failed to create contact for user {request.user.id}: {str(e)}")
            return Response({"error": "Failed to add contact."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



class UserPrivateKeyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            user_profile = UserProfile.objects.get(user=user)
        except ObjectDoesNotExist:
            logger.warning(f"UserProfile not found for user: {user.id}")
            return Response(
                {"message": "User profile not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error retrieving UserProfile for user {user.id}: {str(e)}")
            return Response(
                {"message": "An unexpected error occurred while retrieving the user profile."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            serializer = PrivateKeySerializer(user_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Serialization error for user {user.id}: {str(e)}")
            return Response(
                {"message": "An error occurred while serializing the data."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        



class GetUserView ( APIView) : 

    permission_classes = [IsAuthenticated]

    def get ( self , request ) : 

        user = request.user

        if not user:
            return Response({"error": "User is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=user.username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching user {user.username}: {str(e)}")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class MessageListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, contact):
        if not contact:
            return Response({"error": "Contact is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:

            print("contact" , contact)

            messages = Message.objects.filter(room_name=contact).order_by('timestamp')

        except User.DoesNotExist:
            return Response({"error": "Contact not found."}, status=status.HTTP_404_NOT_FOUND)

        
        serializer = MessageSerializer(messages, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)