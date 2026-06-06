import os
import sys
from datetime import date
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
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

def _is_test_command() -> bool:
    return any(arg in {"test", "pytest"} or arg.endswith("pytest") for arg in sys.argv)


def env_required(name: str, *, dev_default: str = "") -> str:
    value = os.getenv(name)
    if value not in (None, ""):
        return value
    if not DEBUG and not _is_test_command():
        raise ImproperlyConfigured(f"{name} es obligatorio cuando DEBUG=False.")
    return dev_default


def env_csv(name: str) -> list[str]:
    return [
        item.strip().strip("\"'")
        for item in (os.getenv(name, "") or "").split(",")
        if item.strip().strip("\"'")
    ]


def normalize_origin(value: str) -> str:
    return value.strip().strip("\"'").rstrip("/")


def normalize_host(value: str) -> str:
    host = value.strip().strip("\"'").removeprefix("https://").removeprefix("http://").rstrip("/")
    return host.split("/", 1)[0]

# SECURITY WARNING: keep the secret key used in production secret!
DEBUG = env_bool("DEBUG", False)
SECRET_KEY = env_required("SECRET_KEY", dev_default="django-insecure-local-dev-only-change-me")

# SECURITY WARNING: don't run with debug turned on in production!
PAUTA_SYNC_START_DATE = env_date("PAUTA_SYNC_START_DATE", date(2025, 12, 1))
TELEGRAM_BOT_TOKEN = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
TELEGRAM_ALERT_CHAT_IDS = [
    item.strip()
    for item in (os.getenv("TELEGRAM_ALERT_CHAT_IDS") or "").split(",")
    if item.strip()
]
WHATSAPP = {
    "PHONE_NUMBER_ID": (os.getenv("WA_PHONE_NUMBER_ID") or "").strip(),
    "WABA_ID": (os.getenv("WA_WABA_ID") or "").strip(),
    "ACCESS_TOKEN": (os.getenv("WA_ACCESS_TOKEN") or "").strip(),
    "VERIFY_TOKEN": (os.getenv("WA_VERIFY_TOKEN") or "").strip(),
    "APP_SECRET": (os.getenv("WA_APP_SECRET") or "").strip(),
    "API_VERSION": (os.getenv("WA_API_VERSION") or "v21.0").strip(),
}
LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS = int(os.getenv("LANDING_CLIENT_FINGERPRINT_DEDUP_DAYS", "7"))

ALLOWED_HOSTS = [normalize_host(host) for host in env_csv("ALLOWED_HOSTS")]

CORS_ALLOWED_ORIGINS = [normalize_origin(origin) for origin in env_csv("CORS_ALLOWED_ORIGINS")]
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)

CSRF_TRUSTED_ORIGINS = [normalize_origin(origin) for origin in env_csv("CSRF_TRUSTED_ORIGINS")]

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
    'apps.crm.apps.CrmConfig',
    'storages',
]

AUTH_USER_MODEL = "empresas.Usuario"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'configs.middleware.RequestExceptionLoggingMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = os.getenv("DJANGO_URLCONF", "configs.urls")

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
        'NAME': env_required("DB_NAME", dev_default="postgres"),
        'USER': env_required("DB_USER", dev_default="postgres"),
        'PASSWORD': env_required("DB_PASSWORD", dev_default=""),
        'HOST': env_required("DB_HOST", dev_default="localhost"),
        'PORT': int(env_required("DB_PORT", dev_default="5432")),
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
REDIS_URL = os.getenv("REDIS_URL") or os.getenv("REDISURL") or os.getenv("REDIS_PRIVATE_URL") or "redis://localhost:6379/0"
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL") or REDIS_URL
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or REDIS_URL

if CELERY_BROKER_URL.startswith("rediss://"):
    import ssl
    CELERY_BROKER_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_NONE
    }
    CELERY_REDIS_BACKEND_USE_SSL = {
        "ssl_cert_reqs": ssl.CERT_NONE
    }

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_IMPORTS = ("apps.empresas.tasks", "apps.recursos.tasks", "apps.pauta.tasks", "apps.crm.tasks")
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
CHANNEL_REDIS_URL = os.getenv("CHANNEL_REDIS_URL") or REDIS_URL
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                {
                    "address": CHANNEL_REDIS_URL,
                    "socket_keepalive": True,
                    "health_check_interval": 30,
                    "retry_on_timeout": True,
                    "socket_connect_timeout": 10,
                    "socket_timeout": 10,
                }
            ],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
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

# Web Push Notifications VAPID config
VAPID_PUBLIC_KEY = (os.getenv("VAPID_PUBLIC_KEY") or "").strip()
VAPID_PRIVATE_KEY = (os.getenv("VAPID_PRIVATE_KEY") or "").strip()
VAPID_ADMIN_EMAIL = (os.getenv("VAPID_ADMIN_EMAIL") or "mailto:admin@control-ar.com").strip()

if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
    import logging
    logger = logging.getLogger("django")
    logger.warning("VAPID keys not configured in environment. Generating keys...")
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        import base64

        # Generate EC private key
        private_key = ec.generate_private_key(ec.SECP256R1())
        private_value = private_key.private_numbers().private_value
        private_bytes = private_value.to_bytes(32, byteorder='big')
        temp_private = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')

        # Get public key in uncompressed format (65 bytes)
        public_key = private_key.public_key()
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        temp_public = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')

        # Write to .env to make them persistent and shared across Django and Celery
        env_path = BASE_DIR / ".env"
        if env_path.exists():
            with open(env_path, "a") as f:
                f.write(f"\n# Web Push VAPID Keys\nVAPID_PUBLIC_KEY={temp_public}\nVAPID_PRIVATE_KEY={temp_private}\n")
            logger.info("Persistent VAPID Keys written successfully to .env")
        else:
            logger.warning(".env file not found, generated temporary keys for this session.")

        VAPID_PUBLIC_KEY = temp_public
        VAPID_PRIVATE_KEY = temp_private
    except Exception as e:
        logger.error(f"Error generating VAPID keys: {e}")

