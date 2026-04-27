# Trip Planner Pro 2 — Contexto para Claude Code

> Este archivo es la fuente de verdad para todos los agents de Claude Code que trabajen en este repo.
> Leelo completo antes de empezar cualquier tarea.

---

## Qué es este proyecto

Trip Planner Pro 2 es una app **personal** (usuario único: Mati) de planificación de viajes multi-ciudad.
Su diferencial es el **módulo de carga con IA**: el usuario pega un email de booking o sube un PDF y Claude/Gemini extrae vuelos, hoteles y transportes automáticamente con preview y confidence scores.

Reemplaza a TripLog v1 (que tenía excelente calendario visual pero carga manual muy lenta, ~45 min por viaje complejo). El objetivo MVP es reducir ese tiempo a <10 min.

---

## Dónde está cada cosa

```
docs/PRD.md           ← Especificación completa: problema, módulos, stack, data model, roadmap
docs/DESIGN_BRIEF.md  ← Sistema visual dark mode premium + specs de todas las pantallas
docs/ROADMAP.md       ← Roadmap por fases con checklist
docs/adr/             ← Architecture Decision Records
ios/TripPlannerPro/   ← Xcode project Swift 6 + SwiftUI (Fase 4, puede no existir aún)
web/next/             ← Next.js 15 App Router (Fase 2, puede no existir aún)
firebase/functions/   ← Cloud Functions Node.js 20
firebase/firestore.rules
firebase/storage.rules
firebase/seed/airports.json   ← ~1500 aeropuertos IATA (dataset estático)
design/wireframes/    ← Exports de Claude Design
```

---

## Stack

| Capa | Tecnología |
|------|------------|
| iOS | Swift 6, SwiftUI, iOS 17+, SwiftData, URLSession async/await |
| Web | Next.js 15 (App Router), React 19, Tailwind 4, shadcn/ui, TanStack Query |
| Backend | Firebase Firestore (NoSQL), Firebase Auth, Firebase Storage, Cloud Functions v2 Node.js 20 |
| Auth | Sign in with Apple → Firebase Auth (iOS: nativo ASAuthorizationAppleIDProvider) |
| IA texto | Claude Sonnet 4.5 via API (server-side en Cloud Function `parseWithAI`) |
| IA multimodal | Gemini 2.5 Flash via API (server-side en Cloud Function `parseWithAI`) |
| Deploy web | Vercel |

---

## Arquitectura de datos (Firestore)

Estructura jerárquica. Toda la data del usuario bajo `users/{userId}`:

```
users/{userId}
  trips/{tripId}
    cities/{cityId}
    trip_days/{date}      ← key = "2026-03-15"
    flights/{flightId}
    hotels/{hotelId}
    transports/{transportId}
    parse_jobs/{jobId}

airports/{iataCode}       ← colección global, read-only
fx_rates/{date}           ← colección global, actualizada por cron
```

**Regla de seguridad base**: `request.auth.uid == userId` cubre toda la data del usuario. Las colecciones globales (`airports`, `fx_rates`) son read-only para cualquier usuario autenticado.

### Timezone handling en vuelos (crítico)

Cada punto temporal (salida/llegada) tiene **tres campos**:
- `departure_local_time`: string ISO sin timezone, ej. `"2026-03-15T21:35"` — para mostrar al usuario
- `departure_timezone`: IANA string, ej. `"America/Argentina/Buenos_Aires"` — contexto DST-safe
- `departure_utc`: Firestore Timestamp UTC — para calcular duración y sorting

El campo `duration_minutes` se **calcula al escribir** (no es generated column, Firestore no los tiene). Se usa Luxon en la Cloud Function.

---

## Cloud Functions

| Función | Trigger | Descripción |
|---------|---------|-------------|
| `parseWithAI` | HTTP POST autenticado | Recibe input del usuario, llama a Claude/Gemini, devuelve JSON estructurado |
| `updateFxRates` | Cloud Scheduler diario 00:00 UTC | Actualiza `fx_rates/{today}` desde exchangerate-api.com |
| `cleanParseAttachments` | Cloud Scheduler diario 02:00 UTC | Elimina archivos en Storage con >30 días |
| `trackFlights` | Cloud Scheduler cada 15min (v1.1) | Polling AeroDataBox para vuelos activos |

Las API keys (Claude, Gemini, AeroDataBox) viven en Firebase Secret Manager. **Nunca** se exponen al cliente.

---

## AI Provider Pattern

En TypeScript (web/Cloud Functions):
```typescript
interface AIProvider {
  parseText(input: string, context: TripContext, schema: ParseSchema): Promise<ParsedItems>
  parseAttachment(file: StorageRef, context: TripContext, schema: ParseSchema): Promise<ParsedItems>
}
// Implementaciones: ClaudeProvider, GeminiProvider, OpenAIProvider
```

En Swift (iOS):
```swift
protocol AIProvider {
  func parseText(_ input: String, context: TripContext, schema: ParseSchema) async throws -> [ParsedItem]
  func parseAttachment(_ data: Data, context: TripContext, schema: ParseSchema) async throws -> [ParsedItem]
}
```

---

## Convenciones

### Feature parity iOS ↔ web (regla permanente)
**Toda funcionalidad implementada en una plataforma debe existir también en la otra.**
- Antes de cerrar cualquier feature, verificar que esté en ambas plataformas.
- Si no está en la otra, implementarla de inmediato o crear un ticket explícito.
- El audit de gaps actuales vive en `.project/feature-parity.md` — actualizarlo cuando se cierre un gap.
- Esto aplica a lógica, UI y acciones del usuario (no solo a pantallas).

### General
- **Dark mode only** en toda la app (iOS y web). No hay modo claro.
- **Idioma del código**: inglés (variables, funciones, comentarios técnicos). Strings de UI en español.
- **Commits**: `feat:`, `fix:`, `chore:`, `docs:` prefixes.

### Firestore
- IDs de documentos: auto-generados por Firestore (no UUIDs manuales).
- Fechas: Firestore Timestamp para UTC, string ISO `"2026-03-15"` para fechas locales sin hora, string `"2026-03-15T21:35"` para local datetime sin TZ.
- `duration_minutes`: siempre calculado en la Cloud Function, no en el cliente.

### iOS (Swift)
- Swift 6 strict concurrency.
- `@Observable` macro (no `ObservableObject`).
- `NavigationStack` (no `NavigationView`).
- SwiftData para cache local, Firestore SDK para sync.
- Keychain para API keys (SwiftKeychainWrapper).

### Web (Next.js)
- App Router con Server Components donde sea posible.
- Client Components marcados con `"use client"` solo cuando necesario.
- TanStack Query para data fetching + cache.
- `NEXT_PUBLIC_FIREBASE_*` para env vars del cliente.

### TypeScript
- Strict mode habilitado.
- Tipos generados desde el schema de Firestore (a crear).
- No usar `any` explícito.

---

## Agents esperados

Cuando trabajés en este proyecto, asumí estos roles según la tarea:

**PM agent** (`docs/PRD.md` es tu biblia):
- Validar features contra el PRD antes de implementar
- Mantener foco en MVP scope (vuelos + hoteles + transportes, nada más por ahora)
- Escribir tickets ejecutables con acceptance criteria claros

**Arquitecto** (`docs/adr/` es tu output):
- Decisiones técnicas documentadas en ADRs formato estándar
- Diagrama de componentes en Mermaid cuando sea útil
- Validar que no haya inconsistencias entre Firebase schema y código cliente

**Backend dev** (`firebase/` es tu workspace):
- Cloud Functions siempre autenticadas (verificar Firebase ID token)
- Nunca exponer API keys al cliente
- Usar Luxon para timezone calculations (no moment.js)
- Logging de `parse_jobs` en Firestore para trazabilidad

**Frontend web dev** (`web/next/` es tu workspace):
- Dark mode desde el inicio (paleta del Design Brief § 2.1)
- Calendar grid: NUNCA colapsar a "un día por fila", siempre 7 columnas
- Confidence badges en preview post-parse (verde/naranja/rojo)

**iOS dev** (`ios/` es tu workspace):
- SwiftUI nativa, no WebView
- Share Extension para recibir bookings desde Mail/Safari
- Dark mode forzado (`preferredColorScheme(.dark)` en root)
- Respetar safe areas y Dynamic Island

---

## Lo que NO está en scope del MVP

- Multi-usuario / equipos
- Compartir viajes públicamente
- Flight tracking en tiempo real (v1.1)
- Widget iOS (v1.1)
- Packing list (v1.2)
- Mapa FlightRadar (v1.2)
- Apple Watch (v1.2)
- Actividades/restaurantes/tours
- Documentos de viaje (pasaporte, visa)

Si surge scope creep, consultá al PM agent antes de implementar.

---

## Links y referencias

- Notion Hub: https://www.notion.so/3474678bb4428126b6ccd9817b029b0c
- Notion PRD: https://www.notion.so/3474678bb44281efb2cac9cf0f4906ed
- Notion Design Brief: https://www.notion.so/3474678bb4428118a468c3057c652639
- Firebase Console: (agregar URL cuando esté creado)
- Vercel: (agregar URL cuando esté deployado)
- OpenFlights airports dataset: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat

---

*CLAUDE.md v1.0 — generado desde Notion el 2026-04-19.*
