from django.contrib import admin
from .models import PasswordEntry

@admin.register(PasswordEntry)
class PasswordEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'website', 'username', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('website', 'username')
    readonly_fields = ('created_at', 'updated_at')
