from django.contrib.auth import logout, views as auth_views
from django.urls import path
from django.urls import reverse_lazy
from .views import hub_view, profile_view, logout_view, user_login, signup, ads_txt_view

urlpatterns = [
    path('', hub_view, name='hub_view'),
    path('ads.txt', ads_txt_view, name='ads_txt'),
    path('profile/', profile_view, name='profile_view'),
    path('logout/', logout_view, name='logout'),
    path('login/', user_login, name='user_login'),
    path('signup/', signup, name='signup'),
    path(
        'password-reset/',
        auth_views.PasswordResetView.as_view(
            template_name='DaHub/password_reset.html',
            email_template_name='DaHub/password_reset_email.txt',
            subject_template_name='DaHub/password_reset_subject.txt',
            success_url=reverse_lazy('password_reset_done'),
        ),
        name='password_reset',
    ),
    path(
        'password-reset/done/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='DaHub/password_reset_done.html',
        ),
        name='password_reset_done',
    ),
    path(
        'reset/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='DaHub/password_reset_confirm.html',
            success_url=reverse_lazy('password_reset_complete'),
        ),
        name='password_reset_confirm',
    ),
    path(
        'reset/done/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='DaHub/password_reset_complete.html',
        ),
        name='password_reset_complete',
    ),
]
