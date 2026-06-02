from django.shortcuts import render

from .models import God, GodClickerPlayer


def index_view(request):
    player = None
    owned_god_ids = set()
    if request.user.is_authenticated:
        player, _ = GodClickerPlayer.objects.get_or_create(user=request.user)
        owned_god_ids = set(player.gods.values_list("id", flat=True))
    return render(request, "god_clicker/index.html", {
        "player": player,
        "gods": God.objects.all(),
        "owned_god_ids": owned_god_ids,
    })
