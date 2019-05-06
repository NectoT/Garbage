from django.shortcuts import render, redirect
from django.core import serializers
from django.contrib.auth import authenticate, login, logout
from garbeco.models import LoginForm, RegisterForm, PageStatistics, GarbageForm, GarbageBin, GarbageType, Like
from django.contrib.auth.models import User
from django.http import HttpResponse, JsonResponse
from Garbage.settings import STATIC_URL
from django.template.response import TemplateResponse
from django import forms
import json


def login_required(function):  # don't really need this, could use django decorators but meh
    def wrapper(request):
        if not request.user.is_authenticated:
            return redirect('/login')
        return function(request)
    return wrapper


def login_page(request):
    if request.method == "POST":
        LogForm = LoginForm(request.POST)
        if LogForm.is_valid():
            username = LogForm.cleaned_data['username']
            password = LogForm.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('/')
            else:
                LogForm = LoginForm()
                return render(request, 'login.html', context={'login': LogForm})
    else:
        LogForm = LoginForm()
        return render(request, 'login.html', context={'login': LogForm, 'type': 'login'})


def exit(request):
    logout(request)
    return redirect('/login')


def register_page(request):
    if request.method == 'POST':
        RegForm = RegisterForm(request.POST)
        if RegForm.is_valid():
            username = RegForm.cleaned_data['username']
            password = RegForm.cleaned_data['password']
            email = RegForm.cleaned_data['email']

            user = User.objects.create_user(username, email=email, password=password)
            login(request, user)

            return redirect('/')
        else:
            RegForm = RegisterForm(request.POST)
            return render(request, 'register.html', context={'register': RegForm, 'type': 'register'})
    else:
        RegForm = RegisterForm()
        return render(request, 'register.html', context={'register': RegForm, 'type': 'register'})


def profile(request, id):
    return HttpResponse("Not ready yes")


def main_page(request):
    if request.user.is_authenticated:
        name = request.user.username
    else:
        name = 'anon'

    ps = PageStatistics.objects.get(page_url="/")  # made a crutch so i would not accidentally owe money to Google
    visits = ps.visits
    if visits > 7000:
        map = False
    else:
        map = True
        ps.visits += 1
        ps.save()

    return render(request, 'map.html', context={'name': name, 'curr_page': 'main-page', 'map': map})


def ajax_hub(request):
    if request.method == "POST":
        if request.POST['get_id'] == 'send_like':
            return like(request)
        form = GarbageForm(request.POST)
        if form.is_valid():
            print(form.cleaned_data)
            lng = form.cleaned_data['lng']
            lat = form.cleaned_data['lat']
            description = form.cleaned_data['description']
            types = form.cleaned_data['types']
            new_bin = GarbageBin(user=request.user, lat=lat, lng=lng, description=description)
            new_bin.save()
            new_bin.types.add(*types)
            return HttpResponse("We got it boys!")
        else:
            response = JsonResponse({'error_message': 'invalid_form'})
            response.status_code = 406
            return response
    else:
        print(request.GET['get_id'])
        if request.GET['get_id'] == 'get_garbins':
            return send_garbins(request)
        elif request.GET['get_id'] == 'get_garbin_form':
            return send_garbage_bin_form(request)
        elif request.GET['get_id'] == 'get_new_garbin':
            return send_garbins(request, filter=(request.GET['lat'], request.GET['lng']))
        elif request.GET['get_id'] == 'load_garbin_info':
            return send_garbin_info(request)
        elif request.GET['get_id'] == 'getlikestate':
            return send_like_state(request)
        else:
            return HttpResponse("Invalid request id")


def send_like_state(request):
    likes = Like.objects.filter(user=request.user, belongs_to_type=request.GET['like_type'], belongs_to_id=request.GET['submission_id'])
    if likes == 0:
        state = False
    else:
        state = True
    return JsonResponse({"state": state})


def send_garbin_info(request):
    curr_garbin = GarbageBin.objects.get(pk=request.GET['garbin_id'])
    user_id = curr_garbin.user_id
    garbin_user = User.objects.get(pk=user_id)
    username = garbin_user.username
    description = curr_garbin.description
    added = curr_garbin.added
    types = []
    likes_amount = len(Like.objects.filter(belongs_to_type='garbin', belongs_to_id=request.GET['garbin_id']))
    likes = Like.objects.filter(user=garbin_user, belongs_to_type='garbin', belongs_to_id=request.GET['garbin_id'])
    if len(likes) > 0:
        image_path = STATIC_URL + "garbeco/images/like_active.png"
    else:
        image_path = STATIC_URL + "garbeco/images/like_notactive.png"
    for type in curr_garbin.types.all():
        types.append(type.name)
    return HttpResponse(render(request, "garbin_info.html",
                               context={'user_id': user_id, 'username': username,
                                        'description': description, 'added': added,
                                        'types': types, 'image_path': image_path, 'likes_amount': likes_amount}))


def send_garbage_bin_form(request):
    garbin = GarbageForm()
    return HttpResponse(render(request, "garbin_form.html", context={'garbin': garbin}))


def send_garbins(request, filter=None):
    if filter is None:
        garbin_objects = GarbageBin.objects.all()
    else:
        garbin_objects = GarbageBin.objects.filter(lat=filter[0], lng=filter[1])
    django_json = serializers.serialize("json", garbin_objects)
    json_arr = json.loads(django_json)
    garbins = []
    for element in json_arr:
        pk = element['pk']
        lat = float(element['fields']['lat'])
        lng = float(element['fields']['lng'])
        types = element['fields']['types']
        icon_path = GarbageType.objects.get(pk=types[0]).icon_path  # for now icon will reflect only one type
        type_names = []
        for type in types:
            type_names.append(GarbageType.objects.get(pk=type).name)
        description = element['fields']['description']
        garbins.append({'pk': pk, "lat": lat, "lng": lng, "icon_path": icon_path,
                        'type_names': type_names, "description": description})
    garbins = json.dumps(garbins)
    return JsonResponse(garbins, safe=False)


def like(request):
    likes = json.loads(request.POST['likes'])
    for submission_id in likes:
        belongs_to_type = request.POST['like_type']
        the_like = Like.objects.filter(user=request.user, belongs_to_type=belongs_to_type, belongs_to_id=submission_id)
        if len(the_like) == 0:  # create new like
            like = Like(user=request.user, belongs_to_type=belongs_to_type, belongs_to_id=submission_id)
            like.save()
            response = JsonResponse({'active': True, 'image_path': STATIC_URL + "garbeco/images/like_active.png"})
            return response
        elif len(the_like) > 1:
            response = JsonResponse({'error_message': "there are more than one like on the same submission from the same user"})
            response.status_code = 500
            return response
        else:  # delete like
            the_like[0].delete()
            return JsonResponse({'active': False, 'image_path': STATIC_URL + "garbeco/images/like_notactive.png"})


