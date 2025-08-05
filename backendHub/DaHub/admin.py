from django.contrib import admin
###################################################################
from .models import Application
###################################################################
@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('name', 'logo_img',)
    search_fields = ('name',)
###################################################################
