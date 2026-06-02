from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class God(models.Model):
    """A worshipable god the player can unlock."""
    name = models.CharField(max_length=60, unique=True)
    title = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    portrait = models.ImageField(upload_to="god_clicker/gods/", blank=True, null=True)
    base_cost = models.PositiveIntegerField(default=10)
    favor_per_click_bonus = models.PositiveIntegerField(default=1)
    favor_per_second = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class GodClickerPlayer(models.Model):
    """Per-user clicker progress."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="god_clicker_player",
    )
    favor = models.BigIntegerField(default=0)
    total_clicks = models.BigIntegerField(default=0)
    favor_per_click = models.PositiveIntegerField(default=1)
    gods = models.ManyToManyField(God, blank=True, related_name="worshippers")
    last_synced = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} (favor={self.favor})"
