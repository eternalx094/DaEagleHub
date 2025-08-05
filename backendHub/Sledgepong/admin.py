from django.contrib import admin
from .models import Texture, Player
############################################
@admin.register(Texture)
class TextureAdmin(admin.ModelAdmin):
    list_display = ('name', 'texture_img',)
    search_fields = ('name',)
##############################################
@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('user', 'coins', 'curtexture',)
    search_fields = ('user',)
    filter_horizontal = ('collection',)
