# Project State — Trip Planner Pro 2

## Fase actual
`backend` — Firebase setup (Fase 1 del ROADMAP)

## Reentrada rapida
- Backlog activo de mejoras iOS: `.project/ios-improvements-backlog.md`
- Handoff para retomar en otra sesion/maquina: `.project/ios-improvements-handoff.md`
- QA Fase 4 iOS: `.project/qa-checklist-fase4.md`
- Proximo ticket recomendado: `Permitir eliminar viaje` con `frontend-engineer`

## Gate status
- [x] Gate 1: PRD aprobado ✅ — docs/PRD.md v1.0 (2026-04-19)
- [x] Gate 2: Design aprobado ✅ — docs/DESIGN_BRIEF.md v1.0 (2026-04-19) · wireframes Claude Design pendientes
- [ ] Gate 3: Build completo

## Decisiones tomadas
- 2026-04-19 [PM] Firebase en lugar de Supabase — free tier sin límite de proyectos (Supabase ya tiene 2 activos: IMSEL y CashWise)
- 2026-04-19 [PM] Gemini 2.5 Flash para parse multimodal — ~5× más barato que Claude para PDF/imagen
- 2026-04-19 [PM] Seed estático de aeropuertos (~1500 IATA) — zero dependencias en runtime, datos estables
- 2026-04-19 [PM] Tres valores por punto temporal (local/tz/utc) en vuelos — simplifica UI y cálculos cross-TZ
- 2026-04-19 [PM] Dos codebases (iOS SwiftUI + Next.js web) — Share Sheet nativo es el diferencial del parse
- 2026-04-19 [Arquitecto] Timezone calculations con Luxon en Cloud Functions (no moment.js)
- 2026-04-19 [Arquitecto] `duration_minutes` calculado al escribir en Cloud Function (Firestore no tiene generated columns)
- 2026-04-24 [QA] Checklist Fase 4 iOS creado en `.project/qa-checklist-fase4.md`; cierre bloqueado hasta compilar/probar en Mac con Xcode
- 2026-04-24 [PM] Backlog de mejoras iOS priorizado en `.project/ios-improvements-backlog.md`; light mode queda fuera de MVP por regla dark mode only

## Progreso por fase

### ✅ Fase 0 — Setup (completado 2026-04-19)
- [x] Estructura de carpetas del repo
- [x] docs/PRD.md exportado desde Notion
- [x] docs/DESIGN_BRIEF.md exportado desde Notion
- [x] docs/ROADMAP.md creado
- [x] README.md creado
- [x] CLAUDE.md creado
- [x] AGENTS.md + .claude/agents/ creados
- [ ] Repo GitHub creado (pendiente — hacer local)
- [ ] Claude Design wireframes (pendiente)

### ⏳ Fase 1 — Firebase setup (no iniciado)
- [ ] Crear proyecto en Firebase Console
- [ ] Firebase CLI instalado (`npm install -g firebase-tools && firebase login`)
- [ ] `firebase init` en firebase/ (Firestore, Functions, Storage, Emulators)
- [ ] firebase/firestore.rules
- [ ] firebase/storage.rules
- [ ] firebase/functions/src/index.ts (parseWithAI + updateFxRates + cleanParseAttachments)
- [ ] firebase/seed/airports.json (~1500 aeropuertos OpenFlights)
- [ ] firebase/seed/upload-airports.ts

### ⬜ Fase 2 — Web UI + CRUD (bloqueado por Fase 1)
### ⬜ Fase 3 — Módulo IA en web (bloqueado por Fase 2)
### ⏳ Fase 4 — iOS app (en progreso — rama feat/ios-app)

#### iOS progress
- [x] Onboarding stub
- [x] Sign in with Apple
- [x] Dashboard
- [x] Trip Detail — Calendar view
- [x] Day Detail sheet
- [x] Modal Carga IA — Chat mode
- [x] Modal Carga IA — File mode + Share Extension stub
- [x] CatalogView real (vuelos / hoteles / traslados cross-trip, búsqueda, skeleton shimmer)
- [x] ManualForms en AIParseModal (Vuelo / Hotel / Traslado con DatePicker y validación)
- [x] FirestoreClient.allItemsStream() + CatalogItems struct
- [x] FirestoreClient+ManualSave.swift
- [ ] Settings
- [ ] Tests (checklist QA creado; ejecucion Xcode pendiente)
### ⬜ Fase 5 — TestFlight (bloqueado por Fase 4)

## Handoffs pendientes
- [ ] [setup] → [backend-designer]: iniciar Firebase setup (Fase 1)
- [ ] [backend-designer] → [security-reviewer]: auditar Security Rules antes de deploy
- [ ] [backend-designer] → [frontend-engineer]: API contracts listos para Fase 2
- [ ] [product-manager] → [frontend-engineer]: implementar Ticket 1 iOS — eliminar viaje
- [ ] [product-manager] → [backend-designer]: definir estrategia para ciudades reutilizables sin duplicados

## Open questions para el usuario
- ¿Ya tenés proyecto en Firebase Console creado? (si sí, agregar URL al CLAUDE.md)
- ¿Arrancamos wireframes de Claude Design antes o después de Firebase setup?

## Links del proyecto
- Notion Hub: https://www.notion.so/3474678bb4428126b6ccd9817b029b0c
- Firebase Console: (pendiente)
- Vercel: (pendiente)
- GitHub repo: (pendiente — crear con `gh repo create trip-planner-pro-2 --private`)
