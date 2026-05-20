from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Sledgepong', '0009_onlinelevel_visibility'),
    ]

    operations = [
        migrations.AddField(
            model_name='onlinelevel',
            name='song_file',
            field=models.FileField(blank=True, null=True, upload_to='Sledgepong/songs/'),
        ),
    ]
