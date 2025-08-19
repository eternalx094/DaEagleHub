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
    return render(request, 'Sledgepong/shop.html', context={"textures": textures})
################################################################################################################ <-- this is a divider