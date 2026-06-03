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
    # --- Rebirth-gated gods: unlock after rebirthing ---
    {"id": "primordial", "glyph": "\U0001F30C", "name": "Primordial Deity", "blurb": "An elder power older than Olympus itself.", "base_cost": 5_100_000_000,     "cps": 260_000,    "growth": 1.15, "rebirth": 1},
    {"id": "aeon",       "glyph": "\U000023F3", "name": "Aeon",             "blurb": "The living embodiment of a cosmic age.",   "base_cost": 75_000_000_000,    "cps": 1_600_000,  "growth": 1.15, "rebirth": 2},
    {"id": "fates",      "glyph": "\U0001F9F5", "name": "The Fates",        "blurb": "They spin the threads of all destiny.",    "base_cost": 1_000_000_000_000, "cps": 10_000_000, "growth": 1.15, "rebirth": 3},
]

# Upgrades are one-time purchases. Each has a `kind`:
#   "click"  -> click_add (flat Faith/click), click_mult (x Faith/click), and/or
#               click_cps_pct (adds this fraction of Faith/sec to every click)
#   "gen"    -> target a generator id, `mult` multiplies that generator's output
#   "global" -> `mult` multiplies the output of ALL generators
# `glyph` is the emoji shown on the Cookie-Clicker-style upgrade tile.
# Optional `req` = {"gen": <generator id>, "count": n} hides the upgrade until the
# player owns at least `count` of that generator (Cookie-Clicker style reveals).

# ---- Faith-per-click line (hand-tuned so clicking stays relevant) ----------
CLICK_UPGRADES = [
    {"id": "blessed_hands",  "glyph": "\U0001F64C", "name": "Blessed Hands",    "blurb": "+1 Faith per prayer.",      "cost": 100,             "click_add": 1},
    {"id": "whispered_prayer","glyph": "\U0001F5E3","name": "Whispered Prayer", "blurb": "+2 Faith per prayer.",      "cost": 600,             "click_add": 2,    "req": {"gen": "worshipper", "count": 1}},
    {"id": "prayer_beads",   "glyph": "\U0001F4FF", "name": "Prayer Beads",     "blurb": "+5 Faith per prayer.",      "cost": 1_500,           "click_add": 5,    "req": {"gen": "worshipper", "count": 5}},
    {"id": "sacred_chant",   "glyph": "\U0001F3B6", "name": "Sacred Chant",     "blurb": "+8 Faith per prayer.",      "cost": 4_000,           "click_add": 8,    "req": {"gen": "oracle", "count": 1}},
    {"id": "midas_touch",    "glyph": "✋",      "name": "Midas' Touch",     "blurb": "Double Faith per prayer.",  "cost": 9_000,           "click_mult": 2,   "req": {"gen": "worshipper", "count": 10}},
    {"id": "divine_spark",   "glyph": "✨",      "name": "Divine Spark",     "blurb": "+25 Faith per prayer.",     "cost": 60_000,          "click_add": 25,   "req": {"gen": "oracle", "count": 5}},
    {"id": "laurel_crown",   "glyph": "\U0001F33F", "name": "Laurel Crown",     "blurb": "Double Faith per prayer.",  "cost": 500_000,         "click_mult": 2,   "req": {"gen": "priest", "count": 5}},
    {"id": "mortal_devotion","glyph": "\U0001F590", "name": "Mortal Devotion",  "blurb": "Each prayer also gains +1% of your Faith/sec.", "cost": 5_000_000, "click_cps_pct": 0.01, "req": {"gen": "temple", "count": 10}},
    {"id": "olive_branch",   "glyph": "\U0001FAD2", "name": "Olive Branch",     "blurb": "+250 Faith per prayer.",    "cost": 12_000_000,      "click_add": 250,  "req": {"gen": "temple", "count": 15}},
    {"id": "thunderbolt",    "glyph": "⚡",      "name": "Thunderbolt",      "blurb": "Double Faith per prayer.",  "cost": 40_000_000,      "click_mult": 2,   "req": {"gen": "nymph", "count": 5}},
    {"id": "golden_fleece",  "glyph": "\U0001F411", "name": "Golden Fleece",    "blurb": "+5,000 Faith per prayer.",  "cost": 150_000_000,     "click_add": 5000, "req": {"gen": "nymph", "count": 15}},
    {"id": "hand_of_zeus",   "glyph": "\U0001F590", "name": "Hand of Zeus",     "blurb": "Double Faith per prayer.",  "cost": 2_000_000_000,   "click_mult": 2,   "req": {"gen": "demigod", "count": 10}},
    {"id": "ambrosia_drop",  "glyph": "\U0001F36F", "name": "Taste of Ambrosia","blurb": "Triple Faith per prayer.",  "cost": 50_000_000_000,  "click_mult": 3,   "req": {"gen": "titan", "count": 10}},
    {"id": "divine_conduit", "glyph": "\U0001F329", "name": "Divine Conduit",   "blurb": "Each prayer also gains +1% of your Faith/sec.", "cost": 100_000_000_000, "click_cps_pct": 0.01, "req": {"gen": "olympian", "count": 10}},
    {"id": "cornucopia",     "glyph": "\U0001F3FA", "name": "Cornucopia",       "blurb": "+100,000 Faith per prayer.","cost": 200_000_000_000, "click_add": 100000, "req": {"gen": "olympian", "count": 5}},
]
for _u in CLICK_UPGRADES:
    _u["kind"] = "click"

# ---- Per-god efficiency tiers (generated) ----------------------------------
# Five blessings per god, unlocking at low follower counts so the store fills
# up early (Cookie-Clicker style). Each doubles that god's output.
_GEN_UPGRADE_NAMES = {
    "worshipper": ["Sacred Hymns", "Golden Idols", "Grand Festivals", "Holy Pilgrimage", "Blessed Relics"],
    "oracle":     ["Cryptic Visions", "Sacred Smoke", "Delphic Tripod", "Prophetic Trance", "Omens of Fate"],
    "priest":     ["Holy Vestments", "Burnt Offerings", "Sacred Rites", "Temple Hierarchy", "Divine Mandate"],
    "temple":     ["Marble Columns", "Gilded Altars", "Golden Domes", "Great Sanctuary", "Seventh Wonder"],
    "nymph":      ["Enchanted Groves", "Spring of Life", "Whispering Woods", "Eternal Bloom", "Gaia's Blessing"],
    "demigod":    ["Heroic Trials", "Legendary Sagas", "Monster Slaying", "Hero's Apotheosis", "Immortal Glory"],
    "titan":      ["Primordial Might", "Elder Strength", "World-Forging", "Cosmic Dominion", "Titanomachy"],
    "olympian":   ["Throne of Olympus", "Divine Ichor", "Ambrosia Feasts", "Will of the Gods", "Cosmos Unbound"],
    "primordial": ["Elder Whispers", "Chaos Shard", "Void Communion", "Eldritch Rites", "Genesis Spark"],
    "aeon":       ["Sands of Time", "Endless Cycle", "Temporal Rift", "Epoch's End", "Eternity Forged"],
    "fates":      ["Thread of Life", "Loom of Destiny", "Shears of Atropos", "Woven Doom", "Hand of Moira"],
}
# (follower count required, cost = base_cost * multiplier)
_GEN_TIERS = [(1, 12), (5, 60), (10, 300), (25, 2_000), (50, 15_000)]

GEN_UPGRADES = []
for _gen in GENERATORS:
    for _i, (_req, _cost_mult) in enumerate(_GEN_TIERS):
        GEN_UPGRADES.append({
            "id": "%s_t%d" % (_gen["id"], _i),
            "glyph": _gen["glyph"],
            "name": _GEN_UPGRADE_NAMES[_gen["id"]][_i],
            "blurb": "%s output is doubled." % _gen["name"],
            "cost": int(_gen["base_cost"] * _cost_mult),
            "kind": "gen",
            "target": _gen["id"],
            "mult": 2,
            "rebirth": _gen.get("rebirth", 0),
            "req": {"gen": _gen["id"], "count": _req},
        })

# ---- Global production multipliers -----------------------------------------
GLOBAL_UPGRADES = [
    {"id": "glb_hestia",   "glyph": "\U0001F525", "name": "Hearth of Hestia",     "blurb": "All followers produce x2.", "cost": 250_000,         "mult": 2, "req": {"gen": "priest", "count": 5}},
    {"id": "glb_dionysus", "glyph": "\U0001F347", "name": "Festival of Dionysus", "blurb": "All followers produce x2.", "cost": 5_000_000,       "mult": 2, "req": {"gen": "priest", "count": 15}},
    {"id": "glb_muses",    "glyph": "\U0001F3BC", "name": "Song of the Muses",    "blurb": "All followers produce x2.", "cost": 80_000_000,      "mult": 2, "req": {"gen": "nymph", "count": 5}},
    {"id": "glb_pax",      "glyph": "\U0001F54A", "name": "Pax Olympia",          "blurb": "All followers produce x2.", "cost": 1_000_000_000,   "mult": 2, "req": {"gen": "nymph", "count": 15}},
    {"id": "glb_golden",   "glyph": "\U0001F305", "name": "A New Golden Age",      "blurb": "All followers produce x3.", "cost": 250_000_000_000, "mult": 3, "req": {"gen": "titan", "count": 10}},
    # Rebirth-gated "Pantheon" blessings.
    {"id": "glb_pantheon", "glyph": "\U0001F3DB", "name": "Ascended Pantheon",     "blurb": "All followers produce x4.", "cost": 50_000_000_000,      "mult": 4, "rebirth": 1, "req": {"gen": "primordial", "count": 10}},
    {"id": "glb_cosmos",   "glyph": "\U0001F30C", "name": "Cosmic Harmony",        "blurb": "All followers produce x5.", "cost": 5_000_000_000_000,   "mult": 5, "rebirth": 2, "req": {"gen": "aeon", "count": 10}},
]
for _u in GLOBAL_UPGRADES:
    _u["kind"] = "global"

UPGRADES = CLICK_UPGRADES + GEN_UPGRADES + GLOBAL_UPGRADES

############################################################################################################### <-- this is a divider
# Rebirth (ascension): reset your run for a permanent boost + new unlocks.
REBIRTH_BASE = 1_000_000        # Faith needed (this run) for the first rebirth
REBIRTH_GROWTH = 50             # each subsequent rebirth costs this many times more
REBIRTH_MULT = 2                # each rebirth permanently multiplies ALL Faith gains

def rebirth_threshold(rebirths):
    """Faith (earned this run) required to perform the next rebirth."""
    return REBIRTH_BASE * (REBIRTH_GROWTH ** rebirths)

REBIRTH_CONFIG = {"base": REBIRTH_BASE, "growth": REBIRTH_GROWTH, "mult": REBIRTH_MULT}
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
            "rebirths": 0,
        }
    return {
        "faith": player.faith,
        "total_faith": player.total_faith,
        "click_power": player.click_power,
        "generators": player.generators or {},
        "upgrades": player.upgrades or [],
        "rebirths": player.rebirths,
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
        "rebirth_json": json.dumps(REBIRTH_CONFIG),
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
    rebirths = data.get("rebirths")
    if isinstance(rebirths, int) and rebirths >= 0:
        player.rebirths = rebirths

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
    player.rebirths = 0
    player.save()
    return JsonResponse(_serialize_player(player))
############################################################################################################### <-- this is a divider
def rebirth_view(request):
    """Ascend: wipe the current run for +1 rebirth (a permanent boost + unlocks)."""
    if request.method != 'POST':
        return HttpResponseNotAllowed(['POST'])
    if not request.user.is_authenticated:
        return HttpResponse('Login required', status=401)
    player = _get_or_create_player(request.user)

    if player.total_faith < rebirth_threshold(player.rebirths):
        return JsonResponse(
            {"error": "not_enough_faith", "required": rebirth_threshold(player.rebirths)},
            status=400,
        )

    player.rebirths += 1
    player.faith = 0
    player.total_faith = 0
    player.click_power = 1
    player.generators = {}
    player.upgrades = []
    player.save()
    return JsonResponse(_serialize_player(player))
############################################################################################################### <-- this is a divider
