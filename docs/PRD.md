# 📋 PRD — Trip Planner Pro 2

> Especificación completa de producto. Fuente: Notion — última actualización 2026-04-19.

---

## 1. Resumen ejecutivo

Trip Planner Pro 2 es una app nativa iOS + web PWA para planificar viajes multi-ciudad con un calendario visual tipo Airbnb-meets-Apple-Health. Reemplaza la carga manual de vuelos, hoteles y transportes por un **sistema de parse con IA** que acepta tres modos de entrada: texto libre, PDF/imagen, y formulario manual mejorado. Es uso personal, distribución vía TestFlight, sin monetización.

**Propuesta de valor en una frase**: *"Organizá tus viajes pegando el email del booking. La IA arma el resto."*

---

## 2. Problema que resuelve

Mati (único usuario) ya tiene TripLog funcionando con un calendario visual excelente, pero la **carga de datos es el cuello de botella**: para un viaje a Europa con 4 ciudades, 3 vuelos y 5 hoteles, cargar todo a mano toma ~45 minutos de tipear IATAs, fechas, horas, direcciones, precios y monedas.

**Pain points concretos de TripLog v1**:
1. Tipear a mano IATAs, aerolíneas, direcciones de hotel, horarios.
2. Repetir la misma ciudad en varias secciones.
3. Forms con demasiados campos y clicks.
4. No hay autocompletado de aeropuertos, aerolíneas, cadenas de hoteles.

**Cómo lo resuelve la v2**:
- Pegás el email de Iberia → Claude extrae IB6844, EZE→MAD, fecha/hora, precio → autocompleta el vuelo.
- Subís el PDF del voucher de Booking.com → Gemini extrae hotel, dirección, check-in/out, precio → autocompleta.
- Escribís libre *"21/03 me quedo en el Marriott Barcelona Sants"* → Claude estructura.
- Form manual fluido queda para editar lo que la IA no capturó bien.

---

## 3. Usuario objetivo

**Perfil único**: Mati — product designer que viaja 3-6 veces al año, mix ocio + gestión de 3 Airbnbs en Palermo. Usa MacBook Pro M4 y iPhone. Knowledge técnica alta.

**No-objetivos**:
- Equipos o multi-usuario.
- Compartir viajes públicamente.
- Marketplace de reservas.
- Integración con agencias de viaje.

---

## 4. Módulos y funcionalidades

### 4.1 Módulo A — Viajes

- Lista de viajes (home/dashboard)
- Crear viaje: nombre, fecha inicio, fecha fin, cover image opcional
- Detalle de viaje con 3 tabs: Calendar / List / Map
- Archivar / eliminar / duplicar viaje

**Estados**: Planeado / En curso / Pasado

**Delight moments en MVP**:

#### Saludo contextual dinámico
- Sin viajes activos: `"Hola, Mati"`
- Viaje futuro a <7 días: `"Tu próximo viaje empieza pronto"`
- Día de salida: `"Buen viaje, Mati ✈️"`
- Durante viaje: `"Día 3 en Madrid ☀️ 18°"` (temperatura via OpenWeather)
- Último día en ciudad: `"Último día en Barcelona"`
- Día de regreso: `"Bienvenido a casa, Mati"`
- Post-viaje: `"Buen reencuentro con Buenos Aires"`

#### Countdown vivo al próximo viaje
- >30 días: `"Faltan 45 días"`
- 7-30 días: `"Faltan 23 días"` con indicador visual marcado
- 2-7 días: `"Esta semana · faltan 4 días"` en verde
- 1 día: `"Mañana empieza"` con card pulsante (2s loop)
- Horas: `"Faltan 4h 23min"` actualizado cada minuto

#### Cover images automáticas con Unsplash
Al crear un viaje, la app sugiere 3 covers curadas. Query: `{city_name} + architecture`. Atribución requerida.

### 4.2 Módulo B — Calendario visual (★ pantalla estrella)

- Grid **vertical de semanas apiladas**: una semana = una fila de 7 columnas Mon→Sun
- Siempre 7 columnas visibles (mobile y desktop), sin swipe horizontal
- Scroll vertical para ver viaje completo
- Días fuera de rango: opacity 0.3, no clickeables
- Días dentro de rango: fondo con color de ciudad al 14% opacity + borde al 30%

**Contenido por celda** (apilado vertical):
- Número del día arriba a la izquierda
- Stack de badges: ✈ 21:35, 🏨 NH, 🚆 09:40
- Tag de ciudad abajo en uppercase (MAD, BCN, ROM)

**Interacciones**:

| Gesto | Acción |
|-------|--------|
| Tap simple | Abre Day Detail sheet |
| Long-press 500ms | Mini-menu flotante de quick-add |
| Long-press + drag | Asigna ciudad a rango (v1.1) |
| Tap en leyenda | Resalta días de esa ciudad |

**Responsive**:
- Mobile: celdas 55×92 aspect ratio
- Desktop: celdas height 120px fijo
- **Nunca** colapsa a "un día por fila"

### 4.3 Módulo C — Ciudades

- Autocompletado con Nominatim (OpenStreetMap)
- Cache de lat/lng en colección `cities`
- Asignación de color automática (paleta de 8)
- Asignación manual de días del viaje a ciudad

### 4.4 Módulo D — Carga con IA ★

**Modo 1 — Chat natural (primario)**
Text area grande. Claude API recibe texto + contexto del viaje y devuelve JSON estructurado con `confidence_score`. Preview antes de confirmar.

**Modo 2 — Upload PDF/imagen (primario alternativo)**
Picker de archivos + opción de foto. Se sube a Firebase Storage, se envía a Gemini 2.5 Flash (multimodal). El archivo queda como `parse_attachment` para trazabilidad.

**Modo 3 — Formulario manual (secundario)**
Form tradicional pulido. Autocompletado de aeropuertos, aerolíneas, cadenas hoteleras. Para editar items ya cargados o cuando la IA devuelve confidence bajo.

**Flujo de parse**:
1. Usuario dispara parse (chat o upload)
2. Se crea `parse_job` con `status=pending`
3. Llamada a AI Provider (Claude o Gemini según input)
4. Respuesta → validación del schema → `status=success|failed`
5. Preview al usuario con items + confidence scores + source snippet
6. Usuario confirma → se crean documentos en `flights`/`hotels`/`transports`
7. Items quedan linkeados al `parse_job` para auditoría

**AI Provider Pattern**:
```typescript
AIProvider
  .parseText(input, context, schema) → ParsedItems
  .parseAttachment(file, context, schema) → ParsedItems
```
Implementaciones: `ClaudeProvider`, `GeminiProvider`, `OpenAIProvider`. Switch en Settings.

### 4.5 Módulo E — Vuelos / Hoteles / Transportes

**Vuelos** (timezone-aware):
- `departure_local_time` (string ISO sin TZ), `departure_timezone` (IANA), `departure_utc` (Timestamp)
- `arrival_local_time`, `arrival_timezone`, `arrival_utc`
- `duration_minutes` calculado al escribir (UTC arrival - UTC departure)
- Autocompletado de aeropuertos por IATA (dataset `airports/`)
- Si el vuelo cruza días, badge aparece en celda de salida Y de llegada

**Hoteles**: name, chain, address, city_id, check_in_datetime, check_out_datetime, room_type, confirmation_code, price, currency

**Transportes**: type, provider, origin, destination, con misma lógica timezone-aware que vuelos

### 4.6 Módulo F — Gastos + FX

- Totales siempre en USD
- **Viaje pasado**: FX fijo (`fx_eur_usd_fixed_rate` al cerrar el viaje)
- **Viaje futuro/en curso**: FX on-the-fly desde colección `fx_rates`
- Fuente: job diario que popula `fx_rates` (exchangerate-api.com)

### 4.7 Módulo G — Settings

- Perfil (nombre, email — desde Apple ID)
- AI Provider default (Claude / Gemini / OpenAI)
- API keys (iOS Keychain, web en Firebase encrypted)
- Moneda preferida de display (default USD)
- Export de data (JSON completo)
- Sign out

---

## 5. Stack técnico

### 5.1 iOS
- **Lenguaje**: Swift 6
- **UI**: SwiftUI (iOS 17+, `Observable`, `NavigationStack`, `@Environment`)
- **Datos locales**: SwiftData (cache offline + sync con Firestore)
- **Red**: URLSession + async/await
- **Auth**: `ASAuthorizationAppleIDProvider` nativo → Firebase Auth
- **Share Extension**: para recibir texto/PDF/imagen desde otras apps

### 5.2 Web
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind 4 + shadcn/ui
- **Datos**: Firebase JS SDK v10 + TanStack Query
- **Auth**: Firebase Auth con Apple OAuth provider
- **Deploy**: Vercel
- **PWA**: manifest.json + service worker mínimo

### 5.3 Backend — Firebase

> **¿Por qué Firebase y no Supabase?** Supabase free tier limita a 2 proyectos activos, ya ocupados. Firebase Spark plan (gratis) no tiene límite de proyectos.

- **DB**: Cloud Firestore (NoSQL documental) — `users/{userId}/trips/{tripId}/...`
- **Auth**: Firebase Auth con Sign in with Apple provider
- **Storage**: Firebase Storage — bucket `parse-attachments`
- **Functions**: Cloud Functions v2 (Node.js 20)
  - `parseWithAI`: HTTP POST autenticado
  - `updateFxRates`: cron diario 00:00 UTC
  - `cleanParseAttachments`: cron diario 02:00 UTC
  - `trackFlights`: cron cada 15min (v1.1)
- **Push notifications**: Firebase Cloud Messaging (FCM)

**Free tier Firebase Spark**:
- Firestore: 1 GB storage, 50k reads/day, 20k writes/day
- Storage: 5 GB, 1 GB download/day
- Cloud Functions: 2M invocaciones/mes
- Cloud Scheduler: 3 jobs gratis/mes

### 5.4 IA
- **Claude Sonnet 4.5** — parse de texto libre, chat de seguimiento
- **Gemini 2.5 Flash** — parse multimodal (PDF/imagen)
- **OpenAI GPT-4o** — fallback intercambiable
- Prompt engineering: JSON mode con schema estricto, few-shot examples, confidence scoring explícito

---

## 6. Arquitectura de datos (Firestore)

### 6.1 Modelo de colecciones

```
users/{userId}
  display_name, email, avatar_url, created_at

  trips/{tripId}
    name, start_date, end_date, status
    fx_eur_usd_fixed_rate, cover_image_url, cover_image_credit
    created_at

    cities/{cityId}
      name, country, lat, lng
      color_index (0-7), timezone (IANA)
      display_order

    trip_days/{date}   ← key = "2026-03-15"
      city_id, notes

    flights/{flightId}
      airline, flight_number
      departure_airport (IATA), departure_timezone (IANA)
      departure_local_time (string "2026-03-15T21:35")
      departure_utc (Timestamp)
      arrival_airport, arrival_timezone
      arrival_local_time, arrival_utc
      duration_minutes  ← calculado al escribir
      cabin_class, seat, confirmation_code
      price, currency, notes
      parse_job_id
      current_status, current_gate_departure, current_gate_arrival
      current_terminal_departure, current_terminal_arrival
      estimated_departure_utc, estimated_arrival_utc
      last_tracking_update

    hotels/{hotelId}
      name, chain, address, city_id
      check_in_datetime, check_out_datetime
      room_type, confirmation_code
      price, currency, notes, parse_job_id

    transports/{transportId}
      type, provider, origin, destination
      departure_timezone, departure_local_time, departure_utc
      arrival_timezone, arrival_local_time, arrival_utc
      duration_minutes
      confirmation_code, price, currency, notes, parse_job_id

    parse_jobs/{jobId}
      provider, input_type, input_text
      status, error_message
      raw_response, parsed_items, confidence_score
      tokens_used, latency_ms, created_at

─── Colecciones globales (read-only para el usuario) ───

airports/{iataCode}   ← seed estático ~1500 registros
  name, city, country, timezone (IANA)
  lat, lng, icao_code

fx_rates/{date}   ← actualizado por Cloud Function diaria
  rates: { USD: 1, EUR: 0.92, ARS: 1050, ... }
  source, updated_at
```

### 6.2 Storage

```
parse-attachments/{userId}/{jobId}/{filename}
  ← PDFs e imágenes para el parse con IA
  ← Se eliminan a los 30 días via Cloud Function cron

covers/{userId}/{tripId}
  ← Imágenes de cover subidas por el usuario
```

### 6.3 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Colecciones globales: solo lectura, cualquier autenticado
    match /airports/{iataCode} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /fx_rates/{date} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Data del usuario: solo el dueño
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### 6.4 Manejo de timezones en vuelos y transportes ★

Cada punto temporal tiene **tres valores**:

| Campo | Ejemplo | Uso |
|-------|---------|-----|
| `departure_local_time` | `"2026-03-15T21:35"` | Display: "sale 21:35 hora Buenos Aires" |
| `departure_timezone` | `"America/Argentina/Buenos_Aires"` | Contexto IANA para conversión DST-safe |
| `departure_utc` | `Timestamp(2026-03-16T00:35:00Z)` | Cálculo de duración + sorting |

**Cálculo en Cloud Function `parseWithAI` (Node.js con Luxon)**:
```javascript
import { DateTime } from 'luxon';

const dep = DateTime.fromISO('2026-03-15T21:35',
  { zone: 'America/Argentina/Buenos_Aires' });
const arr = DateTime.fromISO('2026-03-16T14:20',
  { zone: 'Europe/Madrid' });

const departure_utc = dep.toUTC().toJSDate();
const arrival_utc   = arr.toUTC().toJSDate();
const duration_minutes = Math.round(
  (arrival_utc - departure_utc) / 60000
);
```

### 6.5 Cloud Functions

| Función | Trigger | Descripción |
|---------|---------|-------------|
| `parseWithAI` | HTTP POST (autenticado) | Recibe input, llama a Claude/Gemini, devuelve items estructurados |
| `updateFxRates` | Cloud Scheduler — diario 00:00 UTC | Fetchea exchangerate-api y actualiza `fx_rates/{today}` |
| `cleanParseAttachments` | Cloud Scheduler — diario 02:00 UTC | Elimina archivos en Storage con más de 30 días |
| `trackFlights` | Cloud Scheduler — cada 15min (v1.1) | Polling AeroDataBox para vuelos activos |

---

## 7. Roadmap por fases

### Fase 0 — Setup (este lunes)
- Export de docs a Markdown
- Repo GitHub `trip-planner-pro-2` con estructura `docs/ ios/ web/ firebase/ design/`
- Claude Design wireframes de dashboard + trip detail + modal parse IA

### Fase 1 — Backend foundations (semana 1)
- Proyecto Firebase nuevo
- Firestore schema + Security Rules
- Sign in with Apple configurado
- Seed de `fx_rates` y dataset IATA (~1500 aeropuertos)

### Fase 2 — Web UI + CRUD (semana 2)
- Next.js project con Tailwind + shadcn/ui
- Auth flow con Apple
- Dashboard (lista de viajes)
- Trip detail con calendar grid funcional (sin IA aún)
- CRUD manual de vuelos/hoteles/transportes

### Fase 3 — Módulo IA en web (semana 3)
- Cloud Function `parseWithAI`
- UI de chat/upload con preview
- AI Provider Pattern en TypeScript
- Integración Claude + Gemini
- Settings de provider y API keys

### Fase 4 — iOS app (semana 4-5)
- Xcode project SwiftUI
- Paridad con web: auth, dashboard, trip detail, carga IA
- Share Extension para recibir bookings desde Mail/Safari
- Keychain para API keys locales
- Offline cache con SwiftData

### Fase 5 — TestFlight + polish (semana 6)
- App Store Connect setup
- TestFlight build 1
- Testing personal: cargar un viaje real end-to-end
- Bug fixing + tuning de prompts

### Fase 6 — v1.1 (post-MVP, ~1-2 meses)
- Flight Tracking con AeroDataBox
- Push notifications via FCM/APNS
- Widget iOS del próximo vuelo
- Modo offline real
- Actividades, documentos, notas

### v1.2 (más adelante)
- Packing list inteligente con clima
- Mapa en vivo tipo FlightRadar (OpenSky Network)
- Apple Watch companion
- Live Activities (Dynamic Island)
- Apple Wallet (PKPass)
- Link público read-only

---

## 8. Decisiones de diseño

- **Dark mode premium**: consistencia con Health App, colores de ciudades y badges resaltan sobre fondo oscuro.
- **Calendar Mon→Sun**: standard europeo, fines de semana visualmente agrupados.
- **Nominatim sobre Google Places**: gratis, sin API key, sin tracking.
- **Parse server-side**: no exponer API keys al cliente, centralizar logging, poder cambiar de provider sin forzar update de app.
- **Gemini para multimodal**: ~5× más barato que Claude para PDF/imagen.
- **Seed estático de aeropuertos**: ~150KB, ~1500 aeropuertos IATA, datos estables, zero dependencias en runtime.
- **Tres valores por punto temporal (local/tz/utc)**: simplifica UI y cálculos, ~80 bytes extra por vuelo.
- **Dos codebases (iOS + Next.js)**: Share Sheet nativo iOS es el diferencial del flujo de parse.
- **AeroDataBox para flight tracking (v1.1)**: único free tier real + data de gate/terminal/status.

---

## 9. Cumplimiento Apple (App Store Review Guidelines)

| Guideline | ¿Aplica? | Mitigación |
|-----------|----------|------------|
| 4.2 — Minimum functionality | Sí | App nativa completa. Share Extension, Keychain, SwiftData. |
| 4.8 — Sign in with Apple | Sí | Provider primario desde día 1. |
| 5.1.1 — Data Collection | Sí | Consentimiento explícito para enviar contenido a IA. |
| 5.1.2 — Data Use | Sí | PDFs/imágenes se eliminan del Storage a los 30 días. |

---

## 10. Métricas de éxito (uso personal)

- ✅ Cargar un viaje de 4 ciudades + 3 vuelos + 5 hoteles en **< 10 min** (vs 45 min en TripLog v1).
- ✅ Tasa de parse exitoso > 85% en emails de booking típicos.
- ✅ La app se instala en TestFlight sin rechazos de Apple.
- ✅ Mati la usa en el próximo viaje real sin volver a TripLog v1.

---

## 11. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Parse con IA falla en emails raros | Alto | Confidence score + preview + fallback a form manual |
| Costos de API altos | Medio | Gemini Flash para multimodal, cache de respuestas idénticas |
| Apple rechaza la app | Alto | Sign in with Apple desde día 1, privacy manifest completo |
| Dos codebases se desincronizan | Medio | Schema Firestore como source of truth + tipos generados |
| AeroDataBox free tier se excede (v1.1) | Medio | Polling escalonado, solo ventana activa T-48h a T+2h |

---

*PRD v1.0 — exportado desde Notion el 2026-04-19.*
