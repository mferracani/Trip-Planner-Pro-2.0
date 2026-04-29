# Backend Spec — Fase 1: Firebase Setup

## Colecciones Firestore involucradas

### users/{userId}
| Campo | Tipo | Notas |
|-------|------|-------|
| display_name | string | Nombre del usuario |
| email | string | Email de Apple/Google |
| avatar_url | string \| null | URL del avatar |
| created_at | Timestamp | UTC, servidor |

### users/{userId}/trips/{tripId}
| Campo | Tipo | Notas |
|-------|------|-------|
| name | string | Nombre del viaje |
| start_date | string | "YYYY-MM-DD" |
| end_date | string | "YYYY-MM-DD" |
| status | "draft"\|"planned"\|"active"\|"past"\|null | Estado del viaje |
| cover_url | string \| null | URL de cover (Unsplash o Storage) |
| cover_image_credit | string \| null | Atribución requerida por Unsplash |
| fx_eur_usd_fixed_rate | number \| null | Rate fijado al crear el viaje |
| total_usd | number \| null | Suma calculada client-side |
| cities_count | number \| null | Denormalizado para listado |
| created_at | Timestamp | UTC, servidor |
| updated_at | Timestamp \| null | UTC, servidor |

### users/{userId}/trips/{tripId}/cities/{cityId}
| Campo | Tipo | Notas |
|-------|------|-------|
| trip_id | string \| null | Back-reference |
| name | string | Nombre de la ciudad |
| country | string \| null | Nombre del país |
| country_code | string \| null | ISO 3166-1 alpha-2 |
| color | string \| null | Hex "#4D96FF" para el calendario |
| days | string[] | Fechas "YYYY-MM-DD" que ocupa esta ciudad |
| lat | number \| null | Latitud WGS84 |
| lng | number \| null | Longitud WGS84 |
| timezone | string \| null | IANA, e.g. "Europe/Madrid" |

### users/{userId}/trips/{tripId}/flights/{flightId}
| Campo | Tipo | Notas |
|-------|------|-------|
| airline | string \| null | Nombre de aerolínea |
| flight_number | string \| null | "IB6844" |
| origin_iata | string \| null | 3 letras uppercase |
| destination_iata | string \| null | 3 letras uppercase |
| departure_local_time | string \| null | "2026-03-15T21:35" sin TZ |
| departure_timezone | string \| null | IANA, para DST-safe display |
| departure_utc | Timestamp \| null | UTC, para sorting y duración |
| arrival_local_time | string \| null | "2026-03-16T14:20" sin TZ |
| arrival_timezone | string \| null | IANA |
| arrival_utc | Timestamp \| null | UTC |
| duration_minutes | number \| null | Calculado server-side con Luxon |
| cabin_class | "economy"\|"premium_economy"\|"business"\|"first"\|null | |
| seat | string \| null | e.g. "23A" |
| booking_ref | string \| null | PNR |
| price | number \| null | Precio en moneda original |
| currency | string \| null | ISO 4217 |
| price_usd | number \| null | Convertido con fx_rates |
| paid_amount | number \| null | Monto efectivamente pagado |
| notes | string \| null | Notas libres |
| parse_job_id | string \| null | Referencia al job que lo creó |

### users/{userId}/trips/{tripId}/hotels/{hotelId}
| Campo | Tipo | Notas |
|-------|------|-------|
| name | string \| null | Nombre del hotel |
| brand | string \| null | Cadena hotelera |
| chain | string \| null | Grupo corporativo |
| address | string \| null | Dirección completa |
| city_id | string \| null | Referencia a cities/{cityId} |
| check_in | string \| null | "YYYY-MM-DD" |
| check_out | string \| null | "YYYY-MM-DD" |
| room_type | string \| null | |
| booking_ref | string \| null | |
| price_per_night | number \| null | |
| total_price | number \| null | |
| currency | string \| null | ISO 4217 |
| total_price_usd | number \| null | |
| paid_amount | number \| null | |
| notes | string \| null | |
| parse_job_id | string \| null | |

### users/{userId}/trips/{tripId}/transports/{transportId}
| Campo | Tipo | Notas |
|-------|------|-------|
| type | "bus"\|"train"\|"ferry"\|"car"\|"taxi"\|"subway"\|"other"\|null | Modo de transporte |
| operator | string \| null | Empresa operadora |
| origin | string \| null | Lugar de partida (texto libre) |
| destination | string \| null | Lugar de llegada |
| departure_local_time | string \| null | "2026-03-20T09:30" |
| departure_timezone | string \| null | IANA |
| departure_utc | Timestamp \| null | UTC |
| arrival_local_time | string \| null | |
| arrival_timezone | string \| null | |
| arrival_utc | Timestamp \| null | |
| duration_minutes | number \| null | Calculado server-side |
| booking_ref | string \| null | |
| price | number \| null | |
| currency | string \| null | ISO 4217 |
| price_usd | number \| null | |
| paid_amount | number \| null | |
| notes | string \| null | |
| parse_job_id | string \| null | |

### users/{userId}/trips/{tripId}/expenses/{expenseId}
| Campo | Tipo | Notas |
|-------|------|-------|
| title | string | Descripción del gasto |
| amount | number | Monto en moneda original |
| currency | string | ISO 4217 |
| amount_usd | number \| null | Convertido |
| paid_amount | number \| null | |
| date | string | "YYYY-MM-DD" |
| category | string | "flight"\|"hotel"\|"transport"\|"food"\|"activity"\|"shopping"\|"other" |
| notes | string \| null | |
| linked_item_id | string \| null | Referencia a flight/hotel/transport |
| linked_item_type | string \| null | "flight"\|"hotel"\|"transport" |
| created_at | Timestamp | UTC |

### users/{userId}/trips/{tripId}/parse_jobs/{jobId}
| Campo | Tipo | Notas |
|-------|------|-------|
| provider | "claude"\|"gemini" | Proveedor IA utilizado |
| input_type | "text"\|"attachment" | Modo de entrada |
| input_text | string \| null | Texto ingresado (modo text) |
| attachment_storage_ref | string \| null | Path en Storage (modo attachment) |
| status | "pending"\|"processing"\|"completed"\|"error" | Estado del job |
| error_message | string \| null | Mensaje de error si status="error" |
| raw_response | string \| null | JSON string crudo del modelo |
| parsed_items | ParsedItem[] \| null | Items extraídos y enriquecidos |
| confidence_score | number \| null | Promedio de confidence 0–1 |
| tokens_used | number \| null | Total tokens input+output |
| latency_ms | number \| null | Latencia total de la llamada IA |
| created_at | Timestamp | UTC |

### airports/{iataCode} (global, read-only)
| Campo | Tipo | Notas |
|-------|------|-------|
| name | string | Nombre del aeropuerto |
| city | string | Ciudad |
| country | string | País |
| timezone | string | IANA tz |
| lat | number | WGS84 |
| lng | number | WGS84 |
| icao_code | string \| null | Código ICAO 4 letras |

### fx_rates/{YYYY-MM-DD} (global, read-only)
| Campo | Tipo | Notas |
|-------|------|-------|
| rates | Record<string, number> | Mapa ISO4217 → rate (base USD) |
| source | string | "exchangerate-api.com" |
| updated_at | Timestamp | UTC |

---

## Cloud Functions

### parseWithAI
**Trigger:** HTTP POST `https://{region}-{project}.cloudfunctions.net/parseWithAI`
**Auth:** Requerida — Firebase ID token en `Authorization: Bearer <token>`
**Secrets:** `CLAUDE_API_KEY`, `GEMINI_API_KEY`
**Timeout:** 120s | **Memory:** 512MiB | **Region:** us-east1

**Input (JSON body):**
```typescript
{
  input: string;          // texto del booking o instrucción libre (max 50,000 chars)
  inputType: "text" | "attachment";
  attachmentRef: string | null;  // Storage path: "users/{uid}/parse_attachments/{file}"
  provider: "claude" | "gemini";
  tripId: string;         // Firestore document ID del trip
}
```

**Output:**
```typescript
{
  jobId: string;
  items: ParsedItem[];    // array de vuelos, hoteles y/o transportes extraídos
}
```

**Efectos en Firestore:**
- Crea `users/{uid}/trips/{tripId}/parse_jobs/{jobId}` con `status: "processing"` al inicio
- Actualiza el mismo documento con `status: "completed"`, `parsed_items`, `confidence_score`, `tokens_used`, `latency_ms` al terminar
- En caso de error, actualiza `status: "error"` y `error_message`

**Flujo interno:**
1. Verifica Firebase ID token → extrae `userId`
2. Valida body (input, inputType, tripId requeridos; attachmentRef debe empezar con `users/{userId}/`)
3. Verifica que `trips/{tripId}` pertenece al usuario (Firestore read)
4. Construye `TripContext` con nombre del viaje, fechas y ciudades
5. Crea `parse_job` con `status: "processing"`
6. Llama a Claude (texto) o Gemini (texto + inline base64 desde Storage)
7. Parsea y valida el JSON de respuesta contra el schema de `ParsedItem`
8. Enriquece vuelos y transportes: calcula `departure_utc`, `arrival_utc` (Luxon → Timestamp), `duration_minutes`
9. Actualiza `parse_job` con resultados
10. Devuelve `{ jobId, items }`

**Modelo IA:** Claude Sonnet (`claude-sonnet-4-6`) para texto; Gemini 2.5 Flash (`gemini-2.5-flash`) para adjuntos

---

### updateFxRates
**Trigger:** Cloud Scheduler — cron `0 0 * * *` (diario 00:00 UTC)
**Auth:** N/A (invocación interna)
**Secrets:** `FX_RATES_API_KEY`
**Memory:** 256MiB | **Region:** us-east1

**Flujo:**
1. Construye URL `https://v6.exchangerate-api.com/v6/{apiKey}/latest/USD`
2. Hace GET con timeout 10s
3. Verifica `result === "success"`
4. Escribe `fx_rates/{YYYY-MM-DD}` con `{ rates: conversion_rates, source, updated_at }`
5. Loguea resultado; en caso de error, re-lanza para que Cloud Scheduler marque la ejecución como fallida

**Efectos en Firestore:**
- Upsert de `fx_rates/{hoy}` — `set()` sin merge (sobrescribe si ya existe)

---

### cleanParseAttachments
**Trigger:** Cloud Scheduler — cron `0 2 * * *` (diario 02:00 UTC)
**Auth:** N/A (invocación interna)
**Memory:** 256MiB | **Region:** us-east1

**Flujo:**
1. Lista todos los archivos en Storage con prefix `users/` que contengan `/parse_attachments/`
2. Para cada archivo: obtiene metadata, compara `updated` con cutoff de 30 días atrás
3. Elimina los que superan el cutoff; loguea warnings por errores individuales (no interrumpe el loop)
4. Al final loguea `{ deletedCount, errorCount }`

**Nota:** No actualiza `parse_jobs` en Firestore — el Storage ref queda en el documento como referencia histórica; el cliente debe manejar el caso 404 al intentar descargar.

---

## Security Rules

### Firestore (`firebase/firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Global read-only collections
    match /airports/{iataCode} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /fx_rates/{date} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Household pattern: permite compartir datos entre UIDs del hogar
    match /households/main {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && request.auth.uid in resource.data.memberUids;
      allow delete: if false;
    }

    function isHouseholdMember() {
      let doc = get(/databases/$(database)/documents/households/main);
      return request.auth != null
          && doc != null
          && request.auth.uid in doc.data.memberUids;
    }

    // User profile top-level
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && (request.auth.uid == userId || isHouseholdMember());
    }

    // Toda la data del usuario (trips + subcolecciones)
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && (request.auth.uid == userId || isHouseholdMember());
    }

    // collectionGroup para consultas cross-trip de ciudades
    match /{path=**}/cities/{cityId} {
      allow read: if request.auth != null && isHouseholdMember();
      allow write: if false;
    }

    // Deny-all explícito
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Storage (`firebase/storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/parse_attachments/{filename} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size <= 10 * 1024 * 1024   // 10 MB
        && (request.resource.contentType.matches('application/pdf')
            || request.resource.contentType.matches('image/.*'));
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

    match /covers/{userId}/{tripId}/{filename} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size <= 5 * 1024 * 1024    // 5 MB
        && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Env vars / Secrets

| Secret | Scope | Descripción |
|--------|-------|-------------|
| `CLAUDE_API_KEY` | Secret Manager | Anthropic API key para `parseWithAI` (Claude) |
| `GEMINI_API_KEY` | Secret Manager | Google AI API key para `parseWithAI` (Gemini) |
| `FX_RATES_API_KEY` | Secret Manager | exchangerate-api.com API key para `updateFxRates` |

**Setup en Firebase Secret Manager:**
```bash
firebase functions:secrets:set CLAUDE_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set FX_RATES_API_KEY
```

**Nota:** Ningún secret se expone al cliente. Las Cloud Functions los leen server-side vía `defineSecret()` de `firebase-functions/params`.

---

## Índices Firestore (`firebase/firestore.indexes.json`)

| Colección | Campos indexados | Scope | Uso |
|-----------|-----------------|-------|-----|
| trips | status ASC, start_date ASC | COLLECTION | Filtrar por estado y ordenar |
| trips | start_date ASC | COLLECTION | Ordenar dashboard |
| flights | departure_utc ASC | COLLECTION | Ordenar cronológicamente |
| flights | parse_job_id ASC, departure_utc ASC | COLLECTION | Filtrar por job |
| hotels | check_in ASC | COLLECTION | Ordenar cronológicamente |
| hotels | parse_job_id ASC, check_in ASC | COLLECTION | Filtrar por job |
| transports | departure_utc ASC | COLLECTION | Ordenar cronológicamente |
| transports | parse_job_id ASC, departure_utc ASC | COLLECTION | Filtrar por job |
| parse_jobs | created_at DESC | COLLECTION | Historial reciente |
| parse_jobs | status ASC, created_at DESC | COLLECTION | Filtrar por estado |
| expenses | date ASC | COLLECTION | Ordenar por fecha |
| cities | trip_id ASC, name ASC | COLLECTION_GROUP | Búsqueda cross-trip |

---

## Deploy checklist

```bash
# 1. Desde firebase/ directory
cd firebase

# 2. Configurar secrets (una sola vez)
firebase functions:secrets:set CLAUDE_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set FX_RATES_API_KEY

# 3. Build TypeScript
cd functions && npm run build && cd ..

# 4. Deploy todo
firebase deploy

# 5. Seed aeropuertos (una sola vez)
cd seed
npx ts-node upload-airports.ts

# 6. Emulators para desarrollo local
firebase emulators:start
```

**Emulators:**
| Servicio | Puerto |
|----------|--------|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| Emulator UI | 4000 |
