from rest_framework.serializers import ModelSerializer, CharField, ValidationError , ImageField
from django.contrib.auth.models import User

from app.models import *



class SignupSerializer(ModelSerializer):
    password = CharField(write_only=True)
    password2 = CharField(write_only=True)  # Confirm password

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user



class ContactListSerializer(ModelSerializer):
    login_user = CharField(source='user.username', read_only=True)
    name = CharField(source='contacts.username', read_only=True)
    avatar = ImageField(source='contacts.userprofile.profile_photo', read_only=True)  # get profile photo of contact user

    class Meta:
        model = ContactList
        fields = ['login_user', 'name', 'avatar']



class PrivateKeySerializer ( ModelSerializer) : 

    class Meta : 

        model = UserProfile
        fields = ['private_key']


class UserSerializer(ModelSerializer):
    private_key = PrivateKeySerializer(source='userprofile', read_only=True)
    profile_photo = ImageField(source='userprofile.profile_photo', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'private_key', 'profile_photo']
        read_only_fields = ['id', 'private_key', 'profile_photo']  # Make these fields read-only



class MessageSerializer( ModelSerializer) :
  
    sender = CharField(source='sender.username', read_only=True)  # Add sender username
    receiver = CharField(source='receiver.username', read_only=True)  # Add receiver username
    

    class Meta:

        model = Message
        fields = ['id', 'room_name', 'message', 'sender', 'receiver', 'timestamp']
        read_only_fields = ['id', 'timestamp']
        extra_kwargs = {
            'room_name': {'write_only': True},  # Hide room_name from output
        }





class UploadedFileSerializer(ModelSerializer):
    sender = CharField(source='sender.username', read_only=True)  # Add sender username
    receiver = CharField(source='receiver.username', read_only=True)  # Add receiver username

    class Meta:

        model = UploadedFile
        fields = '__all__'
        extra_kwargs = {
            'room_name': {'write_only': True},  # Hide room_name from output
        }




class TextMessageSerializer(ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'

class FileMessageSerializer(ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'