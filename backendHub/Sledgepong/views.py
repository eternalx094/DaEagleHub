from django.shortcuts import render
from .models import Texture
#################################################################################################################
def playpage_view(request):
    return render(request, 'Sledgepong/playpage.html')
############################################################################################################### <-- this is a divider
def menu_view(request):
        return render(request, 'Sledgepong/menu.html')
############################################################################################################### <-- this is a divider
def singles_view(request):
    return render(request, 'Sledgepong/singles.html')
############################################################################################################### <-- this is a divider
def shop_view(request):
    textures = Texture.objects.all()
    return render(request, 'Sledgepong/shop.html', context={"textures": textures})
################################################################################################################ <-- this is a divider