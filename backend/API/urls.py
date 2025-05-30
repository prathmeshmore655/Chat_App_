from django.urls import path  # Correct import from django.urls
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import *

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('signup/send-otp/', SendOtpView.as_view(), name='send_otp'),
    path('signup/verify-otp/', VerifyOtpView.as_view(), name='verify_otp'),
    path('contacts/', ContactListView.as_view(), name='contact_list'),
    path('user/private-key/', UserPrivateKeyView.as_view(), name='user_private_key'),
    path('get-user/', GetUserView.as_view(), name='get_user'),
    path('messages/<str:contact>/', MessageListView.as_view(), name='message_list'),
]
