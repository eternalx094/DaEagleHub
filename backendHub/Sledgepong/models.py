from django.db import models
from django.contrib.auth import get_user_model
##############################################################################
class Texture(models.Model):
    name = models.CharField(max_length=100)
    texture_img = models.ImageField(upload_to="Sledgepong/images/")
    def __str__(self):
        return self.name
##############################################################################
User = get_user_model()
##############################################################################
class Player(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="sldgpng_player")
    collection = models.ManyToManyField(Texture, blank=True, related_name='player_collections')
    curtexture = models.ForeignKey(Texture, on_delete=models.SET_NULL, null=True, blank=True, related_name='current_texture')
    def __str__(self):
        if self.user:
            return self.user.username
        else:
            return "You are not registered in our system, please register before playing any games anywhere. If you have an account in our system, please Log In before continuing. Thank You for your cooperation!"
##############################################################################
class Level(models.Model):
    class Difficulty:
        N_A = 'not_applicable'
        BLUE = 'blue'
        GREEN = 'green'
        YELLOW = 'yellow'
        ORANGE = 'orange'
        BLOOD_RED = 'blood_red'
        RED_HOT = 'red_hot'
        WHITE_HOT = 'white_hot'
        ASH = 'ash'

        CHOICES = (
            (N_A, 'N/A'),
            (BLUE, 'Blue'),
            (GREEN, 'Green'),
            (YELLOW, 'Yellow'),
            (ORANGE, 'Orange'),
            (BLOOD_RED, 'Blood Red'),
            (RED_HOT, 'Red Hot'),
            (WHITE_HOT, 'White Hot'),
            (ASH, 'Ash'),
        )
    name = models.CharField(max_length=50)
    soundtrack = models.CharField(max_length=50, blank=True, null=True)
    artist = models.CharField(max_length=50, blank=True, null=True)
    creator = models.ForeignKey(Player, on_delete=models.CASCADE, null=True, blank=True, related_name="levels")
    difficulty = models.CharField(choices=Difficulty.CHOICES, default=Difficulty.N_A, max_length=100)
    duration = models.IntegerField(blank=True, null=True)
    level_data = models.JSONField()