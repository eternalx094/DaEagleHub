from django.contrib.auth import logout
from django.urls import path
from .views import hub_view, profile_view, logout_view, user_login, signup

urlpatterns = [
    path('', hub_view, name='hub_view'),
    path('profile/', profile_view, name='profile_view'),
    path('logout/', logout_view, name='logout'),
    path('login/', user_login, name='user_login'),
    path('signup/', signup, name='signup'),
]
