import os
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_date(name: str, default: date) -> date:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return default

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-xpqm9x)fpaqfe@n&ys)sl+0zyju55enfzw^6o3dh!^%qyxo4l&",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool("DEBUG", False)
PAUTA_SYNC_START_DATE = env_date("PAUTA_SYNC_START_DATE", date(2025, 12, 1))
TELEGRAM_BOT_TOKEN = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
TELEGRAM_ALERT_CHAT_IDS = [
    item.strip()
    for item in (os.getenv("TELEGRAM_ALERT_CHAT_IDS") or "").split(",")
    if item.strip()
]
KOMMO_WEBHOOK_SECRET = (os.getenv("KOMMO_WEBHOOK_SECRET") or "").strip()
KOMMO_ACCESS_TOKEN = (os.getenv("KOMMO_ACCESS_TOKEN") or "").strip()
KOMMO_CONTACT_DEDUP_DAYS = int(os.getenv("KOMMO_CONTACT_DEDUP_DAYS", "7"))
LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS = int(os.getenv("LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS", "7"))

allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(",") if host.strip()]

cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
]
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)

default_public_origins = [
    "https://app.control-ar.com",
    "https://control-ar.com",
    "https://www.control-ar.com",
]
for origin in default_public_origins:
    if origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(origin)

csrf_trusted_origins_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in csrf_trusted_origins_env.split(",")
    if origin.strip()
]
for origin in default_public_origins:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", not DEBUG)


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'django_celery_results',
    'django_celery_beat',
    'channels',
    'apps.empresas.apps.EmpresasConfig',
    'apps.recursos.apps.RecursosConfig',
    'apps.operativo.apps.OperativoConfig',
    'apps.pauta.apps.PautaConfig',
    'storages',
]

AUTH_USER_MODEL = "empresas.Usuario"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'apps.empresas.middleware.CorsPreflightBypassMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'configs.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'configs.wsgi.application'
ASGI_APPLICATION = "configs.asgi.application"

# Base de datos Supabase PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv("DB_NAME", "postgres"),
        'USER': os.getenv("DB_USER", "postgres.jgrvubpozutmdhlkcbpe"),
        'PASSWORD': os.getenv("DB_PASSWORD", "Desarrollo2026!"),
        'HOST': os.getenv("DB_HOST", "aws-1-us-east-2.pooler.supabase.com"),
        'PORT': int(os.getenv("DB_PORT", "5432")),
        "OPTIONS": {
            "sslmode": os.getenv("DB_SSLMODE", "require"),
            "options": os.getenv("DB_OPTIONS", "-c search_path=control_ar,public"),
        },
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'es-es'

TIME_ZONE = 'America/Argentina/Buenos_Aires'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Media / S3
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME")
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL")
AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN")
AWS_PUBLIC_STORAGE_BUCKET_NAME = os.getenv("AWS_PUBLIC_STORAGE_BUCKET_NAME")
AWS_PRIVATE_STORAGE_BUCKET_NAME = os.getenv("AWS_PRIVATE_STORAGE_BUCKET_NAME")
AWS_PUBLIC_S3_REGION_NAME = os.getenv("AWS_PUBLIC_S3_REGION_NAME")
AWS_PRIVATE_S3_REGION_NAME = os.getenv("AWS_PRIVATE_S3_REGION_NAME")
AWS_PUBLIC_S3_ENDPOINT_URL = os.getenv("AWS_PUBLIC_S3_ENDPOINT_URL")
AWS_PRIVATE_S3_ENDPOINT_URL = os.getenv("AWS_PRIVATE_S3_ENDPOINT_URL")
AWS_PUBLIC_S3_CUSTOM_DOMAIN = os.getenv("AWS_PUBLIC_S3_CUSTOM_DOMAIN")
AWS_PRIVATE_S3_CUSTOM_DOMAIN = os.getenv("AWS_PRIVATE_S3_CUSTOM_DOMAIN")
AWS_S3_ADDRESSING_STYLE = os.getenv("AWS_S3_ADDRESSING_STYLE", "auto")
AWS_S3_SIGNATURE_VERSION = os.getenv("AWS_S3_SIGNATURE_VERSION")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = env_bool("AWS_QUERYSTRING_AUTH", True)
AWS_S3_FILE_OVERWRITE = env_bool("AWS_S3_FILE_OVERWRITE", False)
MEDIA_CACHE_CONTROL = os.getenv("MEDIA_CACHE_CONTROL", "public,max-age=2592000")
PUBLIC_MEDIA_CACHE_CONTROL = os.getenv("PUBLIC_MEDIA_CACHE_CONTROL", MEDIA_CACHE_CONTROL)
PRIVATE_MEDIA_CACHE_CONTROL = os.getenv("PRIVATE_MEDIA_CACHE_CONTROL", "private,max-age=300")
AWS_S3_OBJECT_PARAMETERS = {
    "CacheControl": PRIVATE_MEDIA_CACHE_CONTROL,
}

if AWS_STORAGE_BUCKET_NAME:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "location": "empresas",
            "default_acl": AWS_DEFAULT_ACL,
            "querystring_auth": AWS_QUERYSTRING_AUTH,
            "file_overwrite": AWS_S3_FILE_OVERWRITE,
            "object_parameters": AWS_S3_OBJECT_PARAMETERS,
        },
    }
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    elif AWS_S3_ENDPOINT_URL and AWS_STORAGE_BUCKET_NAME:
        MEDIA_URL = f"{AWS_S3_ENDPOINT_URL.rstrip('/')}/{AWS_STORAGE_BUCKET_NAME}/"
    else:
        MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/"


# Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_IMPORTS = ("apps.empresas.tasks", "apps.recursos.tasks", "apps.pauta.tasks")
CELERY_TASK_IGNORE_RESULT = env_bool("CELERY_TASK_IGNORE_RESULT", True)
CELERY_RESULT_EXPIRES = int(os.getenv("CELERY_RESULT_EXPIRES", "3600"))
CELERY_TASK_ACKS_LATE = env_bool("CELERY_TASK_ACKS_LATE", True)
CELERY_TASK_REJECT_ON_WORKER_LOST = env_bool("CELERY_TASK_REJECT_ON_WORKER_LOST", True)
CELERY_WORKER_PREFETCH_MULTIPLIER = int(os.getenv("CELERY_WORKER_PREFETCH_MULTIPLIER", "1"))
CELERY_WORKER_MAX_TASKS_PER_CHILD = int(os.getenv("CELERY_WORKER_MAX_TASKS_PER_CHILD", "200"))
CELERY_TASK_TRACK_STARTED = env_bool("CELERY_TASK_TRACK_STARTED", False)
CELERY_WORKER_SEND_TASK_EVENTS = env_bool("CELERY_WORKER_SEND_TASK_EVENTS", False)
CELERY_TASK_SEND_SENT_EVENT = env_bool("CELERY_TASK_SEND_SENT_EVENT", False)

# Realtime / Channels
CHANNEL_REDIS_URL = os.getenv("CHANNEL_REDIS_URL") or os.getenv("REDIS_URL", "redis://localhost:6379/0")
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [CHANNEL_REDIS_URL],
        },
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
}
