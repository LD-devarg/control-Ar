from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response

from apps.operativo.codigo_reservas import consume_reservation
from apps.operativo.models import Cliente
from apps.operativo.serializers import (
    ClienteSerializer,
    get_request_ip,
    get_request_user_agent,
    normalize_contacto,
)


def crear_cliente_desde_viewset(*, viewset, request, deps: dict):
    reservation_token = str(request.data.get("reservation_token") or "").strip()
    serializer = viewset.get_serializer(
        data=request.data,
        context={**viewset.get_serializer_context(), "reservation_token": reservation_token},
    )
    serializer.is_valid(raise_exception=True)
    requested_codigo = str(request.data.get("codigo") or "").strip()

    idempotency_key = serializer.validated_data.get("idempotency_key")
    if idempotency_key:
        existing = Cliente.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            if reservation_token:
                consume_reservation(reservation_token)
            output = ClienteSerializer(existing)
            return Response(output.data, status=status.HTTP_200_OK)

    landing = serializer.validated_data["landing"]
    manual_create = bool(serializer.validated_data.get("manual_create"))
    confirm_existing_code = bool(serializer.validated_data.get("confirm_existing_code"))
    if manual_create and requested_codigo and not confirm_existing_code:
        existing_cliente = (
            Cliente.objects.filter(empresa_id=landing.empresa_id, codigo=requested_codigo)
            .only("id", "codigo", "nombre", "username", "contacto")
            .first()
        )
        if existing_cliente:
            return Response(
                {
                    "detail": "Cliente existente, desea crear igualmente?",
                    "code_conflict": True,
                    "existing_cliente": {
                        "id": existing_cliente.id,
                        "codigo": existing_cliente.codigo,
                        "nombre": existing_cliente.nombre,
                        "username": existing_cliente.username,
                        "contacto": existing_cliente.contacto,
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

    normalized_contacto = normalize_contacto(serializer.validated_data.get("contacto"))
    normalized_fbp = str(serializer.validated_data.get("fbp") or "").strip()
    normalized_fbc = str(serializer.validated_data.get("fbc") or "").strip()
    normalized_event_source_url = str(serializer.validated_data.get("event_source_url") or "").strip()
    request_ip = get_request_ip(request)
    request_user_agent = get_request_user_agent(request)
    skip_landing_dedup = bool(reservation_token)

    if not skip_landing_dedup:
        fingerprint_cliente, fingerprint_dedup_details = deps["find_recent_fingerprint_cliente"](
            empresa_id=landing.empresa_id,
            fbp=normalized_fbp,
            event_source_url=normalized_event_source_url,
            user_agent=request_user_agent or "",
            ip_address=request_ip,
        )
        if fingerprint_cliente:
            cliente = deps["merge_cliente_missing_fields"](
                cliente=fingerprint_cliente,
                validated_data=serializer.validated_data,
                request=request,
            )
            deps["create_lead_event"](
                landing=landing,
                cliente=cliente,
                request=request,
                requested_codigo=requested_codigo,
                resultado="deduplicado_fingerprint",
                motivo="cliente_existente_por_fingerprint",
                dedup_details=fingerprint_dedup_details,
            )
            if reservation_token:
                consume_reservation(reservation_token)
            output = ClienteSerializer(cliente)
            return Response(output.data, status=status.HTTP_200_OK)

        duplicate_cliente, duplicate_dedup_details = deps["find_recent_duplicate_lead_cliente"](
            landing_id=landing.id,
            contacto=normalized_contacto,
            fbp=normalized_fbp,
            fbc=normalized_fbc,
            ip_address=request_ip,
            user_agent=request_user_agent,
        )
        if duplicate_cliente:
            cliente = deps["merge_cliente_missing_fields"](
                cliente=duplicate_cliente,
                validated_data=serializer.validated_data,
                request=request,
            )
            deps["create_lead_event"](
                landing=landing,
                cliente=cliente,
                request=request,
                requested_codigo=requested_codigo,
                resultado="deduplicado_lead",
                motivo="lead_reciente_duplicado",
                dedup_details=duplicate_dedup_details,
            )
            if reservation_token:
                consume_reservation(reservation_token)
            output = ClienteSerializer(cliente)
            return Response(output.data, status=status.HTTP_200_OK)

    cliente = serializer.save()
    if not skip_landing_dedup:
        recent_event = deps["find_recent_lead_event"](cliente_id=cliente.id, landing_id=landing.id)
        if recent_event:
            deps["create_lead_event"](
                landing=landing,
                cliente=cliente,
                request=request,
                requested_codigo=requested_codigo,
                resultado="deduplicado_evento_reciente",
                motivo="lead_reciente_existente",
            )
            if reservation_token:
                consume_reservation(reservation_token)
            output = ClienteSerializer(cliente)
            return Response(output.data, status=status.HTTP_200_OK)

    resultado = "creado_reasignado" if requested_codigo and requested_codigo != cliente.codigo else "creado"
    motivo = "codigo_reasignado" if resultado == "creado_reasignado" else "cliente_nuevo"
    evento = deps["create_lead_event"](
        landing=landing,
        cliente=cliente,
        request=request,
        requested_codigo=requested_codigo,
        resultado=resultado,
        motivo=motivo,
    )
    deps["safe_publish_empresa_event"](
        empresa_id=landing.empresa_id,
        event_type="lead_created",
        payload={
            "id": evento.id,
            "cliente": cliente.id,
            "cliente_codigo": cliente.codigo,
            "cliente_nombre": cliente.nombre,
            "cliente_username": cliente.username,
            "cliente_contacto": cliente.contacto,
            "creado_en": evento.creado_en.isoformat(),
        },
    )
    if reservation_token:
        consume_reservation(reservation_token)

    output = ClienteSerializer(cliente)
    return Response(output.data, status=status.HTTP_201_CREATED)
