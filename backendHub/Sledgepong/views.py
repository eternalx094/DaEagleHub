from django.shortcuts import render
from .models import Texture
from .models import Player
############################################################################################################### <-- this is a divider
def playpage_view(request):
    return render(request, 'Sledgepong/playpage.html')
############################################################################################################### <-- this is a divider
def menu_view(request):
    user = request.user
    sldgpng_player = Player.objects.filter(user=user).first()
    if not sldgpng_player:
        Player.objects.create(user=user)
    return render(request, 'Sledgepong/menu.html')
############################################################################################################### <-- this is a divider
def singles_view(request):
    return render(request, 'Sledgepong/singles.html')
############################################################################################################### <-- this is a divider
def shop_view(request):
    textures = Texture.objects.all()
    user = request.user
    coins = user.coins
    collected_textures = user.sldgpng_player.first().collection
    current_texture = user.sldgpng_player.first().curtexture
    return render(request, 'Sledgepong/shop.html', context={
                                                            'textures': textures,
                                                            'coins': coins,
                                                            'collected_textures': collected_textures,
                                                            'current_texture': current_texture,
})
################################################################################################################ <-- this is a divider