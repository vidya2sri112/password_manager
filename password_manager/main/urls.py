from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('api/save-password/', views.save_password, name='save_password'),
    path('api/get-passwords/', views.get_passwords, name='get_passwords'),
    path('api/delete-password/<int:entry_id>/', views.delete_password, name='delete_password'),
    path('api/check-session/', views.check_session, name='check_session'),
]
