# Bolsa Pulse

Proyecto base para monitorear bolsa de valores en **móvil** y **smartwatch**, con separación explícita entre:

- Mercado global
- Mercado de México (BMV/BIVA)

## Arquitectura

- `apps/api`: API REST en Fastify con endpoints separados para `global` y `mx`.
- `apps/mobile`: App móvil en Expo + React Native con suscripción push por mercado.
- `apps/watch`: App smartwatch en Expo + React Native (modo compacto + suscripción push).

## Estructura

```text
bolsa-pulse/
  apps/
    api/
    mobile/
    watch/
```

## Endpoints

### Mercado

- `GET /health`
- `GET /v1/markets/global`
- `GET /v1/markets/mx`
- `GET /v1/markets/summary`
- `GET /v1/alerts/market/:market?threshold=1&limit=5`

### Push remota

- `POST /v1/push/register`
- `POST /v1/push/unregister`
- `GET /v1/push/subscriptions`
- `POST /v1/push/dispatch/:market?threshold=1&limit=5&force=true`

## Variables de entorno

### API (`apps/api`)

- `PORT=4000`
- `FINNHUB_API_KEY=tu_api_key`
- `MARKET_CACHE_TTL_MS=55000`
- `EXPO_PUSH_ENABLED=true`
- `PUSH_AUTO_DISPATCH_ENABLED=true`
- `PUSH_DISPATCH_INTERVAL_MS=60000`
- `PUSH_ALERT_THRESHOLD=1`
- `PUSH_ALERT_LIMIT=5`

Si no configuras `FINNHUB_API_KEY`, la API usa datos mock automáticamente.

### Apps Expo (`apps/mobile` y `apps/watch`)

- `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000`
- `EXPO_PUBLIC_ALERT_THRESHOLD=1`
- `EXPO_PUBLIC_ENABLE_REMOTE_PUSH=true`

## Ejecutar local

### 1) Instalar dependencias del monorepo

```bash
npm install
```

### 2) Levantar API

```bash
npm run dev -w apps/api
```

### 3) Levantar app móvil

```bash
npm run dev -w apps/mobile
```

### 4) Levantar app smartwatch

```bash
npm run dev -w apps/watch
```

## Nota sobre alertas push

- Las apps registran su token Expo en el backend y quedan suscritas a `mx` y `global`.
- El backend corre auto-dispatch cada minuto y envía push por mercado en cada ciclo de actualización de precios a los dispositivos suscritos.

## Próximos pasos recomendados

- Persistir suscripciones push y watchlists por usuario (PostgreSQL).
- Encolar alertas del backend con un worker dedicado y reintentos.
- Agregar autenticación y preferencias de alertas por instrumento.

