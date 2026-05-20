from django.urls import path
from .views import menu_view, playpage_view, game_view, shop_view, shop_buy_view, shop_equip_view, editor_view, \
    editor_save_view, editor_list_view, levels_view, options_view, levels_original_view, levels_online_view, \
    levels_mine_view

urlpatterns = [
    path("", menu_view, name="Sledgepong"),
    path("playpage/", playpage_view, name="playpage"),
    path("playpage/levels/game", game_view, name="game"),
    path("playpage/levels/", levels_view, name="levels"),
    path("playpage/levels/original/", levels_original_view, name="levels-original"),
    path("playpage/levels/online/", levels_online_view, name="levels-online"),
    path("playpage/levels/mine/", levels_mine_view, name="levels-mine"),
    path("options/", options_view, name="options"),
    path("shop/", shop_view, name="shop"),
    path("shop/buy/<texture_id>/", shop_buy_view, name="buy-texture"),
    path("shop/equip/<texture_id>/", shop_equip_view, name="equip-texture"),
    path("playpage/editor", editor_view, name="editor"),
    path("playpage/editor/save/", editor_save_view, name="editor-save"),
    path("playpage/editor/list/", editor_list_view, name="editor-list"),
]
