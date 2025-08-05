from django.db import models
# Create your models here.

class Application(models.Model):
    name = models.CharField(max_length=100)
    logo_img = models.ImageField(upload_to='logos/')

    def __str__(self):
        return self.name