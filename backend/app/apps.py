# In your app (e.g., profiles/apps.py)

from django.apps import AppConfig

class ProfilesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'  # your app name

    def ready(self):
        import app.signals  # import signals so that they get registered
