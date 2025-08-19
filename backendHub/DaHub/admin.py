from django.contrib import admin
from .models import Application, CustomUser
###################################################################
@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('name', 'logo_img',)
    search_fields = ('name',)
###################################################################
@admin.register(CustomUser)  # This decorator tells Django to use this admin class
class CustomUserAdmin(admin.ModelAdmin):  # This inheritance is crucial!
    list_display = ('username', )  # What fields to show in the list view
    search_fields = ('username', 'email')  # What fields can be searched