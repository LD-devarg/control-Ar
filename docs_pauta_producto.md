# ControlAR Pauta para Meta Ads

## Qué es
ControlAR Pauta es un módulo pensado para equipos que gestionan campañas en Meta Ads y necesitan operar, medir y optimizar desde un solo lugar, con foco en rendimiento real del negocio.

No es solo un panel de lectura: permite estructurar activos de pauta, sincronizar resultados y estados desde Meta, y traducir esos datos en KPIs accionables por empresa (tenant).

## Qué funcionalidades ofrece hoy

### 1) Base de datos de pauta (estructura operativa)
Permite gestionar entidades de Meta Ads dentro de la plataforma:
- BM
- Cuentas publicitarias
- FanPage
- Instagram Account
- Campaigns
- Adsets
- Creatives
- Ads
- Assets

Con esto el equipo puede mantener ordenada la arquitectura de pauta y auditar qué está creado por empresa.

### 2) Creación guiada de campañas/adsets/ads
El flujo de creación fue diseñado para reducir errores operativos:
- Campos sensibles con selección guiada (autocomplete/select).
- Objetivos de campaña normalizados (ej: Ventas, Interacción, Leads).
- En Adset se cargan campos clave de performance:
  - Ubicación de la conversión
  - Objetivo de rendimiento
  - Conjunto de datos (pixel)
  - Evento de conversión
  - Presupuesto diario
  - Fecha de inicio
  - Público (país, edad, sexo)

Esto evita depender de JSON manual y mejora consistencia.

### 3) Envío/creación en Meta con estado controlado
Cuando se crean Campaigns/Adsets/Ads desde la plataforma:
- Se intentan crear en Meta automáticamente.
- Quedan en modo borrador/pausado para control operativo.
- La publicación final se mantiene como decisión manual en Meta.

También se soportan escenarios de creación parcial:
- Campaña + adsets + ads en un solo flujo.
- Adsets + ads sobre campaña existente.
- Ads sobre adset existente.

### 4) Rendimientos (Pauta KPI) con datos reales
El módulo de rendimientos consolida métricas reales por período y por nivel:
- Vista ejecutiva (KPIs principales)
- Vista operativa (tabla por campaña/adset/ad)
- Filtros por período y cuenta
- ROAS semanal

Métricas disponibles:
- Inversión
- Ingresos
- ROAS
- CPA
- CPC
- CPL
- Frecuencia
- CTR
- Compras
- Valor de compras
- Leads
- Contactos
- Web visitors
- Efectividad

### 5) Performance Score con objetivos configurables
Se incluye scoring de performance por empresa:
- Score 0-100
- Basado en objetivos KPI editables
- Ponderación por importancia estratégica

Esto permite pasar de “mirar números” a “medir cumplimiento de objetivos”.

### 6) Sincronización automática desde Meta
Hay tareas periódicas para mantener actualizados:
- KPI de pauta (rendimiento)
- Estado de cuentas/campañas/adsets/ads

Incluye:
- Upsert diario por fecha/ad (update mismo día, insert nuevo día)
- Estado de última sincronización por empresa
- Registro de errores de sync

### 7) Control operativo por empresa (multi-tenant)
El producto está pensado para agencias o equipos multiempresa:
- Toda la pauta se gestiona por tenant (empresa).
- Se puede activar/desactivar workers por empresa.
- Se puede pausar/reanudar beat por empresa.
- Se puede habilitar/deshabilitar tasks por empresa (pauta).

Esto reduce consumo innecesario y da control fino de operación.

### 8) Health y observabilidad
Se expone información operativa para diagnóstico:
- Estado de sync
- Últimas ejecuciones
- Errores
- Señales de heartbeat

Ideal para soporte y control de calidad de datos.

## Valor para quien compra pauta en Meta

### Beneficios directos
- Menos errores en setup de campañas y adsets.
- Menos dependencia de operaciones manuales repetitivas.
- Visión ejecutiva y operativa en la misma herramienta.
- Datos de negocio + datos de pauta en un solo análisis.
- Control por empresa para agencias y estructuras multi-cuenta.

### Beneficios de gestión
- Mejor trazabilidad.
- Menor tiempo de onboarding de nuevos operadores.
- Estandarización del proceso de creación y medición.

## Para quién está pensado
- Agencias que manejan múltiples clientes en Meta Ads.
- Equipos in-house que quieren disciplina operativa y reporting real.
- Operadores de pauta que necesitan más control que el Ads Manager para gestión interna.

## Qué necesita el cliente para operar
- Cuenta publicitaria de Meta.
- Credenciales/tokens configurados en la plataforma.
- Pixel/conjunto de datos disponible para campañas de conversión.
- Definición de objetivos KPI por empresa para score realista.

## Estado actual del producto de pauta
Actualmente el módulo cubre:
- Estructura de datos de pauta
- Creación guiada
- Sincronización de estados y rendimiento
- Dashboard KPI con score y objetivos
- Controles operativos por tenant

Esto ya permite venderlo como una solución de gestión y rendimiento de pauta orientada a operación profesional.
