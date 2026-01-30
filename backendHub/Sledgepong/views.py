from django.http import HttpResponse
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
def game_view(request):
    user = request.user
    player = user.sldgpng_player.first()
    return render(request, 'Sledgepong/game.html', {
        "coins": getattr(user, "coins", 0),
        "current_texture": player.curtexture.texture_img.url if player and player.curtexture else None,
    })
############################################################################################################### <-- this is a divider
def shop_view(request):
    textures = Texture.objects.all()
    user = request.user
    coins = user.coins
    player = user.sldgpng_player.first()
    current_texture = player.curtexture

    # Get collected textures but exclude the currently equipped one
    collected_textures = player.collection.exclude(id=current_texture.id)
    non_collected_textures = textures.exclude(id__in=player.collection.values_list('id', flat=True))

    return render(request, 'Sledgepong/shop.html', context={
        'textures': textures,
        'coins': coins,
        'collected_textures': collected_textures,
        'non_collected_textures': non_collected_textures,
        'current_texture': current_texture,
    })################################################################################################################ <-- this is a divider
def shop_buy_view(request, texture_id):
    if request.method == 'GET':
        user = request.user
        try:
            texture = Texture.objects.get(id=texture_id)
        except Texture.DoesNotExist:
            return HttpResponse('Wrong Texture ID')
        if user.coins < 10:
            return HttpResponse('Not Enough Money')
        user.coins -= 10
        user.save()
        player = user.sldgpng_player.first()
        player.collection.add(texture)
        return HttpResponse('Transaction Successful')
    else:
        return HttpResponse('POST only')
################################################################################################################ <-- this is a divider
def shop_equip_view(request, texture_id):
    if request.method == 'POST':
        user = request.user
        player = user.sldgpng_player.first()
        try:
            texture = Texture.objects.get(id=texture_id)
            # Check if player owns this texture
            if texture in player.collection.all():
                player.curtexture = texture
                player.save()
                return HttpResponse('Texture Equipped')
            else:
                return HttpResponse('Texture Not Owned')
        except Texture.DoesNotExist:
            return HttpResponse('Wrong Texture ID')
    else:
        return HttpResponse('POST only')
################################################################################################################ <-- this is a divider
def editor_view(request):
    if request.method == 'GET':
        return render(request, 'Sledgepong/editor.html')
################################################################################################################ <-- this is a divider
def levels_view(request):
    if request.method == 'GET':
        return render(request, 'Sledgepong/levels.html')
################################################################################################################ <-- this is a divider

