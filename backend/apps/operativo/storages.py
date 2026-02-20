from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicMediaStorage(S3Boto3Storage):
    bucket_name = settings.AWS_PUBLIC_STORAGE_BUCKET_NAME or settings.AWS_STORAGE_BUCKET_NAME
    custom_domain = settings.AWS_PUBLIC_S3_CUSTOM_DOMAIN or settings.AWS_S3_CUSTOM_DOMAIN
    region_name = settings.AWS_PUBLIC_S3_REGION_NAME or settings.AWS_S3_REGION_NAME
    endpoint_url = settings.AWS_PUBLIC_S3_ENDPOINT_URL or settings.AWS_S3_ENDPOINT_URL
    default_acl = None
    file_overwrite = False
    querystring_auth = False
    location = "empresas"
    object_parameters = {"CacheControl": settings.PUBLIC_MEDIA_CACHE_CONTROL}


class PrivateMediaStorage(S3Boto3Storage):
    bucket_name = settings.AWS_PRIVATE_STORAGE_BUCKET_NAME or settings.AWS_STORAGE_BUCKET_NAME
    custom_domain = settings.AWS_PRIVATE_S3_CUSTOM_DOMAIN
    region_name = settings.AWS_PRIVATE_S3_REGION_NAME or settings.AWS_S3_REGION_NAME
    endpoint_url = settings.AWS_PRIVATE_S3_ENDPOINT_URL or settings.AWS_S3_ENDPOINT_URL
    default_acl = None
    file_overwrite = False
    querystring_auth = True
    location = "empresas"
    object_parameters = {"CacheControl": settings.PRIVATE_MEDIA_CACHE_CONTROL}
