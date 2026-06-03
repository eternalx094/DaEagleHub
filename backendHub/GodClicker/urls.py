from django.urls import path
from .views import menu_view, game_view, save_view, load_view, reset_view, rebirth_view

urlpatterns = [
    path("", menu_view, name="GodClicker"),
    path("play/", game_view, name="godclicker-game"),
    path("save/", save_view, name="godclicker-save"),
    path("load/", load_view, name="godclicker-load"),
    path("reset/", reset_view, name="godclicker-reset"),
    path("rebirth/", rebirth_view, name="godclicker-rebirth"),
]
