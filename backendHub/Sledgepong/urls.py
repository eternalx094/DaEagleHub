from django.urls import path
from .views import menu_view, playpage_view, game_view, shop_view, shop_buy_view, shop_equip_view, editor_view, \
    levels_view

urlpatterns = [
    path("", menu_view, name="Sledgepong"),
    path("playpage/", playpage_view, name="playpage"),
    path("playpage/levels/game", game_view, name="game"),
    path("playpage/levels/", levels_view, name="levels"),
    path("shop/", shop_view, name="shop"),
    path("shop/buy/<texture_id>/", shop_buy_view, name="buy-texture"),
    path("shop/equip/<texture_id>/", shop_equip_view, name="equip-texture"),
    path("playpage/editor", editor_view, name="editor")
]