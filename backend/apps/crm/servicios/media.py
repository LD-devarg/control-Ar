import mimetypes
import logging
import requests
import uuid
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from apps.pauta.servicios.crypto import decrypt_token

logger = logging.getLogger("apps.crm.media")

def descargar_y_guardar_media_whatsapp(config, media_id, user_filename=None) -> tuple[str, str, int, str] | tuple[None, None, None, None]:
    """
    Downloads media file from WhatsApp API using the provided media_id
    and uploads/saves it to default storage (S3 or local depending on configuration).
    
    Returns:
        tuple: (file_url, file_name, file_size, mime_type) or (None, None, None, None) on error
    """
    if not config or not config.access_token_encrypted:
        logger.error("No active WhatsApp config or access token found for media download.")
        return None, None, None, None
        
    try:
        token = decrypt_token(config.access_token_encrypted)
    except Exception as e:
        logger.error(f"Error decrypting token for config {config.id}: {e}")
        return None, None, None, None

    api_version = (getattr(settings, "WHATSAPP", {}) or {}).get("API_VERSION") or "v21.0"
    meta_url = f"https://graph.facebook.com/{api_version}/{media_id}"
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Get media URL from Meta API
    try:
        res = requests.get(meta_url, headers=headers, timeout=15)
        res.raise_for_status()
        media_data = res.json()
    except Exception as e:
        logger.error(f"Error fetching media metadata for id {media_id}: {e}")
        return None, None, None, None

    download_url = media_data.get("url")
    mime_type = media_data.get("mime_type") or ""
    file_size = media_data.get("file_size")

    if not download_url:
        logger.error(f"No download URL found in Meta response for media {media_id}")
        return None, None, None, None

    # Step 2: Download the binary file
    try:
        file_res = requests.get(download_url, headers=headers, timeout=30)
        file_res.raise_for_status()
        file_bytes = file_res.content
    except Exception as e:
        logger.error(f"Error downloading binary content for media {media_id}: {e}")
        return None, None, None, None

    # Step 3: Determine file extension and name
    # Clean/normalize mime-type string
    mime_clean = mime_type.split(";")[0].strip() if mime_type else ""
    ext = mimetypes.guess_extension(mime_clean) if mime_clean else ""
    if not ext:
        if "ogg" in mime_type:
            ext = ".ogg"
        elif "audio" in mime_type:
            ext = ".mp3"
        elif "video" in mime_type:
            ext = ".mp4"
        elif "image" in mime_type:
            ext = ".jpg"
        else:
            ext = ".bin"

    # Clean extension if mimetypes returns dot-less or weird stuff
    if ext and not ext.startswith("."):
        ext = f".{ext}"

    # Generate unique storage filename
    unique_id = uuid.uuid4().hex
    storage_name = f"whatsapp_media/{unique_id}{ext}"

    # Determine filename to show/use
    if user_filename:
        file_name = user_filename
    else:
        file_name = f"{media_id}{ext}"

    # Step 4: Save to default storage
    try:
        saved_path = default_storage.save(storage_name, ContentFile(file_bytes))
        file_url = default_storage.url(saved_path)
        logger.info(f"Successfully saved WhatsApp media {media_id} to {saved_path} (URL: {file_url})")
        return file_url, file_name, file_size or len(file_bytes), mime_type
    except Exception as e:
        logger.error(f"Error saving media file {storage_name} to storage: {e}")
        return None, None, None, None
