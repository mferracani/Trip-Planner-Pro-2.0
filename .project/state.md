# Project State — Trip Planner Pro 2
_Última actualización: 2026-04-29 (flight tracking v1.1 completado)_

---

## Estado actual del producto

**El MVP está COMPLETO y en producción.**

- ✅ Firebase live (Firestore + Auth + Storage + Cloud Functions deployadas)
- ✅ iOS en TestFlight — build funcionando con datos reales
- ✅ Web en producción (Vercel) — todos los viajes guardados y accesibles
- ✅ Household sharing activo (Mati + Agustina sobre el mismo ownerUID)
- ✅ AI Parse operativo (Claude texto + Gemini multimodal)
- ✅ Datos reales persistiendo end-to-end

**Fase actual: post-MVP — desarrollo de features v1.1**

---

## Reentrada rápida para nueva sesión

Antes de tocar cualquier cosa, leer en este orden:
1. Este archivo (`state.md`) — estado general y decisiones
2. `.project/feature-parity.md` — tabla iOS vs web actualizada (64 features auditados)
3. `docs/ROADMAP.md` — roadmap por fases con checklist
4. `CLAUDE.md` — convenciones, stack, arquitectura (fuente de verdad permanente)

---

## Arquitectura en producción

| Capa | Estado |
|------|--------|
| Firebase proyecto | ✅ Creado y configurado |
| Firestore rules | ✅ Deployadas |
| Storage rules | ✅ Deployadas (con ruta `/documents/` para TPP-27) |
| Cloud Function `parseWithAI` | ✅ Deployada — Claude + Gemini |
| Cloud Function `updateFxRates` | ✅ Deployada — cron diario |
| Cloud Function `cleanParseAttachments` | ✅ Deployada — cron diario |
| Cloud Function `trackFlights` | ✅ Deployada — cron cada 15min (AeroDataBox, secret configurado) |
| Seed airports (~1500 IATA) | ✅ Ejecutado |
| iOS — TestFlight | ✅ Build activa |
| Web — Vercel | ✅ Deployada |
| Household sharing | ✅ Activo (Mati + Agustina) |

---

## Feature parity iOS vs Web — resumen ejecutivo

Ver tabla completa en `.project/feature-parity.md` (64 items auditados al 2026-04-29).

### Paridad alcanzada (sin gaps):
- Dashboard completo (greeting, hero, filtros, stats, empty state con demo)
- Crear viaje (Confirmado / Borrador, fechas, validación)
- Trip Detail — Calendario 7 cols, Day Detail, badges, long-press ciudad
- Lista cronológica, Items view (vuelos/hoteles/transportes/ciudades)
- Costos multi-moneda + FX + breakdown por categoría
- AI Parse modal (chat + archivo + formulario manual)
- Formulario vuelo multi-tramo IDA/VUELTA con `legs[]` en Firestore
- Catálogo cross-trip (vuelos/hoteles/transportes/ciudades con config global)
- Settings (AI provider, moneda preferida, perfil, cerrar sesión)
- Documentos de viaje (TPP-27 ✅ — pasaporte/visa/seguro en ambas plataformas)

### Gaps conocidos (no críticos):
| Gap | Plataforma | Prioridad |
|-----|-----------|-----------|
| Countdown web sin 5 niveles de granularidad (solo "En X días") | Web | P2 |
| Export JSON | Web (iOS lo tiene) | P3 |
| Progress ring en hero card | Web (iOS lo tiene) | P3 |
| Breakdown costos por categoría | Web (iOS lo tiene) | P3 |
| Duplicar viaje | Ambas | P2 |
| Offline banner | Web (iOS lo tiene) | P3 |

---

## Backlog v1.1 — ordenado por prioridad

### 🔴 P1 — Arrancar ahora

| Issue | Feature | Valor |
|-------|---------|-------|
| ~~TPP-?~~ | ~~**Flight Tracking en tiempo real** (AeroDataBox)~~ | ✅ **COMPLETADO** — `trackFlights` deployada, badges + estimated times en iOS + web |
| TPP-? | **Push notifications de vuelos** (FCM/APNS) | Sin esto el tracking vale la mitad. Necesario para que la app sea proactiva. |

### 🟡 P2 — Alta prioridad

| Issue | Feature | Valor |
|-------|---------|-------|
| TPP-? | **Widget iOS próximo vuelo** (WidgetKit Small+Medium+Lock Screen) | Utilidad sin abrir la app. App Group entitlement ya en el plan. |
| TPP-? | **Live Activities / Dynamic Island** (vuelo activo) | Diferencial premium. Solo cuando el vuelo está en status `active`. |
| TPP-? | **Export PDF del itinerario** | Caso de uso: imprimir/enviar antes del viaje. PDFKit iOS / @react-pdf web. Bajo costo, alto valor percibido. |
| TPP-? | **Duplicar viaje** | Falta en ambas plataformas. Útil para viajes recurrentes (ej. Buenos Aires → Madrid cada año). |
| TPP-? | **Countdown granular en web** (5 niveles del PRD) | iOS ya lo tiene. Cerrar el gap de paridad. |

### 🟢 P3 — Post-P2

| Issue | Feature | Valor |
|-------|---------|-------|
| TPP-? | **Actividades / reservas** (tours, restaurantes, entradas) | Cierra el ciclo de planificación. Requiere nuevo módulo en schema. |
| TPP-? | **Modo offline real** (SwiftData con 2 viajes próximos prefetched) | Infraestructura ya parcialmente lista. |
| TPP-? | **Notas y bookmarks por día** | Feature simple, alta demanda en viajes complejos. |
| TPP-? | **Drag-to-assign ciudad en calendario** | Alternativa fluida al long-press actual. |
| TPP-? | **Onboarding (3 pantallas)** | Stub existe en iOS. Web no tiene. |

---

## Backlog v1.2 (más adelante)

- Documentos de viaje (pasaporte, visa, seguro) — **ya implementado en TPP-27**, movido a done
- Packing list inteligente con clima (OpenWeather + Claude)
- Mapa en vivo tipo FlightRadar (OpenSky Network)
- Apple Watch companion
- Apple Wallet (PKPass para vuelos y hoteles)
- Link público read-only del viaje
- Migración de data de TripLog v1

---

## Decisiones de arquitectura vigentes

| Fecha | Decisión |
|-------|---------|
| 2026-04-29 | Household sharing: patrón `households/main` con `memberUids[]`. Owner UID resuelto al login. Reglas Firestore cubren subcollecciones via wildcard `users/{userId}/{document=**}`. |
| 2026-04-29 | Documentos de viaje globales al usuario (`users/{uid}/travel_documents/`), no per-trip. Storage en `users/{uid}/documents/{filename}`. |
| 2026-04-27 | Política feature parity: toda funcionalidad en una plataforma debe existir en la otra. Audit completo en `.project/feature-parity.md`. |
| 2026-04-27 | Vuelos multi-tramo: schema `legs[]` con `FlightLeg.direction` ("outbound"/"inbound") en Firestore. Ambas plataformas lo guardan. |
| 2026-04-25 | Modo Borrador: `status: "draft"` en Firestore + `is_tentative_dates: true`. Borradores tienen su propio tab, excluidos del hero. |
| 2026-04-19 | Firebase (no Supabase). Gemini 2.5 Flash para multimodal. Seed estático de aeropuertos. Tres valores por punto temporal en vuelos (local/tz/utc). Luxon para timezone calculations en Cloud Functions. |

---

## Convenciones de trabajo (resumen ejecutivo)

- **Idioma del código**: inglés. **UI strings**: español.
- **Dark mode only** — sin modo claro en ninguna plataforma.
- **Feature parity iOS ↔ web** — regla permanente. Actualizar `.project/feature-parity.md` al cerrar cada feature.
- **Commits**: prefijos `feat:` / `fix:` / `chore:` / `docs:`.
- **Branch de trabajo**: `claude/pull-latest-changes-obHfZ` → merge a `main` cuando el usuario lo pide.
- **Scope MVP**: vuelos + hoteles + transportes + AI parse + calendario + costos + auth. Sin actividades, packing list, mapas, watch por ahora.

---

## Links del proyecto

- Notion Hub: https://www.notion.so/3474678bb4428126b6ccd9817b029b0c
- GitHub: mferracani/trip-planner-pro-2.0
- Firebase Console: (agregar URL)
- Vercel: (agregar URL)
- TestFlight: activo — build en producción
