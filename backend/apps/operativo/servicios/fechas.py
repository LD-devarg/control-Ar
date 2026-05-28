from __future__ import annotations

from datetime import datetime, time, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date


def get_datetime_range(request):
    period = request.query_params.get("period")
    from_str = request.query_params.get("from")
    to_str = request.query_params.get("to")

    start = end = None

    if from_str:
        parsed = parse_date(from_str)
        if parsed:
            start = timezone.make_aware(datetime.combine(parsed, time.min))
    if to_str:
        parsed = parse_date(to_str)
        if parsed:
            end = timezone.make_aware(datetime.combine(parsed, time.max))

    if not start and not end and period:
        now = timezone.now()
        if period == "day":
            start = now - timedelta(days=1)
        elif period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now - timedelta(days=30)

    return start, end


def get_date_range(request, *, default_days: int = 7):
    start, end = get_datetime_range(request)
    if start or end:
        today = timezone.now().date()
        return (start.date() if start else today - timedelta(days=default_days), end.date() if end else today)

    today = timezone.now().date()
    return today - timedelta(days=default_days), today


def apply_date_filters(qs, field: str, request):
    start, end = get_datetime_range(request)
    if start:
        qs = qs.filter(**{f"{field}__gte": start})
    if end:
        qs = qs.filter(**{f"{field}__lte": end})
    return qs
