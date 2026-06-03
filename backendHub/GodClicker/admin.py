from django.contrib import admin
from .models import GodPlayer


############################################
@admin.register(GodPlayer)
class GodPlayerAdmin(admin.ModelAdmin):
    list_display = ('user', 'faith', 'total_faith', 'click_power', 'updated_at')
    search_fields = ('user__username',)
