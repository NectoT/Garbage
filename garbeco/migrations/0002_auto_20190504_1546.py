# Generated by Django 2.1.5 on 2019-05-04 12:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('garbeco', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pagestatistics',
            name='visits',
            field=models.IntegerField(default=0),
        ),
    ]
