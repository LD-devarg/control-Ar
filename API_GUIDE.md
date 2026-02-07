# Guia rapida de APIs (Frontend)

## Base URL
- Dev: `http://127.0.0.1:8000/`

## Autenticacion
- Los endpoints privados requieren un usuario autenticado.
- Usa header: `Authorization: Bearer <token>` (segun el sistema de auth que uses).

## Endpoints publicos

### Obtener numero de WhatsApp rotativo
`GET /landings/whatsapp-rotacion/?landing_token=<TOKEN>`

Respuesta:
```json
{ "numero": "+54911XXXXXXX" }
```

### Obtener configuracion publica de landing
`GET /landings/public/?landing_token=<TOKEN>`

Respuesta:
```json
{
  "id": 1,
  "empresa": 1,
  "nombre": "Landing X",
  "token": "<TOKEN>",
  "url": "https://tu-landing.com",
  "bono": "100%",
  "titulo": "BONO DE BIENVENIDA",
  "subtitulo": "REGISTRATE AHORA Y DUPLICAMOS TU DEPOSITO",
  "texto_boton": "JUGA AHORA",
  "texto_info": "Atencion personalizada las 24hs.",
  "background_vertical": "https://.../mobile.png",
  "background_horizontal": "https://.../desktop.png",
  "activo": true,
  "creado_en": "2026-02-06T00:00:00Z"
}
```

### Crear lead (cliente) desde landing (crea evento lead automaticamente)
`POST /clientes/`

Body:
```json
{
  "landing_token": "<TOKEN>",
  "nombre": "Juan Perez",
  "contacto": "5491122334455",
  "username": "juanp",
  "idempotency_key": "<UUID opcional>"
}
```

### Crear evento Meta (contact/purchase)
`POST /eventos-meta/`

Body:
```json
{
  "cliente_id": 1,
  "empresa_id": 1,
  "tipo": "contact",
  "email": "test@example.com",
  "phone": "1122334455",
  "fbp": "<fbp>",
  "fbc": "<fbc>"
}
```

Para purchase (con value):
```json
{
  "cliente_id": 1,
  "empresa_id": 1,
  "tipo": "purchase",
  "value": 150000,
  "currency": "ARS"
}
```

## Endpoints privados (requieren auth)

### Empresas
- `GET /empresas/`
- `POST /empresas/`
- `PATCH /empresas/:id/`
- `DELETE /empresas/:id/`

### Usuarios
- `GET /usuarios/`
- `POST /usuarios/`
- `PATCH /usuarios/:id/`
- `DELETE /usuarios/:id/`

### Clientes
- `GET /clientes/?empresa__id=<id>`

### Landings
- `GET /landings/`
- `POST /landings/`
- `PATCH /landings/:id/`
- `DELETE /landings/:id/`

### Eventos Meta (lectura)
- `GET /eventos-meta/`

### Compras
- `GET /compras/`
- `POST /compras/`

Body:
```json
{
  "cliente": 1,
  "monto_ars": 150000,
  "comprobante": "ABC123"
}
```

> La compra no crea evento automatico. El evento purchase se env?a desde `/eventos-meta/`.

### Recursos
- `GET /whatsapps/`
- `POST /whatsapps/`
- `GET /tipos-cambio/`

### Pauta
- `GET /bms/`
- `GET /cuentas-publicitarias/`
- `GET /campa?as/`
- `GET /conjuntos-anuncios/`
- `GET /anuncios/`
- `GET /gastos-diarios/`
- `GET /credenciales-meta/`
- `GET /fanpages/`
- `GET /instagram-accounts/`
- `GET /pauta-assets/`
- `GET /creatives/`

#### Orden recomendado de creaci?n (Pauta)
1. `POST /bms/`
2. `POST /cuentas-publicitarias/` (depende de BM)
3. `POST /campa?as/` (depende de cuenta publicitaria)
4. `POST /conjuntos-anuncios/` (depende de campa?a)
5. `POST /fanpages/` (depende de BM) *si usas creatives*
6. `POST /pauta-assets/`
7. `POST /creatives/` (depende de fanpage y asset; instagram opcional)
8. `POST /anuncios/` (depende de conjunto y creative)

## Endpoints de test
### Enviar evento de prueba (solo Admin/Pauta/Superuser)
`POST /eventos-meta/test-event/`

Body:
```json
{
  "cliente_id": 1,
  "tipo": "lead",
  "email": "test@example.com",
  "phone": "1122334455",
  "test_event_code": "<opcional>"
}
```

## Notas
- Los endpoints usan JSON.
- Ajusta CORS y AUTH segun el entorno.

## Filtros

### Eventos Meta
- `tipo`: lead | contact | purchase
- `period`: day | week | month (rolling)
- `from`: YYYY-MM-DD
- `to`: YYYY-MM-DD

Ejemplo:
`GET /eventos-meta/?tipo=lead&period=week`
`GET /eventos-meta/?from=2026-01-01&to=2026-01-31`

### Compras
- `period`: day | week | month (rolling)
- `from`: YYYY-MM-DD
- `to`: YYYY-MM-DD

Ejemplo:
`GET /compras/?period=month`

> Operadores: ven todos los leads (sin operador) y solo sus contact/purchase.
