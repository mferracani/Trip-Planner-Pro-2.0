# 🗺️ Roadmap — Trip Planner Pro 2

> Fases ordenadas por semana. Fuente: PRD § 7.

---

## Fase 0 — Setup (lunes 2026-04-21)

- [x] Crear repo GitHub `trip-planner-pro-2` (privado)
- [x] Crear estructura de carpetas (`docs/`, `ios/`, `web/`, `firebase/`, `design/`)
- [x] Exportar docs de Notion a Markdown (`PRD.md`, `DESIGN_BRIEF.md`, `ROADMAP.md`)
- [x] Crear `README.md` y `CLAUDE.md`
- [ ] Claude Design wireframes: Dashboard + Trip Detail + Modal Carga IA
- [ ] Primer commit al repo con toda la documentación

---

## Fase 1 — Backend: Firebase setup (semana 1)

- [ ] Crear proyecto en Firebase Console
- [ ] Firebase CLI instalado y configurado (`firebase init`)
- [ ] Security Rules de Firestore generadas (`firebase/firestore.rules`)
- [ ] Security Rules de Storage (`firebase/storage.rules`)
- [ ] Cloud Functions scaffolding:
  - [ ] `parseWithAI` — HTTP POST autenticado
  - [ ] `updateFxRates` — cron diario
  - [ ] `cleanParseAttachments` — cron diario
- [ ] Seed `airports.json` (~1500 aeropuertos OpenFlights)
- [ ] Script `upload-airports.ts` para poblar colección `airports/`
- [ ] Sign in with Apple configurado en Firebase Auth

---

## Fase 2 — Web UI + CRUD (semana 2)

- [ ] Setup Next.js 15 (App Router) en `web/next/`
  - [ ] Tailwind 4 + shadcn/ui
  - [ ] Firebase JS SDK v10 + TanStack Query
- [ ] Auth flow: Sign in with Apple → Firebase Auth
- [ ] Rutas y pantallas:
  - [ ] `/auth` — login con Apple
  - [ ] `/` — Dashboard (lista viajes + stats + saludo contextual)
  - [ ] `/trips/new` — crear viaje con Unsplash cover picker
  - [ ] `/trips/[id]` — trip detail con 3 tabs (Calendar / List / Map)
  - [ ] `/settings` — config de providers y API keys
- [ ] Calendar grid funcional (sin IA aún, con datos mockeados)
- [ ] CRUD manual de vuelos, hoteles y transportes
- [ ] Saludo contextual dinámico (lógica pura en cliente)
- [ ] Countdown vivo al próximo viaje (rerender cada 60s)

---

## Fase 3 — Módulo IA en web (semana 3)

- [ ] Cloud Function `parseWithAI` completa:
  - [ ] Claude provider (texto libre)
  - [ ] Gemini provider (multimodal PDF/imagen)
  - [ ] JSON schema estricto con confidence scoring
  - [ ] Logging de `parse_jobs` en Firestore
- [ ] UI Modal Carga IA con 3 modos:
  - [ ] Chat natural
  - [ ] Upload de archivo (PDF/imagen)
  - [ ] Formulario manual
- [ ] Preview post-parse con confidence badges
- [ ] Settings: cambio de AI provider + API keys
- [ ] AI Provider Pattern en TypeScript (`ClaudeProvider`, `GeminiProvider`)

---

## Fase 4 — iOS app (semanas 4-5)

- [x] Crear Xcode project via XcodeGen (`ios/project.yml`)
  - [x] Targets: iOS app + Share Extension (Widget en v1.1)
- [x] Swift Package Manager:
  - [x] Firebase/Auth + Firestore + Storage + Functions
  - [x] SwiftKeychainWrapper
- [ ] Configurar `GoogleService-Info.plist` ← pendiente (requiere Mac con Xcode)
- [x] Estructura modular (`Features/`, `Core/`, `DesignSystem/`)
- [x] Paridad con web:
  - [ ] Onboarding (3 pantallas) ← pendiente v1.1
  - [x] Sign in with Apple nativo (ASAuthorizationAppleIDProvider)
  - [x] Dashboard con saludo contextual + countdown vivo
  - [x] Trip Detail — Calendar view (grid Mon→Sun, 7 cols fijas)
  - [x] Day Detail sheet con cards ricas + booking ref copiable
  - [x] Catálogo cross-trip (vuelos/hoteles/transportes)
  - [x] Modal Carga IA — Chat mode + formularios manuales
  - [x] Share Extension (Mail/Safari → AIParseModal)
  - [x] Settings con info de cuenta + provider IA
- [x] SwiftData cache offline (trips + flights + hotels + transports)
- [x] Dark mode forzado (preferredColorScheme(.dark) en root + Info.plist)
- [ ] Household sharing activado ← pendiente UIDs post-primer-login

---

## Pendientes antes de TestFlight (F4.7)

- [ ] Registrar App Group en Apple Developer Console (`group.com.mferracani.tripplannerpro`)
- [ ] Crear App ID para Share Extension (`com.mferracani.tripplannerpro.share`)
- [ ] Poner `GoogleService-Info.plist` en `ios/TripPlannerPro/Resources/`
- [ ] Reemplazar `REPLACE_WITH_PROJECT_ID` en `AIParseClient.swift` con URL real de Cloud Function
- [ ] En Mac mini: `brew install xcodegen && cd ios && xcodegen && open TripPlannerPro.xcodeproj`
- [ ] Archive + upload en Xcode → App Store Connect → TestFlight
- [ ] Pasar a Claude los 2 UIDs (Mati + mujer) para activar household sharing en Firestore Rules

---

## Fase 5 — TestFlight + polish (semana 6)

- [ ] App Store Connect: crear app
- [ ] Generar provisioning profiles + certificates
- [ ] Archive en Xcode + subir build
- [ ] Invitarme como tester interno
- [ ] **Test end-to-end**: cargar un viaje real con vuelos + hoteles via IA
- [ ] Bug fixing + tuning de prompts de parse
- [ ] Performance: medir tiempo de parse (objetivo < 5s)

---

## Fase 6 — v1.1 (post-MVP, ~1-2 meses)

### Flight Tracking con AeroDataBox ★
- [ ] Cloud Function `trackFlights` (cron cada 15min)
- [ ] Colección `flight_tracking_subscriptions` en Firestore
- [ ] Colección `flight_tracking_events` en Firestore
- [ ] Campos de tracking en `flights/` (current_status, gate, terminal, ETA)
- [ ] Badge de vuelo en calendario con estados visuales (delayed, cancelled, en vuelo)
- [ ] Push notifications via FCM/APNS
- [ ] Settings grupo "Tracking" con toggles granulares

### Widget iOS del próximo vuelo
- [ ] WidgetKit: Small + Medium + Lock Screen
- [ ] App Group entitlement para compartir data con la app
- [ ] Live Activities (Dynamic Island) cuando vuelo está en status `active`

### Modo offline real
- [ ] SwiftData extiende cache: viaje activo + próximos 2 viajes futuros
- [ ] Prefetch automático al conectarse a wifi
- [ ] Banner offline global (banner discreto + acciones deshabilitadas)
- [ ] Conflict resolution: last-write-wins

### Otras features v1.1
- [ ] Actividades/reservas (tours, restaurantes, entradas)
- [ ] Documentos de viaje (pasaporte, visa, seguro)
- [ ] Notas y bookmarks
- [ ] Drag-to-assign ciudad en calendario
- [ ] Export a PDF del itinerario

---

## v1.2 (más adelante)

- [ ] Packing list inteligente con clima (OpenWeather + Claude)
- [ ] Mapa en vivo tipo FlightRadar (OpenSky Network)
- [ ] Apple Watch companion
- [ ] Live Activities completo
- [ ] Apple Wallet (PKPass para vuelos y hoteles)
- [ ] Link público read-only
- [ ] Migración de data de TripLog v1

---

## Orden de ataque semanal

| Día | Foco |
|-----|------|
| Lunes AM (2h) | Fase 0: docs + wireframes Dashboard + Calendar |
| Lunes PM (3h) | Fase 1: Firebase setup + Cloud Functions scaffold |
| Martes | Fase 2: Web UI shell + auth + dashboard |
| Miércoles | Fase 2: trip detail + calendar grid + CRUD Firestore |
| Jueves-Viernes | Fase 3: módulo IA + parse + preview |
| Semana 2 | Fase 4: iOS |
| Semana 3 | Fase 5: TestFlight |

---

*ROADMAP v1.0 — exportado desde Notion el 2026-04-19.*
