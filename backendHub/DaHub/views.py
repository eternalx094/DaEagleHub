from django.shortcuts import render, redirect
from .models import Application
from django.contrib.auth import authenticate, login
from .forms import CustomAuthForm
from django.contrib import messages
from .forms import CustomUserCreationForm
######################################################################################################
def hub_view(request):
    apps = Application.objects.all()
    user = request.user
    context = {
        'apps': apps,
        'user': user,
    }
    return render(request, 'DaHub/DaHub.html', context=context)
######################################################################################################
def profile_view(request):
    user = request.user
    context = {
        'user': user,
    }
    return render(request, 'DaHub/profile.html', context=context)
######################################################################################################
def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return hub_view(request)
######################################################################################################
def user_login(request):
    if request.method == 'POST':
        form = CustomAuthForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f'Welcome back, {username}!')
                return redirect('hub_view')
            else:
                messages.error(request, 'Invalid username or password')
        else:
            messages.error(request, 'Invalid username or password')
    else:
        form = CustomAuthForm()

    return render(request, 'DaHub/login.html', {'form': form})
######################################################################################################


def signup(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Account created successfully!")
            return redirect('profile_view')
        else:
            messages.error(request, "Error in form submission")
    else:
        form = CustomUserCreationForm()

    return render(request, 'DaHub/signup.html', {'form': form})