# Roadmap — Trip Planner Pro 2
_Última actualización: 2026-04-29_

---

## ✅ Fase 0 — Setup (completado)
- [x] Repo GitHub `mferracani/trip-planner-pro-2.0` (privado)
- [x] Estructura de carpetas (`docs/`, `ios/`, `web/`, `firebase/`)
- [x] Docs Notion → Markdown (`PRD.md`, `DESIGN_BRIEF.md`, `ROADMAP.md`)
- [x] `README.md`, `CLAUDE.md`, `AGENTS.md`

---

## ✅ Fase 1 — Firebase setup (completado)
- [x] Proyecto Firebase creado y configurado
- [x] Firestore + Auth + Storage habilitados
- [x] Security Rules deployadas (Firestore + Storage)
- [x] Cloud Function `parseWithAI` — HTTP POST autenticado (Claude + Gemini)
- [x] Cloud Function `updateFxRates` — cron diario
- [x] Cloud Function `cleanParseAttachments` — cron diario
- [x] Seed `airports/` (~1500 aeropuertos IATA) ejecutado
- [x] Sign in with Apple configurado en Firebase Auth
- [x] Household sharing (`households/main` con `memberUids[]`)

---

## ✅ Fase 2 — Web UI + CRUD (completado)
- [x] Next.js 15 App Router en `web/next/`
- [x] Auth flow: Sign in with Apple → Firebase Auth
- [x] Dashboard con greeting contextual + countdown + hero card
- [x] Trip Detail — 4 tabs (Calendario / Lista / Items / Costos)
- [x] Calendario 7 columnas siempre, long-press para asignar ciudad
- [x] CRUD completo: vuelos (multi-tramo) / hoteles / transportes / gastos / ciudades
- [x] Modo Borrador (draft/confirmed, fechas opcionales)
- [x] Costos multi-moneda con FX rates
- [x] Catálogo cross-trip
- [x] Settings (AI provider, moneda preferida)
- [x] Documentos de viaje (`/documents`)
- [x] Deploy en Vercel

---

## ✅ Fase 3 — Módulo IA en web (completado)
- [x] Cloud Function `parseWithAI` con Claude (texto) y Gemini (multimodal)
- [x] JSON schema estricto con confidence scoring
- [x] Logging de `parse_jobs` en Firestore
- [x] Modal Carga IA — 3 modos: chat / upload / formulario manual
- [x] Preview post-parse con confidence badges (verde/naranja/rojo)
- [x] Formulario vuelo con secciones IDA/VUELTA + `legs[]` en Firestore

---

## ✅ Fase 4 — iOS app (completado)
- [x] Xcode project via XcodeGen
- [x] Firebase Auth + Firestore + Storage + Functions
- [x] Sign in with Apple nativo
- [x] Dashboard completo (greeting, hero, filtros, stats)
- [x] Trip Detail — 4 tabs (Calendario / Lista / Items / Costos)
- [x] Calendario 7 cols, long-press + drag para asignar ciudad
- [x] AI Parse modal (chat + archivo + formulario manual con multi-tramo)
- [x] Share Extension (Mail/Safari → AIParseModal)
- [x] Catálogo cross-trip con búsqueda y filtros
- [x] Costos con breakdown por categoría + FX rates
- [x] Settings (AI provider, moneda, perfil, export JSON)
- [x] SwiftData cache offline
- [x] Household sharing (ownerUID resuelto al login)
- [x] Documentos de viaje (TravelDocumentsView + StorageClient)
- [x] Dark mode forzado

---

## ✅ Fase 5 — TestFlight (completado)
- [x] App Store Connect configurado
- [x] Provisioning profiles + certificates
- [x] Archive + build subida
- [x] TestFlight activo con build en producción
- [x] Test end-to-end con viajes reales

---

## 🚧 Fase 6 — v1.1 (en curso)

### Flight Tracking con AeroDataBox ★ (P1)
- [x] Cloud Function `trackFlights` (cron cada 15min) — deployada en producción
- [x] Campos de tracking en `flights/` (`current_status`, `current_gate_*`, `estimated_*_utc`, `last_tracking_update`)
- [x] Badge de estado en ListView + day-detail sheet (iOS + web) con Unknown/Diverted
- [x] Horario estimado visible en detalle de vuelo (iOS + web)
- [x] "Actualizado hace X min" indicator (iOS + web)
- [x] Retry con backoff en HTTP 429 de AeroDataBox
- [ ] Push notifications via FCM/APNS

### Widget iOS del próximo vuelo (P2)
- [ ] WidgetKit: Small + Medium + Lock Screen
- [ ] App Group entitlement para compartir data con la app
- [ ] Live Activities (Dynamic Island) cuando vuelo está en status `active`

### Otras features v1.1 (P2-P3)
- [ ] Export PDF del itinerario (PDFKit iOS / @react-pdf web)
- [ ] Duplicar viaje (ambas plataformas)
- [ ] Countdown granular en web (5 niveles — iOS ya lo tiene)
- [ ] Actividades/reservas (tours, restaurantes, entradas) — nuevo módulo
- [ ] Notas y bookmarks por día
- [ ] Drag-to-assign ciudad en calendario

---

## v1.2 (más adelante)

- [ ] Packing list inteligente con clima (OpenWeather + Claude)
- [ ] Mapa en vivo tipo FlightRadar (OpenSky Network)
- [ ] Apple Watch companion
- [ ] Apple Wallet (PKPass para vuelos y hoteles)
- [ ] Live Activities completo
- [ ] Link público read-only del viaje
- [ ] Migración de data de TripLog v1
- [ ] Modo offline real extendido (2 viajes próximos prefetched)
- [ ] Onboarding (3 pantallas)

---

*ROADMAP v2.0 — actualizado 2026-04-29 (refleja estado real post-TestFlight).*
