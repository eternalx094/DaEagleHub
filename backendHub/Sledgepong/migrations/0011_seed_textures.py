from django.db import migrations


TEXTURE_SEED = [
    ("Classic",   "Sledgepong/images/classic.png"),
    ("Flame",     "Sledgepong/images/Flame.webp"),
    ("Lightning", "Sledgepong/images/lightning.webp"),
    ("Water",     "Sledgepong/images/Water_Y7BGqHf.webp"),
    ("Cloud",     "Sledgepong/images/cloud.jpg"),
    ("Galaxy",    "Sledgepong/images/galaxy.webp"),
    ("Nature",    "Sledgepong/images/nature.webp"),
    ("Stars",     "Sledgepong/images/stars.png"),
    ("Metal",     "Sledgepong/images/metal.png"),
]


def seed_textures(apps, schema_editor):
    Texture = apps.get_model("Sledgepong", "Texture")
    for name, path in TEXTURE_SEED:
        Texture.objects.get_or_create(name=name, defaults={"texture_img": path})


def unseed_textures(apps, schema_editor):
    Texture = apps.get_model("Sledgepong", "Texture")
    Texture.objects.filter(name__in=[n for n, _ in TEXTURE_SEED]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("Sledgepong", "0010_onlinelevel_song_file"),
    ]

    operations = [
        migrations.RunPython(seed_textures, reverse_code=unseed_textures),
    ]
