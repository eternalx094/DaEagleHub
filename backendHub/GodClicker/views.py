import json
from django.http import HttpResponse, HttpResponseNotAllowed, JsonResponse
from django.shortcuts import render
from .models import GodPlayer
############################################################################################################### <-- this is a divider
# The catalogue is the server-side source of truth for what can be bought.
# Generators auto-produce Faith every second; cost grows by `growth` per unit owned.
GENERATORS = [
    {"id": "worshipper", "glyph": "\U0001F64F", "name": "Worshipper",      "blurb": "A mortal who whispers your name.",        "base_cost": 15,          "cps": 0.1,    "growth": 1.15},
    {"id": "oracle",     "glyph": "\U0001F52E", "name": "Oracle of Delphi", "blurb": "Speaks prophecies in your honour.",       "base_cost": 100,         "cps": 1,      "growth": 1.15},
    {"id": "priest",     "glyph": "\U0001F56F", "name": "Temple Priest",    "blurb": "Leads the daily rites and offerings.",    "base_cost": 1_100,       "cps": 8,      "growth": 1.15},
    {"id": "temple",     "glyph": "\U0001F3DB", "name": "Marble Temple",    "blurb": "A shrine that draws pilgrims from afar.", "base_cost": 12_000,      "cps": 47,     "growth": 1.15},
    {"id": "nymph",      "glyph": "\U0001F9DA", "name": "Forest Nymph",     "blurb": "Nature spirits sing your praises.",       "base_cost": 130_000,     "cps": 260,    "growth": 1.15},
    {"id": "demigod",    "glyph": "\U0001F9B8", "name": "Demigod",          "blurb": "A heroic child spreads your legend.",     "base_cost": 1_400_000,   "cps": 1_400,  "growth": 1.15},
    {"id": "titan",      "glyph": "\U0001F5FF", "name": "Titan",            "blurb": "Primordial might bound to your will.",    "base_cost": 20_000_000,  "cps": 7_800,  "growth": 1.15},
    {"id": "olympian",   "glyph": "\U0001F451", "name": "Olympian God",     "blurb": "A peer of Olympus answers to you.",       "base_cost": 330_000_000, "cps": 44_000, "growth": 1.15},
]

# Upgrades are one-time purchases. Each has a `kind`:
#   "click"  -> click_add (flat Faith/click), click_mult (x Faith/click), and/or
#               click_cps_pct (adds this fraction of Faith/sec to every click)
#   "gen"    -> target a generator id, `mult` multiplies that generator's output
#   "global" -> `mult` multiplies the output of ALL generators
# `glyph` is the emoji shown on the Cookie-Clicker-style upgrade tile.
# Optional `req` = {"gen": <generator id>, "count": n} hides the upgrade until the
# player owns at least `count` of that generator (Cookie-Clicker style reveals).
UPGRADES = [
    # ---- Faith-per-click line ----------------------------------------------
    {"id": "blessed_hands", "glyph": "\U0001F64C", "name": "Blessed Hands",  "blurb": "+1 Faith per prayer.",     "cost": 100,             "kind": "click", "click_add": 1},
    {"id": "prayer_beads",  "glyph": "\U0001F4FF", "name": "Prayer Beads",   "blurb": "+5 Faith per prayer.",     "cost": 1_500,           "kind": "click", "click_add": 5,   "req": {"gen": "worshipper", "count": 5}},
    {"id": "midas_touch",   "glyph": "✋",      "name": "Midas' Touch",   "blurb": "Double Faith per prayer.", "cost": 8_000,           "kind": "click", "click_mult": 2,  "req": {"gen": "worshipper", "count": 10}},
    {"id": "divine_spark",  "glyph": "✨",      "name": "Divine Spark",   "blurb": "+25 Faith per prayer.",    "cost": 60_000,          "kind": "click", "click_add": 25,  "req": {"gen": "oracle", "count": 5}},
    {"id": "laurel_crown",  "glyph": "\U0001F33F", "name": "Laurel Crown",   "blurb": "Double Faith per prayer.", "cost": 500_000,         "kind": "click", "click_mult": 2,  "req": {"gen": "priest", "count": 5}},
    {"id": "mortal_devotion","glyph": "\U0001F590","name": "Mortal Devotion", "blurb": "Each prayer also gains +1% of your Faith/sec.", "cost": 5_000_000, "kind": "click", "click_cps_pct": 0.01, "req": {"gen": "temple", "count": 10}},
    {"id": "olive_branch",  "glyph": "\U0001FAD2", "name": "Olive Branch",   "blurb": "+250 Faith per prayer.",   "cost": 12_000_000,      "kind": "click", "click_add": 250, "req": {"gen": "temple", "count": 15}},
    {"id": "thunderbolt",   "glyph": "⚡",      "name": "Thunderbolt",    "blurb": "Double Faith per prayer.", "cost": 40_000_000,      "kind": "click", "click_mult": 2,  "req": {"gen": "nymph", "count": 5}},
    {"id": "golden_fleece", "glyph": "\U0001F411", "name": "Golden Fleece",  "blurb": "+5,000 Faith per prayer.", "cost": 150_000_000,     "kind": "click", "click_add": 5000,"req": {"gen": "nymph", "count": 15}},
    {"id": "hand_of_zeus",  "glyph": "\U0001F590", "name": "Hand of Zeus",   "blurb": "Double Faith per prayer.", "cost": 2_000_000_000,   "kind": "click", "click_mult": 2,  "req": {"gen": "demigod", "count": 10}},
    {"id": "divine_conduit","glyph": "\U0001F329", "name": "Divine Conduit", "blurb": "Each prayer also gains +1% of your Faith/sec.", "cost": 100_000_000_000, "kind": "click", "click_cps_pct": 0.01, "req": {"gen": "olympian", "count": 10}},
    {"id": "ambrosia_drop", "glyph": "\U0001F36F", "name": "Taste of Ambrosia","blurb": "Triple Faith per prayer.", "cost": 50_000_000_000,  "kind": "click", "click_mult": 3,  "req": {"gen": "titan", "count": 10}},
    {"id": "cornucopia",    "glyph": "\U0001F3FA", "name": "Cornucopia",     "blurb": "+100,000 Faith per prayer.","cost": 200_000_000_000,"kind": "click", "click_add": 100000,"req": {"gen": "olympian", "count": 5}},

    # ---- Per-god efficiency (the CPS tree) ---------------------------------
    {"id": "wor_1", "glyph": "\U0001F3B5", "name": "Sacred Hymns",       "blurb": "Worshippers are twice as devout.",   "cost": 200,             "kind": "gen", "target": "worshipper", "mult": 2, "req": {"gen": "worshipper", "count": 10}},
    {"id": "wor_2", "glyph": "\U0001F5FF", "name": "Golden Idols",       "blurb": "Worshippers are twice as devout.",   "cost": 5_000,           "kind": "gen", "target": "worshipper", "mult": 2, "req": {"gen": "worshipper", "count": 25}},
    {"id": "ora_1", "glyph": "\U0001F300", "name": "Cryptic Visions",    "blurb": "Oracles are twice as inspired.",     "cost": 2_000,           "kind": "gen", "target": "oracle",     "mult": 2, "req": {"gen": "oracle", "count": 10}},
    {"id": "ora_2", "glyph": "\U0001F4A8", "name": "Sacred Smoke",       "blurb": "Oracles are twice as inspired.",     "cost": 50_000,          "kind": "gen", "target": "oracle",     "mult": 2, "req": {"gen": "oracle", "count": 25}},
    {"id": "pri_1", "glyph": "\U0001F455", "name": "Holy Vestments",     "blurb": "Priests are twice as faithful.",     "cost": 22_000,          "kind": "gen", "target": "priest",     "mult": 2, "req": {"gen": "priest", "count": 10}},
    {"id": "pri_2", "glyph": "\U0001F525", "name": "Burnt Offerings",    "blurb": "Priests are twice as faithful.",     "cost": 550_000,         "kind": "gen", "target": "priest",     "mult": 2, "req": {"gen": "priest", "count": 25}},
    {"id": "tem_1", "glyph": "\U0001F3DB", "name": "Marble Columns",     "blurb": "Temples draw twice the pilgrims.",   "cost": 240_000,         "kind": "gen", "target": "temple",     "mult": 2, "req": {"gen": "temple", "count": 10}},
    {"id": "tem_2", "glyph": "\U0001F3FA", "name": "Gilded Altars",      "blurb": "Temples draw twice the pilgrims.",   "cost": 6_000_000,       "kind": "gen", "target": "temple",     "mult": 2, "req": {"gen": "temple", "count": 25}},
    {"id": "nym_1", "glyph": "\U0001F33F", "name": "Enchanted Groves",   "blurb": "Nymphs sing twice as sweetly.",      "cost": 2_600_000,       "kind": "gen", "target": "nymph",      "mult": 2, "req": {"gen": "nymph", "count": 10}},
    {"id": "nym_2", "glyph": "\U0001F4A7", "name": "Spring of Life",     "blurb": "Nymphs sing twice as sweetly.",      "cost": 65_000_000,      "kind": "gen", "target": "nymph",      "mult": 2, "req": {"gen": "nymph", "count": 25}},
    {"id": "dem_1", "glyph": "⚔",      "name": "Heroic Trials",      "blurb": "Demigods' legends spread twice as far.", "cost": 28_000_000,  "kind": "gen", "target": "demigod",    "mult": 2, "req": {"gen": "demigod", "count": 10}},
    {"id": "dem_2", "glyph": "\U0001F4DC", "name": "Legendary Sagas",    "blurb": "Demigods' legends spread twice as far.", "cost": 700_000_000, "kind": "gen", "target": "demigod",    "mult": 2, "req": {"gen": "demigod", "count": 25}},
    {"id": "tit_1", "glyph": "⛓",      "name": "Primordial Chains",  "blurb": "Titans wield twice the power.",       "cost": 400_000_000,     "kind": "gen", "target": "titan",      "mult": 2, "req": {"gen": "titan", "count": 10}},
    {"id": "tit_2", "glyph": "\U0001F4AA", "name": "Elder Strength",     "blurb": "Titans wield twice the power.",       "cost": 10_000_000_000,  "kind": "gen", "target": "titan",      "mult": 2, "req": {"gen": "titan", "count": 25}},
    {"id": "oly_1", "glyph": "\U0001F451", "name": "Throne of Olympus",  "blurb": "Olympians command twice the awe.",   "cost": 6_600_000_000,   "kind": "gen", "target": "olympian",   "mult": 2, "req": {"gen": "olympian", "count": 10}},
    {"id": "oly_2", "glyph": "\U0001FA78", "name": "Divine Ichor",       "blurb": "Olympians command twice the awe.",   "cost": 160_000_000_000, "kind": "gen", "target": "olympian",   "mult": 2, "req": {"gen": "olympian", "count": 25}},

    # ---- Global production multipliers -------------------------------------
    {"id": "glb_dionysus", "glyph": "\U0001F347", "name": "Festival of Dionysus", "blurb": "All followers produce x2.", "cost": 5_000_000,       "kind": "global", "mult": 2, "req": {"gen": "priest", "count": 15}},
    {"id": "glb_pax",      "glyph": "\U0001F54A", "name": "Pax Olympia",          "blurb": "All followers produce x2.", "cost": 1_000_000_000,   "kind": "global", "mult": 2, "req": {"gen": "nymph", "count": 15}},
    {"id": "glb_golden",   "glyph": "\U0001F305", "name": "A New Golden Age",      "blurb": "All followers produce x3.", "cost": 250_000_000_000, "kind": "global", "mult": 3, "req": {"gen": "titan", "count": 10}},
]
############################################################################################################### <-- this is a divider
def _get_or_create_player(user):
    if not getattr(user, "is_authenticated", False):
        return None
    player = GodPlayer.objects.filter(user=user).first()
    if not player:
        player = GodPlayer.objects.create(user=user)
    return player
############################################################################################################### <-- this is a divider
def _serialize_player(player):
    if not player:
        return {
            "faith": 0,
            "total_faith": 0,
            "click_power": 1,
            "generators": {},
            "upgrades": [],
        }
    return {
        "faith": player.faith,
        "total_faith": player.total_faith,
        "click_power": player.click_power,
        "generators": player.generators or {},
        "upgrades": player.upgrades or [],
    }
############################################################################################################### <-- this is a divider
def menu_view(request):
    _get_or_create_player(request.user)
    return render(request, 'GodClicker/menu.html')
############################################################################################################### <-- this is a divider
def game_view(request):
    player = _get_or_create_player(request.user)
    return render(request, 'GodClicker/game.html', {
        "generators_json": json.dumps(GENERATORS),
        "upgrades_json": json.dumps(UPGRADES),
        "state_json": json.dumps(_serialize_player(player)),
    })
############################################################################################################### <-- this is a divider
def save_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    if not request.user.is_authenticated:
        return HttpResponse('Login required', status=401)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return HttpResponse('Invalid JSON', status=400)

    player = _get_or_create_player(request.user)

    try:
        player.faith = float(data.get("faith", player.faith))
        player.total_faith = float(data.get("total_faith", player.total_faith))
        player.click_power = float(data.get("click_power", player.click_power))
    except (TypeError, ValueError):
        return HttpResponse('Invalid numeric values', status=400)

    generators = data.get("generators")
    if isinstance(generators, dict):
        player.generators = generators
    upgrades = data.get("upgrades")
    if isinstance(upgrades, list):
        player.upgrades = upgrades

    player.save()
    return JsonResponse({"status": "saved"})
############################################################################################################### <-- this is a divider
def load_view(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])
    player = _get_or_create_player(request.user)
    return JsonResponse(_serialize_player(player))
############################################################################################################### <-- this is a divider
def reset_view(request):
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    if not request.user.is_authenticated:
        return HttpResponse('Login required', status=401)
    player = _get_or_create_player(request.user)
    player.faith = 0
    player.total_faith = 0
    player.click_power = 1
    player.generators = {}
    player.upgrades = []
    player.save()
    return JsonResponse(_serialize_player(player))
############################################################################################################### <-- this is a divider
