from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class PasswordEntry(models.Model):
    """
    Model to store encrypted password entries for users.
    All sensitive data is encrypted on the client side.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_entries')
    website = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    encrypted_password = models.TextField()  # Encrypted on client side
    salt = models.CharField(max_length=255)  # Salt used for encryption
    iv = models.CharField(max_length=255)  # Initialization vector
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ['user', 'website', 'username']

    def __str__(self):
        return f"{self.user.username} - {self.website} ({self.username})"


class UserProfile(models.Model):
    """
    Extended user profile to store additional security settings.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    salt = models.CharField(max_length=255)  # Salt for master password derivation
    created_at = models.DateTimeField(default=timezone.now)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
