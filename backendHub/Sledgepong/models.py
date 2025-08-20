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