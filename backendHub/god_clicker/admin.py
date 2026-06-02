from django.contrib import admin

from .models import God, GodClickerPlayer


@admin.register(God)
class GodAdmin(admin.ModelAdmin):
    list_display = ("name", "title", "base_cost", "favor_per_click_bonus", "favor_per_second", "sort_order")
    list_editable = ("base_cost", "favor_per_click_bonus", "favor_per_second", "sort_order")
    search_fields = ("name", "title")


@admin.register(GodClickerPlayer)
class GodClickerPlayerAdmin(admin.ModelAdmin):
    list_display = ("user", "favor", "total_clicks", "favor_per_click", "last_synced")
    search_fields = ("user__username",)
    filter_horizontal = ("gods",)
