from django.urls import path
from .views import menu_view, playpage_view, singles_view, shop_view

urlpatterns = [
    path("", menu_view, name="Sledgepong"),
    path("playpage/", playpage_view, name="playpage"),
    path("playpage/singles/", singles_view, name="singles"),
    path("shop/", shop_view, name="shop"),
]