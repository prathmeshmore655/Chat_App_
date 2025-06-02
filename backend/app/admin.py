from django.contrib import admin

from app.models import *

# Register your models here.


admin.site.register(OTP)
admin.site.register(ContactList)

class userProfileTable( admin.ModelAdmin):

    list_display = ('user', 'private_key', 'profile_photo', 'phone_number')
    search_fields = ('user', 'private_key', 'profile_photo', 'phone_number')
    


admin.site.register(UserProfile , userProfileTable )
admin.site.register(Message)
admin.site.register(UploadedFile)