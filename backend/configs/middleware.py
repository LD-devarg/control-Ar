import logging
import uuid

from django.http import JsonResponse

logger = logging.getLogger(__name__)


class RequestExceptionLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = (
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Railway-Request-Id")
            or uuid.uuid4().hex
        )
        request.request_id = request_id

        try:
            response = self.get_response(request)
        except Exception:
            user = getattr(request, "user", None)
            user_id = getattr(user, "id", None) if getattr(user, "is_authenticated", False) else None

            logger.exception(
                "Unhandled request exception request_id=%s method=%s path=%s query=%s user_id=%s",
                request_id,
                request.method,
                request.path,
                dict(request.GET.lists()),
                user_id,
            )

            response = JsonResponse(
                {
                    "detail": "Error interno del servidor.",
                    "request_id": request_id,
                },
                status=500,
            )

        response["X-Request-ID"] = request_id
        return response
