from django.db import migrations, models


def migrate_is_public_to_visibility(apps, schema_editor):
    OnlineLevel = apps.get_model('Sledgepong', 'OnlineLevel')
    for level in OnlineLevel.objects.all():
        level.visibility = 'online' if level.is_public else 'private'
        level.save()


class Migration(migrations.Migration):

    dependencies = [
        ('Sledgepong', '0008_onlinelevel'),
    ]

    operations = [
        migrations.AddField(
            model_name='onlinelevel',
            name='visibility',
            field=models.CharField(
                choices=[('private', 'Private'), ('online', 'Online'), ('original', 'Original')],
                default='private',
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_is_public_to_visibility, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='onlinelevel',
            name='is_public',
        ),
    ]
