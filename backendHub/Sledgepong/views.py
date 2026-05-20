import json
from django.http import HttpResponse, HttpResponseNotAllowed, JsonResponse
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
        return render(request, 'Sledgepong/editor.html', {
            'is_superuser': request.user.is_superuser,
        })
############################################################################################################### <-- this is a divider
def editor_save_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])

    if not request.user.is_authenticated:
        return HttpResponse('Login required', status=401)

    content_type = request.META.get('CONTENT_TYPE', '')
    song_file = None
    if content_type.startswith('multipart/form-data'):
        name = (request.POST.get('name') or '').strip()
        song_url = (request.POST.get('song_url') or '').strip()
        visibility = (request.POST.get('visibility') or 'private').strip()
        level_data_raw = request.POST.get('level_data') or ''
        try:
            level_data = json.loads(level_data_raw) if level_data_raw else None
        except (json.JSONDecodeError, ValueError):
            return HttpResponse('Invalid level_data JSON', status=400)
        song_file = request.FILES.get('song_file')
    else:
        try:
            data = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return HttpResponse('Invalid JSON', status=400)
        name = (data.get('name') or '').strip()
        song_url = (data.get('song_url') or '').strip()
        visibility = (data.get('visibility') or 'private').strip()
        level_data = data.get('level_data')

    if not name:
        return HttpResponse('Level name is required', status=400)
    if not song_file and not song_url:
        return HttpResponse('A song file or song URL is required', status=400)
    if not level_data:
        return HttpResponse('Level data is required', status=400)

    if visibility not in (OnlineLevel.Visibility.PRIVATE, OnlineLevel.Visibility.ONLINE, OnlineLevel.Visibility.ORIGINAL):
        visibility = OnlineLevel.Visibility.PRIVATE

    if visibility == OnlineLevel.Visibility.ORIGINAL and not request.user.is_superuser:
        return HttpResponse('Only superusers can create original levels', status=403)

    player = request.user.sldgpng_player.first()
    if not player:
        player = Player.objects.create(user=request.user)

    OnlineLevel.objects.create(
        name=name,
        creator=player,
        visibility=visibility,
        song_url=song_url or None,
        song_file=song_file,
        level_data=level_data,
    )

    return HttpResponse('Level saved', status=201)
################################################################################################################ <-- this is a divider
def editor_list_view(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])
    if not request.user.is_authenticated:
        return JsonResponse({'levels': []}, status=401)
    player = request.user.sldgpng_player.first()
    if not player:
        return JsonResponse({'levels': []})
    levels = []
    for level in OnlineLevel.objects.filter(creator=player).order_by('-created_at'):
        levels.append({
            'id': level.id,
            'name': level.name,
            'visibility': level.visibility,
            'song_url': level.get_song_url(),
            'created_at': level.created_at.strftime('%Y-%m-%d %H:%M'),
            'level_data': level.level_data,
        })
    return JsonResponse({'levels': levels})
################################################################################################################ <-- this is a divider
def levels_view(request):
    if request.method == 'GET':
        return render(request, 'Sledgepong/levels.html')
################################################################################################################ <-- this is a divider
def levels_original_view(request):
    if request.method == 'GET':
        payload = []
        for level in Level.objects.all().order_by("id"):
            payload.append({
                "name": level.name,
                "data": level.level_data,
                "difficulty": level.difficulty,
                "duration": level.duration,
                "soundtrack": level.soundtrack,
                "artist": level.artist,
                "song_url": None,
            })
        for level in OnlineLevel.objects.filter(visibility=OnlineLevel.Visibility.ORIGINAL).order_by("created_at"):
            creator_name = level.creator.user.username if level.creator and level.creator.user else None
            payload.append({
                "name": level.name,
                "data": level.level_data,
                "difficulty": None,
                "duration": level.level_data.get("durationSeconds") if isinstance(level.level_data, dict) else None,
                "soundtrack": None,
                "artist": creator_name,
                "song_url": level.get_song_url(),
            })
        return render(request, 'Sledgepong/levels_original.html', {"levels_payload": payload})
################################################################################################################ <-- this is a divider
def levels_online_view(request):
    if request.method == 'GET':
        levels = OnlineLevel.objects.filter(visibility=OnlineLevel.Visibility.ONLINE).order_by("-created_at")
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
                "song_url": level.get_song_url(),
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
                "song_url": level.get_song_url(),
                "visibility": level.visibility,
            })
        return render(request, 'Sledgepong/levels_mine.html', {"levels_payload": payload})
################################################################################################################ <-- this is a divider

def options_view(request):
    if request.method == 'GET':
        return render(request, 'Sledgepong/optionpage.html')
################################################################################################################ <-- this is a divider
