from django.http import HttpResponse


class CorsPreflightBypassMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS" and request.headers.get("Access-Control-Request-Method"):
            return HttpResponse(status=200)
        return self.get_response(request)
