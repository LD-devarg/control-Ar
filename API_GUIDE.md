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

### Crear lead (cliente) desde landing
`POST /clientes/`

Body:
```json
{
  "landing_token": "<TOKEN>",
  "nombre": "Juan Perez",
  "contacto": "5491122334455",
  "username": "juanp"
}
```

### Crear evento Meta (lead/contact/purchase)
`POST /eventos-meta/`

Body:
```json
{
  "cliente_id": 1,
  "landing_token": "<TOKEN>",
  "tipo": "lead",
  "email": "test@example.com",
  "phone": "1122334455",
  "fbp": "<fbp>",
  "fbc": "<fbc>"
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

> En la primera compra del cliente se crea automaticamente un evento `purchase`.

### Recursos
- `GET /whatsapps/`
- `POST /whatsapps/`
- `GET /tipos-cambio/`

### Pauta
- `GET /bms/`
- `GET /cuentas-publicitarias/`
- `GET /campañas/`
- `GET /conjuntos-anuncios/`
- `GET /anuncios/`
- `GET /gastos-diarios/`
- `GET /credenciales-meta/`
- `GET /fanpages/`
- `GET /instagram-accounts/`
- `GET /pauta-assets/`
- `GET /creatives/`

#### Orden recomendado de creaciÃ³n (Pauta)
1. `POST /bms/`
2. `POST /cuentas-publicitarias/` (depende de BM)
3. `POST /campañas/` (depende de cuenta publicitaria)
4. `POST /conjuntos-anuncios/` (depende de campaÃ±a)
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
  "phone": "1122334455"
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
