from django.contrib.auth.models import AbstractUser
from django.db import models
# Create your models here.
class CustomUser(AbstractUser):
    coins = models.IntegerField(default=0)

class Application(models.Model):
    name = models.CharField(max_length=100)
    logo_img = models.ImageField(upload_to='logos/')

    def __str__(self):
        return self.name
#import uuid
#
#import pyotp
#from django.contrib.auth.models import AbstractUser
#from django.db import models
#
#from django.contrib.auth.models import BaseUserManager
#from django.utils.translation import gettext_lazy as _
#
#
#class CustomUserManager(BaseUserManager):
#    """
#    Custom user model manager where login is the unique identifier
#    instead of username.
#    """
#
#    def create_user(self, login, password=None, **extra_fields):
#        """
#        Create and save a user with the given login and password.
#        """
#        if not login:
#            raise ValueError(_('The Login must be set'))
#
#        user = self.model(login=login, **extra_fields)
#        user.set_password(password)
#        user.save(using=self._db)
#        return user
#
#    def create_superuser(self, login, password=None, **extra_fields):
#        """
#        Create and save a SuperUser with the given login and password.
#        """
#        extra_fields.setdefault('is_staff', True)
#        extra_fields.setdefault('is_superuser', True)
#        extra_fields.setdefault('is_active', True)
#
#        if extra_fields.get('is_staff') is not True:
#            raise ValueError(_('Superuser must have is_staff=True.'))
#        if extra_fields.get('is_superuser') is not True:
#            raise ValueError(_('Superuser must have is_superuser=True.'))
#
#        return self.create_user(login, password, **extra_fields)
#
#    def get_by_natural_key(self, login):
#        """
#        Retrieve a user by their login.
#        """
#        return self.get(login=login)
#
#class CustomUser(AbstractUser):
#    """
#    Custom user model with additional fields.
#    """
#    username = None
#    email = None
#
#    class Role:
#        """
#        User roles:
#        - TRADER: Trader
#        - AGENT: Account Manager
#        - MERCHANT: Merchant
#        - ADMIN: Admin
#        """
#        TRADER = 'TR'
#        AGENT = 'AG'
#        SUPPORT = 'SP'
#        MERCHANT = 'MR'
#        ADMIN = 'AD'
#
#        CHOICES = (
#            (TRADER, 'Trader'),
#            (AGENT, 'Agent'),
#            (SUPPORT, 'Support'),
#            (MERCHANT, 'Merchant'),
#            (ADMIN, 'Admin'),
#        )
#
#    id = models.UUIDField(primary_key=True,
#                          default=uuid.uuid4,
#                          editable=False)
#
#    login = models.CharField(
#        max_length=50,
#        unique=True,
#        verbose_name='Login',
#        help_text='Unique user login'
#    )
#
#    role = models.CharField(
#        choices=Role.CHOICES,
#        default=Role.TRADER,
#        verbose_name='Role',
#        help_text='User role'
#    )
#
#    is_2fa_enabled = models.BooleanField(default=False)
#    two_fa_secret = models.CharField(max_length=32, blank=True, null=True)
#
#    USERNAME_FIELD = 'login'
#    REQUIRED_FIELDS = []
#
#    objects = CustomUserManager()
#
#    def generate_2fa_secret(self):
#        self.two_fa_secret = pyotp.random_base32()
#        self.save(update_fields=["two_fa_secret"])
#
#    def get_2fa_uri(self):
#        if not self.two_fa_secret:
#            self.generate_2fa_secret()
#        return pyotp.totp.TOTP(self.two_fa_secret).provisioning_uri(
#            name=self.login,
#            issuer_name="FreeFlow"
#        )
#
#    def verify_2fa_code(self, code: str) -> bool:
#        if not self.two_fa_secret:
#            return False
#        totp = pyotp.TOTP(self.two_fa_secret)
#        return totp.verify(code)
#
#    def __str__(self):
#        return f"User #{self.id} - {self.login}"
#
#    class Meta:
#        verbose_name = 'User'
#        verbose_name_plural = 'Users'