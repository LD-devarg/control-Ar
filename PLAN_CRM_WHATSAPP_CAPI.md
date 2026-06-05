# Plan técnico — CRM WhatsApp + CAPI multi-fuente

> Documento de diseño e implementación para integrar un CRM de WhatsApp
> (Click-to-WhatsApp) a ControlAR y generalizar el motor CAPI para soportar
> múltiples fuentes de eventos (landing, WhatsApp, ecommerce futuro).
>
> **Estado del proyecto al escribir esto:** ControlAR es un monorepo
> `backend/` (Django + DRF + Celery + Channels) + `frontend/` (React + Vite),
> desplegado en Railway. El motor CAPI ya funciona en producción para leads
> de landing (verticales grises / casino).

---

## 1. Objetivo y principios

### 1.1 Qué construimos
1. Una **app Django nueva `crm`** dentro de `backend/apps/crm/` que:
   - Recibe el webhook de WhatsApp Cloud API (mensajes entrantes).
   - Persiste conversaciones y mensajes (es dueño del canal de comunicación).
   - Captura el `ctwa_clid` del objeto `referral` de los anuncios CTWA.
   - Crea/actualiza el `Cliente` (lead) reutilizando la lógica existente.
   - Dispara eventos CAPI (`Lead`, `Purchase`) con atribución de WhatsApp.
   - Expone una bandeja (API + frontend) para ver y responder conversaciones.

2. Un **refactor incremental y retrocompatible** del motor CAPI para que sea
   **agnóstico de la fuente**: hoy asume "landing web"; pasa a aceptar un
   contrato normalizado que puede venir de landing, WhatsApp o (futuro) ecommerce.

### 1.2 Principios de diseño
- **No romper producción.** El flujo de landing está vivo con clientes reales.
  Todo cambio en `constructor.py` / `enviador.py` mantiene el comportamiento
  actual como default. WhatsApp se suma como segunda fuente, no reemplaza nada.
- **Monorepo, múltiples servicios.** Un solo repo, una sola base de datos, un
  solo grafo de migraciones. Railway despliega el mismo repo como varios
  servicios (app, crm) separados por dominio y `ROOT_URLCONF`.
- **CAPI in-process, no HTTP.** El CRM llama a `enviar_evento_meta()` como
  función importada (mismo proceso/BD), no por red. Se descartó el microservicio
  HTTP porque la BD y credenciales son compartidas (aislarlo no aporta).
- **Tenant compartido.** `Empresa`/`Usuario` son los mismos para app y CRM. Sin
  master keys ni sincronización de identidades.

### 1.3 Arquitectura de despliegue (Railway)

| Servicio | Dominio | Comando | URLCONF |
|---|---|---|---|
| app-web | app.control-ar.com | gunicorn ASGI | `configs.urls` (actual) |
| crm-web | crm.control-ar.com | gunicorn ASGI | `configs.urls_crm` (nuevo) |
| worker | — | celery worker | — |
| beat | — | celery beat | — |
| (futuro) capi-ui | capi.control-ar.com | gunicorn | solo lectura de eventos |

Todos comparten `DATABASE_URL`, `REDIS_URL`, y variables Meta por entorno.

---

## 2. Flujo end-to-end objetivo

```
Persona ve anuncio CTWA → clickea → escribe al número de WhatsApp
        │
        ▼
[WEBHOOK]  Meta → POST crm.control-ar.com/webhook/whatsapp/
        │   crm responde 200 OK inmediato (acuse a Meta)
        │   encola tarea Celery (procesamiento async)
        ▼
[PARSER]   extrae: phone, name, ctwa_clid, source_ad_id, wa_message_id, texto
        │
        ▼
[DEDUP + LEAD]  crear_cliente_desde_whatsapp():
        │   - dedup por teléfono (mismo número → mismo Cliente)
        │   - crea/actualiza operativo.Cliente (con ctwa_clid)
        │   - crea crm.Conversation + crm.Message
        │   - crea operativo.EventosMeta (tipo=lead, fuente=whatsapp)
        ▼
[CAPI]     enviar_evento_meta(evento):
        │   - action_source = business_messaging
        │   - messaging_channel = whatsapp
        │   - user_data.ctwa_clid + whatsapp_business_account_id
        │   - persiste respuesta_meta + estado_envio
        ▼
[REALTIME] safe_publish_empresa_event("lead_created") → dashboards en vivo
        │
        ▼
[BANDEJA]  operador ve la conversación en crm.control-ar.com y responde
        │   (envío saliente vía Cloud API, dentro de ventana de 24h)
        ▼
[CONVERSIÓN]  cuando el lead compra → se mueve estado en bandeja →
            enviar_evento_meta(tipo=purchase) recuperando el ctwa_clid
            persistido en el Cliente (atribución de la conversión tardía)
```

**Dato crítico de negocio (verificado contra doc Meta):** para atribuir
conversiones de CTWA, el payload CAPI **debe** incluir `ctwa_clid` +
`action_source: business_messaging`. Si falta cualquiera, el evento se acepta
pero no se atribuye a la campaña. Ventana de atribución: ~72h desde el clic.

---

## 3. Cambios en lo existente

### 3.1 `apps/operativo/models.py` — modelo `Cliente`

**Agregar campos** para soportar la fuente WhatsApp y la atribución CTWA.
El modelo hoy tiene `fbc`, `fbp`, `fbclid` (señales web) pero no las de WhatsApp.

```python
# NUEVOS CAMPOS en class Cliente
ctwa_clid = models.CharField(max_length=512, null=True, blank=True)
wa_phone = models.CharField(max_length=20, null=True, blank=True)  # E.164 normalizado
source_ad_id = models.CharField(max_length=100, null=True, blank=True)
origen = models.CharField(
    max_length=20,
    choices=[("landing", "Landing"), ("whatsapp", "WhatsApp"), ("manual", "Manual")],
    default="landing",
)
```

> **Nota:** `ctwa_clid` se persiste en el `Cliente` (no solo en la conversación)
> porque la compra puede ocurrir semanas después y necesitamos el ID para el
> evento `Purchase`. Es el mismo patrón "identificador que viaja con el lead"
> que ya usás con `fbc`/`fbp`.

Migración: `python manage.py makemigrations operativo` → bajo riesgo, solo
agrega columnas nullable.

### 3.2 `apps/operativo/models.py` — modelo `EventosMeta`

**Agregar campos** para registrar la fuente y las señales de WhatsApp en el
propio evento (auditoría y reenvío):

```python
# NUEVOS CAMPOS en class EventosMeta
fuente = models.CharField(
    max_length=20,
    choices=[("landing", "Landing"), ("whatsapp", "WhatsApp"), ("ecommerce", "Ecommerce")],
    default="landing",
)
ctwa_clid = models.CharField(max_length=512, null=True, blank=True)
```

> `landing` ya es `null=True` en el modelo, así que un evento de WhatsApp
> (sin landing) es válido a nivel schema. Lo que hay que cambiar es la
> **función** que hoy exige landing (ver 3.4).

### 3.3 `apps/operativo/servicios/constructor.py` — `MetaEventBuilder.build`

**El cambio más delicado.** Hoy `action_source` está hardcodeado en `"website"`
y no hay forma de mandar `messaging_channel` ni `ctwa_clid`. Lo hacemos
**parametrizable con default retrocompatible**.

Cambios concretos en `build()`:

```python
@staticmethod
def build(*, tipo, payload, request=None, event_time=None) -> tuple[dict, uuid.UUID]:
    ...
    # NUEVO: action_source parametrizable, default "website" (comportamiento actual)
    action_source = payload.get("action_source", "website")

    # user_data: sumar ctwa_clid y whatsapp_business_account_id si vienen
    user_data = _clean_dict({
        "em": _sha256(_normalize_email(payload.get("email"))),
        "ph": _sha256(_normalize_phone(payload.get("phone"))),
        "fn": _sha256(first_name),
        "ln": _sha256(last_name),
        "external_id": _sha256(...),
        "fbp": payload.get("fbp"),
        "fbc": payload.get("fbc"),
        # --- NUEVO (CTWA) ---
        "ctwa_clid": payload.get("ctwa_clid"),
        "whatsapp_business_account_id": payload.get("waba_id"),
        # ---
        "client_ip_address": _normalize_ip(payload.get("ip_address")) or _extract_request_ip(request),
        "client_user_agent": payload.get("user_agent") or (request.META.get("HTTP_USER_AGENT") if request else None),
    })

    data_dict = {
        "event_name": EVENT_NAME_MAP[tipo],
        "event_time": event_time_int,
        "event_id": str(event_id),
        "action_source": action_source,          # <- ya no hardcodeado
        "event_source_url": event_source_url,
        "user_data": user_data,
        "custom_data": custom_data,
    }

    # NUEVO: messaging_channel solo para business_messaging
    if action_source == "business_messaging":
        data_dict["messaging_channel"] = payload.get("messaging_channel", "whatsapp")
        # CTWA no usa event_source_url; evitamos mandarlo nulo/irrelevante
        data_dict.pop("event_source_url", None)

    data = _clean_dict(data_dict)
    return data, event_id
```

**Garantía de no-regresión:** si `payload` no trae `action_source`, queda
`"website"` y `ctwa_clid`/`waba_id` son `None` (los limpia `_clean_dict`). El
flujo de landing produce exactamente el mismo payload que hoy.

> **Pendiente de verificar contra doc oficial Meta antes de mergear:** ubicación
> exacta de `ctwa_clid` (va en `user_data`, confirmado por múltiples fuentes) y
> si el identificador de cuenta debe ser `whatsapp_business_account_id` o
> `page_id` según el tipo de cuenta. Probar con el Test Events tool de Events
> Manager antes de produccion.

### 3.4 `apps/operativo/servicios/eventos.py` — factory único de eventos Meta

El refactor correcto no es solo extraer `_create_lead_event`. Hoy hay varios
callers que crean `EventosMeta` directamente y cada uno resuelve señales de
forma parcial. Para WhatsApp eso es frágil: el `Purchase` de un cliente CTWA
debe llevar `ctwa_clid` aunque el caller no se acuerde de sumarlo.

**Estrategia:** crear un único factory `crear_y_enviar_evento()` y hacer que
todos los callers no-Kommo pasen por ahí. Ese factory:

1. Resuelve señales una sola vez según `fuente` / `cliente.origen`:
   - landing/web: `fbp`, `fbc`, `ip_address`, `user_agent`.
   - WhatsApp: `ctwa_clid`, `action_source=business_messaging`,
     `messaging_channel=whatsapp`.
2. Crea `EventosMeta` en un solo lugar.
3. Ejecuta `enviar_evento_meta()` con un único `try/except`.
4. Devuelve el evento persistido.

Nuevo archivo:

```python
# apps/operativo/servicios/eventos.py  (NUEVO archivo)
def crear_y_enviar_evento(
    *,
    cliente,
    empresa,
    tipo,
    fuente="landing",
    landing=None,
    operador=None,
    data_payload=None,
    request=None,
    test_event_code=None,
    enviar=True,
):
    payload = dict(data_payload or {})
    fuente_resuelta = fuente or getattr(cliente, "origen", "landing") or "landing"
    senales = _resolver_senales(
        cliente=cliente,
        fuente=fuente_resuelta,
        request=request,
        data_payload=payload,
    )

    evento = EventosMeta.objects.create(
        id_evento=uuid.uuid4(),
        cliente=cliente,
        empresa=empresa,
        landing=landing,
        operador=operador,
        tipo=tipo,
        fuente=fuente_resuelta,
        data={**payload, **senales["payload_extra"]},
        ocurrido_en=timezone.now(),
        fbp=senales.get("fbp"),
        fbc=senales.get("fbc"),
        ctwa_clid=senales.get("ctwa_clid"),
        ip_address=senales.get("ip_address"),
        user_agent=senales.get("user_agent"),
    )

    if enviar:
        try:
            enviar_evento_meta(evento, request=request, test_event_code=test_event_code)
        except Exception as exc:
            evento.estado_envio = "fallido"
            evento.respuesta_meta = {"error": str(exc)}
            evento.save(update_fields=["estado_envio", "respuesta_meta"])
    else:
        evento.estado_envio = "enviado"
        evento.respuesta_meta = {"skipped": True}
        evento.save(update_fields=["estado_envio", "respuesta_meta"])

    return evento
```

Callers que quedan después del refactor:

| Línea actual | Método / clase | Acción |
|---|---|---|
| 497 | `_create_lead_event` helper usado por `ClienteViewSet` | Migrar a factory |
| 972 | `lead_confirm` / `KommoWebhookViewSet` | Borrar |
| 1063 | `contact` / `KommoWebhookViewSet` | Borrar |
| 1434 | `create` / `EventosMetaViewSet` | Migrar a factory |
| 1576 | `test_event` / `EventosMetaViewSet` | Migrar a factory |
| 1619 | `test_event` / `EventosMetaViewSet` | Migrar a factory |
| 1748 | `create` / `CompraViewSet` | Migrar a factory |

**Kommo se elimina completo** como lógica y como opción de conexión. No queda
como fuente soportada para CAPI ni como webhook activo.

### 3.5 `apps/operativo/servicios/enviador.py`

Cambios mínimos. El `enviador` ya recibe el `evento` y llama a
`MetaEventBuilder.build(tipo=..., payload=..., request=...)`. Como el
`action_source`/`ctwa_clid` ahora viajan dentro del `payload` (en `_merge_payload`),
hay que asegurar que `_merge_payload` propague los campos nuevos:

```python
def _merge_payload(evento) -> dict[str, Any]:
    payload = dict(evento.data or {})
    if evento.fbp: payload["fbp"] = evento.fbp
    if evento.fbc: payload["fbc"] = evento.fbc
    # --- NUEVO ---
    if getattr(evento, "ctwa_clid", None):
        payload["ctwa_clid"] = evento.ctwa_clid
    if getattr(evento, "fuente", None) == "whatsapp":
        payload["action_source"] = "business_messaging"
        payload["messaging_channel"] = "whatsapp"
    # ---
    # ... resto igual (ip_address, user_agent)
    return payload
```

> El `enviador` sigue resolviendo credenciales por empresa, multi-credencial,
> reintentos y persistencia igual que hoy. `waba_id` se puede tomar de una var
> de entorno o de un campo de configuración por empresa (ver 5.2).

### 3.6 `configs/settings.py`

```python
INSTALLED_APPS = [
    ...
    'apps.pauta.apps.PautaConfig',
    'apps.crm.apps.CrmConfig',     # NUEVO
    'storages',
]

# NUEVO: selección de URLCONF por servicio (Railway env var)
import os
ROOT_URLCONF = os.getenv("DJANGO_URLCONF", "configs.urls")

# NUEVO: config WhatsApp Cloud API
WHATSAPP = {
    "PHONE_NUMBER_ID": os.getenv("WA_PHONE_NUMBER_ID"),
    "WABA_ID": os.getenv("WA_WABA_ID"),
    "ACCESS_TOKEN": os.getenv("WA_ACCESS_TOKEN"),       # token permanente (system user)
    "VERIFY_TOKEN": os.getenv("WA_VERIFY_TOKEN"),       # string secreto propio para el GET challenge
    "API_VERSION": os.getenv("WA_API_VERSION", "v21.0"),
}
```

### 3.7 `configs/urls.py` (app, sin cambios) + `configs/urls_crm.py` (nuevo)

`configs/urls.py` queda como está (dashboards de app.control-ar.com).
Se crea `configs/urls_crm.py` que expone **solo** lo del CRM:

```python
# configs/urls_crm.py  (NUEVO)
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.crm.views import ConversationViewSet, MessageViewSet
from apps.crm.webhooks import WhatsAppWebhookView

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("webhook/whatsapp/", WhatsAppWebhookView.as_view(), name="wa-webhook"),
    path("", include(router.urls)),
]
```

---

## 4. App nueva: `apps/crm/`

Estructura propuesta (sigue el patrón de las apps existentes):

```
backend/apps/crm/
├── __init__.py
├── apps.py                     # CrmConfig
├── admin.py
├── models.py                   # Conversation, Message
├── serializers.py              # para la bandeja
├── views.py                    # ConversationViewSet, MessageViewSet
├── webhooks.py                 # WhatsAppWebhookView (GET challenge + POST)
├── tasks.py                    # tarea Celery: procesar_mensaje_entrante
├── urls.py
├── migrations/
└── servicios/
    ├── __init__.py
    ├── parser.py               # parse del payload del webhook → dict normalizado
    ├── lead.py                 # crear_cliente_desde_whatsapp() + dedup
    └── wa_client.py            # envío saliente vía Cloud API (responder)
```

### 4.1 `models.py`

```python
import uuid
from django.db import models


class Conversation(models.Model):
    empresa = models.ForeignKey("empresas.Empresa", on_delete=models.CASCADE,
                                related_name="conversaciones")
    cliente = models.ForeignKey("operativo.Cliente", on_delete=models.SET_NULL,
                                null=True, blank=True, related_name="conversaciones")
    wa_phone = models.CharField(max_length=20)          # E.164 del cliente
    contact_name = models.CharField(max_length=120, null=True, blank=True)
    ctwa_clid = models.CharField(max_length=512, null=True, blank=True)
    source_ad_id = models.CharField(max_length=100, null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=[("nuevo", "Nuevo"), ("en_conversacion", "En conversación"),
                 ("calificado", "Calificado"), ("convertido", "Convertido"),
                 ("perdido", "Perdido")],
        default="nuevo",
    )
    last_inbound_at = models.DateTimeField(null=True, blank=True)   # control ventana 24h
    last_outbound_at = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_conversation"
        ordering = ["-actualizado_en", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["empresa", "wa_phone"],
                                    name="uniq_empresa_wa_phone"),
        ]


class Message(models.Model):
    DIRECTION_IN = "inbound"
    DIRECTION_OUT = "outbound"

    conversation = models.ForeignKey("crm.Conversation", on_delete=models.CASCADE,
                                     related_name="mensajes")
    direction = models.CharField(max_length=10,
                                 choices=[(DIRECTION_IN, "Inbound"), (DIRECTION_OUT, "Outbound")])
    wa_message_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    body = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, default="text")   # text, image, etc.
    estado = models.CharField(max_length=20, null=True, blank=True)  # sent/delivered/read/failed
    timestamp = models.DateTimeField()
    raw = models.JSONField(null=True, blank=True)            # payload crudo para auditoría
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_message"
        ordering = ["timestamp", "id"]
```

> `wa_message_id unique` da idempotencia natural: si Meta reintenta el webhook,
> no duplicamos el mensaje.

### 4.2 `webhooks.py`

Dos responsabilidades, ambas en la misma URL:

- **GET**: validación inicial de Meta (suscripción del webhook). Devuelve el
  `hub.challenge` si `hub.verify_token == settings.WHATSAPP["VERIFY_TOKEN"]`.
- **POST**: recibe eventos. Responde **200 inmediato** y encola tarea Celery.

```python
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .tasks import procesar_evento_whatsapp


class WhatsAppWebhookView(APIView):
    permission_classes = [AllowAny]      # Meta no manda JWT; se valida por verify_token / firma

    def get(self, request):
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")
        if mode == "subscribe" and token == settings.WHATSAPP["VERIFY_TOKEN"]:
            return HttpResponse(challenge, content_type="text/plain")
        return HttpResponse("forbidden", status=403)

    def post(self, request):
        # Validar firma X-Hub-Signature-256 (HMAC SHA256 con app secret) -> recomendado
        payload = request.data
        procesar_evento_whatsapp.delay(payload)   # async, no bloquea el 200
        return JsonResponse({"status": "received"}, status=200)
```

> **Seguridad:** validar `X-Hub-Signature-256` (HMAC con el App Secret de Meta)
> antes de encolar, para rechazar POSTs no provenientes de Meta. Detalle de
> implementación en 5.3.

### 4.3 `servicios/parser.py`

Extrae del payload del webhook la información que importa. El `ctwa_clid` vive
en `entry[].changes[].value.messages[].referral.ctwa_clid` cuando el mensaje
proviene de un anuncio CTWA.

```python
def parse_inbound(payload: dict) -> list[dict]:
    """Devuelve lista de mensajes normalizados desde el payload del webhook."""
    resultados = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            contacts = {c["wa_id"]: c for c in value.get("contacts", [])}
            for msg in value.get("messages", []):
                wa_id = msg.get("from")
                contact = contacts.get(wa_id, {})
                referral = msg.get("referral", {})   # presente solo si vino de CTWA
                resultados.append({
                    "wa_phone": wa_id,
                    "contact_name": contact.get("profile", {}).get("name"),
                    "wa_message_id": msg.get("id"),
                    "timestamp": msg.get("timestamp"),
                    "tipo": msg.get("type"),
                    "body": _extract_body(msg),
                    "ctwa_clid": referral.get("ctwa_clid"),
                    "source_ad_id": referral.get("source_id"),
                    "phone_number_id": metadata.get("phone_number_id"),
                    "raw": msg,
                })
    return resultados
```

> También llegan eventos de **status** (sent/delivered/read/failed) en
> `value.statuses[]`. El parser debe distinguirlos para actualizar
> `Message.estado` en vez de crear un mensaje nuevo.

### 4.4 `servicios/lead.py` — `crear_cliente_desde_whatsapp()` con dedup

Reutiliza el factory único (`crear_y_enviar_evento` de 3.4), igual que hace el
flujo de landing pero adaptado. El servicio CRM no llama a `enviar_evento_meta`
directamente: el manejo de errores y persistencia queda centralizado.

**Dedup (confirmado: aplicamos dedup por teléfono):** si el mismo número ya
tiene un `Cliente` en la empresa, se reutiliza; no se crea uno nuevo. La
`Conversation` es única por `(empresa, wa_phone)` (constraint del modelo), así
que un segundo contacto del mismo número cae en la misma conversación.

```python
from django.utils import timezone
from apps.operativo.models import Cliente
from apps.operativo.servicios.eventos import crear_y_enviar_evento
from apps.crm.models import Conversation, Message


def crear_cliente_desde_whatsapp(*, empresa, msg: dict):
    wa_phone = _normalizar_e164(msg["wa_phone"])

    # 1) DEDUP por teléfono dentro de la empresa
    cliente = Cliente.objects.filter(empresa=empresa, wa_phone=wa_phone).first()
    creado = False
    if not cliente:
        cliente = Cliente.objects.create(
            empresa=empresa,
            nombre=msg.get("contact_name"),
            contacto=wa_phone,
            wa_phone=wa_phone,
            origen="whatsapp",
            ctwa_clid=msg.get("ctwa_clid"),        # se persiste para el Purchase futuro
            source_ad_id=msg.get("source_ad_id"),
        )
        creado = True
    else:
        # completar ctwa_clid si llegó ahora y no estaba
        if msg.get("ctwa_clid") and not cliente.ctwa_clid:
            cliente.ctwa_clid = msg["ctwa_clid"]
            cliente.save(update_fields=["ctwa_clid"])

    # 2) Conversación (única por empresa+phone)
    conv, _ = Conversation.objects.get_or_create(
        empresa=empresa, wa_phone=wa_phone,
        defaults={
            "cliente": cliente,
            "contact_name": msg.get("contact_name"),
            "ctwa_clid": msg.get("ctwa_clid"),
            "source_ad_id": msg.get("source_ad_id"),
        },
    )
    conv.last_inbound_at = timezone.now()
    conv.save(update_fields=["last_inbound_at", "actualizado_en"])

    # 3) Mensaje (idempotente por wa_message_id)
    Message.objects.get_or_create(
        wa_message_id=msg["wa_message_id"],
        defaults={
            "conversation": conv,
            "direction": Message.DIRECTION_IN,
            "body": msg.get("body", ""),
            "tipo": msg.get("tipo", "text"),
            "timestamp": _ts(msg["timestamp"]),
            "raw": msg.get("raw"),
        },
    )

    # 4) Evento Lead a CAPI — SOLO si es cliente nuevo (evita doble Lead)
    if creado:
        crear_y_enviar_evento(
            cliente=cliente,
            empresa=empresa,
            tipo="lead",
            fuente="whatsapp",
            landing=None,
            data_payload={
                "phone": wa_phone,
                "nombre": msg.get("contact_name"),
                "external_id": str(cliente.uuid),
                "ctwa_clid": msg.get("ctwa_clid"),
                "action_source": "business_messaging",
                "messaging_channel": "whatsapp",
            },
        )

        _safe_publish_empresa_event(empresa_id=empresa.id, event_type="lead_created", payload={...})

    return cliente, conv
```

### 4.5 `servicios/wa_client.py` — envío saliente (responder)

```python
import requests
from django.conf import settings

def enviar_mensaje_texto(*, to_phone: str, body: str) -> dict:
    cfg = settings.WHATSAPP
    url = f"https://graph.facebook.com/{cfg['API_VERSION']}/{cfg['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {cfg['ACCESS_TOKEN']}"}
    data = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": body},
    }
    resp = requests.post(url, headers=headers, json=data, timeout=10)
    return resp.json()
```

> **Ventana de 24h:** mensajes de texto libre solo dentro de las 24h desde el
> último inbound. Fuera de ventana, requiere plantilla aprobada. La bandeja debe
> mostrar si la conversación está dentro o fuera de ventana (usando
> `Conversation.last_inbound_at`).

### 4.6 `tasks.py`

```python
from celery import shared_task
from apps.empresas.models import Empresa
from .servicios.parser import parse_inbound, parse_statuses
from .servicios.lead import crear_cliente_desde_whatsapp

@shared_task
def procesar_evento_whatsapp(payload: dict):
    # 1) Resolver empresa por phone_number_id (multi-tenant, ver 5.2)
    # 2) Mensajes entrantes → crear_cliente_desde_whatsapp
    for msg in parse_inbound(payload):
        empresa = _resolver_empresa(msg["phone_number_id"])
        if empresa:
            crear_cliente_desde_whatsapp(empresa=empresa, msg=msg)
    # 3) Status updates → actualizar Message.estado
    for st in parse_statuses(payload):
        _actualizar_estado_mensaje(st)
```

---

## 5. Temas transversales a resolver

### 5.1 Multi-tenant del CRM
El CRM es multi-tenant (un número de WhatsApp por empresa, a futuro). Hoy hay
un solo número (LD.dev), pero el diseño no debe asumir uno solo.

**Resolución de empresa:** el webhook trae `metadata.phone_number_id`. Hay que
mapear `phone_number_id → Empresa`. Opciones:
- Campo nuevo `wa_phone_number_id` en `Empresa` (o en un modelo de config WA por
  empresa). **Recomendado:** un modelo `crm.WhatsAppConfig(empresa, phone_number_id, waba_id)`.

### 5.2 Dónde viven las credenciales de WhatsApp
- **Token de envío (Cloud API):** hoy en `settings.WHATSAPP` (env vars). Para
  multi-tenant real, mover a `crm.WhatsAppConfig` por empresa (token encriptado
  con el mismo `crypto.py` de pauta).
- **`waba_id` para CAPI:** se necesita en el payload del evento. Tomarlo de la
  config de la empresa, no de una env var global, cuando haya varios tenants.
- **Credenciales CAPI (pixel + token):** sin cambios, siguen en
  `pauta.CredencialesMeta`, resueltas por `enviador.py`.

### 5.3 Seguridad del webhook
- Validar `X-Hub-Signature-256` (HMAC-SHA256 del body con el App Secret).
- `VERIFY_TOKEN` propio para el GET challenge.
- Endpoint sin JWT (`AllowAny`) pero protegido por firma.

### 5.4 Migraciones con BD compartida
- **Un solo dueño de migraciones:** el repo monolítico. `python manage.py
  migrate` corre en el deploy de `app-web` (ya está en el Procfile). `crm-web`
  NO corre migraciones (quitar el `migrate` de su comando de arranque para
  evitar carreras). Solo un servicio migra.

### 5.5 Estrategia del evento `Lead`: inmediato vs calificado
**Decisión pendiente de confirmar.** Opciones:
- **Lead inmediato** al primer mensaje (más señal, incluye basura).
- **Lead al calificar** en bandeja (señal limpia, más tardía).
- **Ambas:** Lead temprano de bajo valor + Purchase de alto valor al cerrar.

El diseño actual dispara `Lead` al crear el cliente (inmediato). Cambiarlo a
"al calificar" es mover la llamada `enviar_evento_meta` del `crear_cliente...`
al cambio de estado en la bandeja.

### 5.6 Conversión / Purchase
Cuando el operador mueve la conversación a `convertido` (o se registra una
`Compra`), se dispara `enviar_evento_meta(tipo="purchase")` recuperando
`cliente.ctwa_clid`. Esto cierra el loop de atribución de la conversión tardía.
Reutiliza el modelo `operativo.Compra` existente.

---

## 6. Frontend (bandeja CRM)

- Nueva app/sección React para `crm.control-ar.com` (puede ser carpeta
  `frontend-crm/` o ruta dentro del front actual con build separado).
- Vistas mínimas:
  - **Lista de conversaciones** (filtro por estado, indicador ventana 24h).
  - **Detalle de conversación** (hilo de mensajes, responder).
  - **Cambio de estado** (nuevo → calificado → convertido), que dispara CAPI.
- Realtime: reutilizar el WebSocket existente (`consumers.py`/`realtime.py`)
  para empujar mensajes entrantes a la bandeja en vivo.

---

## 7. Orden de implementación (incremental, sin romper producción)

1. **Migraciones de modelos** (`Cliente` + `EventosMeta`): agregar campos
   nullable. Riesgo nulo. Deploy y verificar que landing sigue igual.
2. **Eliminar Kommo**: borrar webhooks, lógica y opción de conexión Kommo para
   que no quede como fuente paralela de eventos.
3. **Factory único `crear_y_enviar_evento`**: mover la creación/envío de
   `EventosMeta` a `servicios/eventos.py` y migrar los callers no-Kommo
   (`ClienteViewSet`, `EventosMetaViewSet`, tests y `CompraViewSet`).
   Verificar no-regresión del flujo de landing.
4. **Extensión `constructor.py` + `_merge_payload`** (action_source param +
   ctwa_clid). Probar con Test Events tool que el caso `website` no cambió.
5. **App `crm`**: models + migración + webhook (GET challenge primero, para
   suscribir en Meta) + parser.
6. **`crear_cliente_desde_whatsapp` + tasks Celery**: flujo entrante completo
   hasta crear Cliente + disparar Lead CAPI. Probar con número real.
7. **Envío saliente (`wa_client`) + bandeja API** (ConversationViewSet).
8. **Frontend bandeja** + realtime.
9. **Purchase / conversión** desde la bandeja, pasando por el mismo factory
   para recuperar `cliente.ctwa_clid` automáticamente.
10. **Multi-tenant WA config** (`WhatsAppConfig`) cuando haya un segundo número.

---

## 8. Variables de entorno nuevas

```
# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=1136432066226486
WA_WABA_ID=1223515323229426
WA_ACCESS_TOKEN=<token permanente system user>
WA_VERIFY_TOKEN=<string secreto propio para el GET challenge>
WA_APP_SECRET=<app secret para validar X-Hub-Signature-256>
WA_API_VERSION=v21.0

# Por servicio (Railway)
DJANGO_URLCONF=configs.urls        # en app-web
DJANGO_URLCONF=configs.urls_crm    # en crm-web
```

---

## 9. Decisiones cerradas vs pendientes

**Cerradas:**
- Monorepo + múltiples servicios Railway (no repos separados).
- CRM como app Django nueva (`apps/crm`), no proyecto aparte.
- CAPI in-process (no microservicio HTTP).
- BD y tenant compartidos.
- Número en Cloud API pura (sin Coexistence) → bandeja propia para responder.
- Dedup por teléfono en WhatsApp.
- CAPI multi-fuente vía refactor incremental retrocompatible.
- Kommo se borra como lógica y como opción de conexión.
- Un único factory crea y envía `EventosMeta`; los callers no crean eventos
  Meta directamente.

**Pendientes de confirmar:**
- Estrategia del evento Lead: inmediato / al calificar / ambas (sección 5.5).
- Verificación final contra doc Meta: ubicación exacta de `ctwa_clid` y
  `whatsapp_business_account_id` vs `page_id` (probar en Test Events tool).
- Estructura del frontend del CRM (carpeta nueva vs ruta en front actual).
```
