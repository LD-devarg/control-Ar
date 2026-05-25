# ControlAR

Plataforma de operación comercial y pauta digital enfocada en **PYMES Argentinas**.  
ControlAR centraliza procesos, datos y ejecución para que equipos comerciales y de marketing puedan escalar con orden, velocidad y trazabilidad.

## Visión

Construir la infraestructura digital que permita a las PYMES de Argentina competir con procesos profesionales, decisiones basadas en datos y automatización operativa real.

## Qué resuelve

- Gestión multiempresa (multi-tenant) para operar múltiples marcas o unidades.
- Estandarización de operación comercial y de pauta en Meta Ads.
- Integración de datos de negocio con métricas de adquisición.
- Reducción de tareas manuales mediante flujos guiados y automatizaciones.

## Módulos principales

- **Backend API (Django + DRF):** autenticación JWT, endpoints operativos y de negocio.
- **Frontend (React + Vite):** interfaz para gestión, análisis y operación diaria.
- **Pauta Meta Ads:** estructura de campañas, sincronización y métricas de rendimiento.
- **Procesamiento asíncrono:** Celery + Redis para tareas programadas y sincronizaciones.

## Arquitectura del repositorio

```text
control-Ar/
├── backend/      # API, modelos, lógica de negocio y tareas async
├── frontend/     # Aplicación web React
├── API_GUIDE.md  # Referencia rápida de endpoints
└── docs_*.md     # Material de producto y pauta comercial
```

## Requisitos

- Node.js 22+
- Python 3.12+
- PostgreSQL
- Redis (para workers/tareas asíncronas)

## Configuración local

### 1) Backend

```bash
cd /tmp/workspace/LD-devarg/control-Ar/backend
cp env.example .env
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

### 2) Frontend

```bash
cd /tmp/workspace/LD-devarg/control-Ar/frontend
cp env.example .env
npm ci
npm run dev
```

> Ajustá `VITE_API_URL` para apuntar a la URL del backend.

## Comandos útiles

### Frontend

```bash
cd /tmp/workspace/LD-devarg/control-Ar/frontend
npm run dev
npm run build
npm run lint
```

### Backend

```bash
cd /tmp/workspace/LD-devarg/control-Ar/backend
python3 manage.py runserver
python3 -m pytest -q
```

## Operación asíncrona (producción/release)

En `backend/Procfile` están definidos los procesos:

- `web`: API ASGI (Gunicorn + UvicornWorker)
- `worker`: Celery worker
- `beat`: Celery beat scheduler

## API y documentación funcional

- Guía de endpoints: `/tmp/workspace/LD-devarg/control-Ar/API_GUIDE.md`
- Documento funcional de producto: `/tmp/workspace/LD-devarg/control-Ar/docs_pauta_producto.md`
- Documento comercial: `/tmp/workspace/LD-devarg/control-Ar/docs_pauta_comercial.md`

## Enfoque de negocio

ControlAR está diseñado para equipos que quieren pasar de una operación reactiva a una operación profesional, medible y escalable: menos fricción operativa, mejor calidad de decisión y mayor capacidad de crecimiento para PYMES Argentinas.
