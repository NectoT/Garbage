# Generated by Django 2.1.5 on 2019-05-05 08:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('garbeco', '0007_garbagebin_added'),
    ]

    operations = [
        migrations.CreateModel(
            name='GarbageTypes',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=15)),
                ('icon', models.FilePathField(path='C:/static/')),
            ],
        ),
        migrations.AlterField(
            model_name='garbagebin',
            name='description',
            field=models.TextField(default='', max_length=30),
        ),
    ]
