from django.db import models
from django import forms
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from Garbage.settings import BASE_DIR, STATIC_URL
import os


class PageStatistics(models.Model):
    page_url = models.CharField(max_length=50)
    visits = models.IntegerField(default=0)

#
# NORMAL = "normal"
# PAPER = "paper"
# GLASS = "glass"
# PLASTIC = "plastic"
# type_choices = ((NORMAL, 'normal'),
#                 (PAPER, 'paper'),
#                 (GLASS, 'glass'),
#                 (PLASTIC, 'plastic'),
#                 )


class GarbageType(models.Model):
    name = models.CharField(max_length=15, unique=True, default=None)
    icon_path = models.CharField(max_length=100, default=None)

    def __str__(self):
        return self.name


class GarbageBin(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET("deleted"))  # not sure about delete part
    lat = models.FloatField()
    lng = models.FloatField()
    added = models.DateTimeField(auto_now_add=True)
    types = models.ManyToManyField(GarbageType)
    description = models.TextField(max_length=30, default="")



class GarbageForm(forms.Form):
    lat = forms.FloatField(widget=forms.HiddenInput)
    lng = forms.FloatField(widget=forms.HiddenInput)
    types = forms.ModelMultipleChoiceField(queryset=GarbageType.objects.all(),
                                      widget=forms.CheckboxSelectMultiple(attrs={'class': 'list-group', 'id': 'checkboxes', 'label': 'Тип'}))
    description = forms.CharField(max_length=60, widget=forms.Textarea(attrs={'id': 'textarea', 'class': ''}), label='Описание', required=False)

    def clean(self):
        cleaned_data = super().clean()
        print(cleaned_data.get('types'))
        if cleaned_data.get('types') is None:
            error = forms.ValidationError("Должен быть минимум один тип")
            self.add_error('types', error)


class LoginForm(forms.Form):
    username = forms.CharField(widget=forms.TextInput(attrs={'class': 'form-control'}), label="Имя")
    password = forms.CharField(min_length=6,
                               widget=forms.PasswordInput(attrs={'class': 'form-control', 'id': 'pass'}), label="Пароль")


class RegisterForm(forms.Form):
    username = forms.CharField(widget=forms.TextInput(
        attrs={'class': 'form-control'}), label='Имя')
    password = forms.CharField(min_length=6, widget=forms.PasswordInput(
        attrs={'class': 'form-control'}), label='Пароль')
    confirm_password = forms.CharField(min_length=6, widget=forms.PasswordInput(
        attrs={'class': 'form-control'}), label="Повторите пароль")
    email = forms.EmailField(widget=forms.EmailInput(
        attrs={'class': 'form-control'}), label="Email")

    def clean(self):
        cleaned_data = super().clean()

        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        if password != confirm_password:
            error = forms.ValidationError("Пароли не совпадают")
            self.add_error('password', error)

        username = cleaned_data.get('username')
        if len(User.objects.filter(username=username)) != 0 or username == "AnonymousUser":
            error = forms.ValidationError("Имя уже существует", code="invalid")
            self.add_error('username', error)


class Like(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    added = models.DateTimeField(auto_now_add=True)
    belongs_to_id = models.PositiveIntegerField()
    belongs_to_type = models.CharField(max_length=20, choices=(
        ('garbin', 'garbage bin'),
        ('event', 'event')
    ))

