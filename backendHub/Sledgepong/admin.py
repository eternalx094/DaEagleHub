from django.contrib import admin
from .models import Texture, Player, Level, OnlineLevel


############################################
@admin.register(Texture)
class TextureAdmin(admin.ModelAdmin):
    list_display = ('name', 'texture_img',)
    search_fields = ('name',)
##############################################
@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('user', 'curtexture',)
    search_fields = ('user',)
    filter_horizontal = ('collection',)
##############################################
@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'soundtrack', 'artist', 'creator', 'difficulty', 'duration')
    search_field = ('name', 'creator', 'soundtrack')
##############################################
@admin.register(OnlineLevel)
class OnlineLevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'visibility', 'song_url', 'plays', 'likes', 'created_at')
    list_filter = ('visibility',)
    search_fields = ('name',)