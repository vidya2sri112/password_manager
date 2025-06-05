import json
import bcrypt
import secrets
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib import messages
from django.db import IntegrityError
from .models import PasswordEntry, UserProfile


def index(request):
    """Home page - redirect to dashboard if logged in, otherwise show landing page."""
    if request.user.is_authenticated:
        return redirect('main:dashboard')
    return render(request, 'index.html')


def register_view(request):
    """User registration with secure password hashing."""
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        confirm_password = request.POST.get('confirm_password', '')

        # Basic validation
        if not username or not email or not password:
            messages.error(request, 'All fields are required.')
            return render(request, 'register.html')

        if password != confirm_password:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'register.html')

        if len(password) < 8:
            messages.error(request, 'Password must be at least 8 characters long.')
            return render(request, 'register.html')

        try:
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                messages.error(request, 'Username already exists.')
                return render(request, 'register.html')

            if User.objects.filter(email=email).exists():
                messages.error(request, 'Email already registered.')
                return render(request, 'register.html')

            # Create user with hashed password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password  # Django handles hashing
            )

            # Create user profile with salt for client-side encryption
            salt = secrets.token_hex(32)
            UserProfile.objects.create(user=user, salt=salt)

            messages.success(request, 'Registration successful! Please log in.')
            return redirect('main:login')

        except IntegrityError:
            messages.error(request, 'Registration failed. Please try again.')
            return render(request, 'register.html')

    return render(request, 'register.html')


def login_view(request):
    """User login with session management."""
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        if not username or not password:
            messages.error(request, 'Username and password are required.')
            return render(request, 'login.html')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            # Update last login IP
            try:
                profile = user.userprofile
                profile.last_login_ip = get_client_ip(request)
                profile.save()
            except UserProfile.DoesNotExist:
                # Create profile if it doesn't exist
                salt = secrets.token_hex(32)
                UserProfile.objects.create(
                    user=user, 
                    salt=salt, 
                    last_login_ip=get_client_ip(request)
                )
            
            return redirect('main:dashboard')
        else:
            messages.error(request, 'Invalid username or password.')

    return render(request, 'login.html')


@login_required
def logout_view(request):
    """User logout with session cleanup."""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('main:index')


@login_required
def dashboard(request):
    """Main dashboard for logged-in users."""
    try:
        user_profile = request.user.userprofile
        salt = user_profile.salt
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist
        salt = secrets.token_hex(32)
        UserProfile.objects.create(user=request.user, salt=salt)
    
    return render(request, 'dashboard.html', {'user_salt': salt})


@csrf_exempt
@require_POST
@login_required
def save_password(request):
    """Save encrypted password entry."""
    try:
        data = json.loads(request.body)
        website = data.get('website', '').strip()
        username = data.get('username', '').strip()
        encrypted_password = data.get('encrypted_password', '')
        salt = data.get('salt', '')
        iv = data.get('iv', '')

        if not all([website, username, encrypted_password, salt, iv]):
            return JsonResponse({'success': False, 'error': 'Missing required fields'})

        # Create or update password entry
        entry, created = PasswordEntry.objects.update_or_create(
            user=request.user,
            website=website,
            username=username,
            defaults={
                'encrypted_password': encrypted_password,
                'salt': salt,
                'iv': iv
            }
        )

        return JsonResponse({
            'success': True, 
            'message': 'Password saved successfully',
            'entry_id': entry.id
        })

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@require_GET
@login_required
def get_passwords(request):
    """Retrieve all encrypted password entries for the user."""
    try:
        entries = PasswordEntry.objects.filter(user=request.user)
        password_list = []
        
        for entry in entries:
            password_list.append({
                'id': entry.id,
                'website': entry.website,
                'username': entry.username,
                'encrypted_password': entry.encrypted_password,
                'salt': entry.salt,
                'iv': entry.iv,
                'created_at': entry.created_at.isoformat(),
                'updated_at': entry.updated_at.isoformat()
            })

        return JsonResponse({'success': True, 'passwords': password_list})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@require_POST
@login_required
def delete_password(request, entry_id):
    """Delete a password entry."""
    try:
        entry = PasswordEntry.objects.get(id=entry_id, user=request.user)
        entry.delete()
        return JsonResponse({'success': True, 'message': 'Password deleted successfully'})
    
    except PasswordEntry.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Password entry not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@require_GET
@login_required
def check_session(request):
    """Check if user session is still valid."""
    return JsonResponse({'success': True, 'authenticated': True})


def get_client_ip(request):
    """Get the client's IP address."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
