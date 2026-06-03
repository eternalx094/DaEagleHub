from django.db import models
from django.contrib.auth import get_user_model
##############################################################################
User = get_user_model()
##############################################################################
class GodPlayer(models.Model):
    """Persistent save state for a God Clicker player.

    Generators and upgrades are stored as JSON so the catalogue can grow
    without a migration every time a new god or upgrade is added.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="godclicker_player",
    )
    # Current spendable "Faith" and lifetime total ever earned.
    faith = models.FloatField(default=0)
    total_faith = models.FloatField(default=0)
    # Faith granted per manual click of the deity.
    click_power = models.FloatField(default=1)
    # {generator_id: owned_count}, e.g. {"worshipper": 5, "oracle": 1}
    generators = models.JSONField(default=dict, blank=True)
    # [upgrade_id, ...] of purchased upgrades.
    upgrades = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.user:
            return self.user.username
        return "Unregistered worshipper"
##############################################################################
