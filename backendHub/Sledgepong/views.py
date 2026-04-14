from django.http import HttpResponse, HttpResponseNotAllowed
from django.shortcuts import render
from .models import Texture, Player, Level, OnlineLevel
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
    current_texture = player.curtexture if player else None

    # Get collected textures but exclude the currently equipped one
    if current_texture:
        collected_textures = player.collection.exclude(id=current_texture.id)
    else:
        collected_textures = player.collection.all() if player else Texture.objects.none()

    non_collected_textures = textures.exclude(id__in=player.collection.values_list('id', flat=True)) if player else textures

    return render(request, 'Sledgepong/shop.html', context={
        'textures': textures,
        'coins': coins,
        'collected_textures': collected_textures,
        'non_collected_textures': non_collected_textures,
        'current_texture': current_texture,
    })################################################################################################################ <-- this is a divider
def shop_buy_view(request, texture_id):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    user = request.user
    try:
        texture = Texture.objects.get(id=texture_id)
    except Texture.DoesNotExist:
        return HttpResponse('Wrong Texture ID')
    if user.coins < 10:
        return HttpResponse('Not Enough Money')

    player = user.sldgpng_player.first()
    if not player:
        player = Player.objects.create(user=user)

    user.coins -= 10
    user.save()
    player.collection.add(texture)
    return HttpResponse('Transaction Successful')
################################################################################################################ <-- this is a divider
def shop_equip_view(request, texture_id):
    if request.method == 'POST':
        user = request.user
        player = user.sldgpng_player.first()
        try:
            texture = Texture.objects.get(id=texture_id)
            # Check if player owns this texture
            if player and texture in player.collection.all():
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
def levels_original_view(request):
    if request.method == 'GET':
        levels = Level.objects.all().order_by("id")
        payload = []
        for level in levels:
            payload.append({
                "name": level.name,
                "data": level.level_data,
                "difficulty": level.difficulty,
                "duration": level.duration,
                "soundtrack": level.soundtrack,
                "artist": level.artist,
            })
        return render(request, 'Sledgepong/levels_original.html', {"levels_payload": payload})
################################################################################################################ <-- this is a divider
def levels_online_view(request):
    if request.method == 'GET':
        levels = OnlineLevel.objects.filter(is_public=True).order_by("-created_at")
        payload = []
        for level in levels:
            creator_name = None
            if level.creator and level.creator.user:
                creator_name = level.creator.user.username
            payload.append({
                "name": level.name,
                "data": level.level_data,
                "creator": creator_name,
                "created_at": level.created_at.strftime("%Y-%m-%d"),
                "plays": level.plays,
                "likes": level.likes,
                "song_url": level.song_url,
            })
        return render(request, 'Sledgepong/levels_online.html', {"levels_payload": payload})
################################################################################################################ <-- this is a divider
def levels_mine_view(request):
    if request.method == 'GET':
        user = request.user
        player = None
        if getattr(user, "is_authenticated", False):
            player = user.sldgpng_player.first()
        levels = OnlineLevel.objects.filter(creator=player).order_by("-created_at") if player else []
        payload = []
        for level in levels:
            payload.append({
                "name": level.name,
                "data": level.level_data,
                "created_at": level.created_at.strftime("%Y-%m-%d"),
                "plays": level.plays,
                "likes": level.likes,
                "song_url": level.song_url,
                "is_public": level.is_public,
            })
        return render(request, 'Sledgepong/levels_mine.html', {"levels_payload": payload})
################################################################################################################ <-- this is a divider

def options_view(request):
    if request.method == 'GET':
        return render(request, 'Sledgepong/optionpage.html')
################################################################################################################ <-- this is a divider
