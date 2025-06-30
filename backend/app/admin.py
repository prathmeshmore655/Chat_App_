from django.contrib import admin
from .models import OTP, UserProfile, ContactList, Message, UploadedFile

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'otp_code', 'created_at', 'is_expired')
    search_fields = ('email', 'otp_code')
    readonly_fields = ('created_at',)

    def is_expired(self, obj):
        return obj.is_expired()
    is_expired.boolean = True  # Show as a check/cross icon


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'private_key', 'phone_number')
    search_fields = ('user__username', 'phone_number')


@admin.register(ContactList)
class ContactListAdmin(admin.ModelAdmin):
    list_display = ('user', 'contacts')
    search_fields = ('user__username', 'contacts__username')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('room_name', 'sender', 'receiver', 'timestamp')
    search_fields = ('room_name', 'sender__username', 'receiver__username')
    list_filter = ('timestamp',)


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ('room_name', 'file_name', 'file_type', 'message', 'file', 'sender', 'receiver', 'size', 'timestamp')
    search_fields = ('file_name', 'room_name', 'sender__username', 'receiver__username')
    list_filter = ('file_type', 'timestamp')
