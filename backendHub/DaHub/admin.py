from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Application, CustomUser


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('name', 'logo_img',)
    search_fields = ('name',)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):  # 👈 CHANGE THIS
    model = CustomUser
    list_display = ('username', 'email', 'coins', 'is_staff')
