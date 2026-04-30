# Project State — Trip Planner Pro 2

## Fase actual
`ios` — Fase 4 en progreso. TestFlight en preparación (Fase 5 inminente).

## Reentrada rapida
- Backlog activo de mejoras iOS: `.project/ios-improvements-backlog.md`
- Handoff para retomar en otra sesion/maquina: `.project/ios-improvements-handoff.md`
- QA Fase 4 iOS: `.project/qa-checklist-fase4.md`
- Proximo ticket recomendado: `Ciudades reutilizables sin duplicados` con `backend-designer` antes de tocar UI

## Gate status
- [x] Gate 1: PRD aprobado ✅ — docs/PRD.md v1.0 (2026-04-19)
- [x] Gate 2: Design aprobado ✅ — docs/DESIGN_BRIEF.md v1.0 (2026-04-19) · wireframes Claude Design pendientes
- [ ] Gate 3: Build completo

## Decisiones tomadas
- 2026-04-26 [PM] Auditoría de paridad web↔iOS completada. Gaps documentados en este archivo (ver "Gaps iOS identificados"). Prioridad alta: countdown granular en hero card, crear viaje con elección draft/confirmed, editar portada (cover/tema) en TripEditSheet, CityEditSheet en iOS. Prioridad media: DraftDatePicker visual con calendarios en iOS. Settings: export JSON y moneda preferida ausentes.
- 2026-04-25 [PM] Modo Borrador aprobado para MVP — entra en Módulo A (Viajes). Agrega campo `status: "draft"|"planned"|"active"|"past"` a Firestore trips. Plan completo en `docs/draft-mode-plan.md`. Tickets escritos para web (Fase 2) e iOS (Fase 4).
- 2026-04-25 [PM] Borradores excluidos del tab "Todos" en Dashboard — tienen su propio tab "Borradores" al final del filtro. Los borradores no aparecen en el Hero.
- 2026-04-25 [PM] Fechas tentativas como texto libre (`tentative_start_date: string`) + `start_date`/`end_date` pueden ser `""` en borradores. Todos los componentes que leen fechas deben ser defensivos.
- 2026-04-19 [PM] Firebase en lugar de Supabase — free tier sin límite de proyectos (Supabase ya tiene 2 activos: IMSEL y CashWise)
- 2026-04-19 [PM] Gemini 2.5 Flash para parse multimodal — ~5× más barato que Claude para PDF/imagen
- 2026-04-19 [PM] Seed estático de aeropuertos (~1500 IATA) — zero dependencias en runtime, datos estables
- 2026-04-19 [PM] Tres valores por punto temporal (local/tz/utc) en vuelos — simplifica UI y cálculos cross-TZ
- 2026-04-19 [PM] Dos codebases (iOS SwiftUI + Next.js web) — Share Sheet nativo es el diferencial del parse
- 2026-04-19 [Arquitecto] Timezone calculations con Luxon en Cloud Functions (no moment.js)
- 2026-04-19 [Arquitecto] `duration_minutes` calculado al escribir en Cloud Function (Firestore no tiene generated columns)
- 2026-04-24 [QA] Checklist Fase 4 iOS creado en `.project/qa-checklist-fase4.md`; cierre bloqueado hasta compilar/probar en Mac con Xcode
- 2026-04-24 [PM] Backlog de mejoras iOS priorizado en `.project/ios-improvements-backlog.md`; light mode queda fuera de MVP por regla dark mode only
- 2026-04-24 [Frontend] Ticket iOS 1 implementado: eliminar viaje desde Dashboard con confirmacion y error state; pendiente build Xcode
- 2026-04-24 [Frontend] Ticket iOS 2 implementado: editar fechas de viaje, persistir en Firestore y recalcular calendario; pendiente build Xcode
- 2026-04-24 [Frontend] Tickets iOS 8/9 implementados: detalle desde Catalogo y formateo monetario con simbolos; pendiente build Xcode
- 2026-04-24 [Frontend] Xcode 26.4.1 + XcodeGen 2.45.4 configurados; `xcodebuild` Debug iOS Simulator para `TripPlannerPro` pasa en esta Mac
- 2026-04-24 [Setup] Skill global `ui-designer-expert` creada en `/Users/mac017/.codex/skills/ui-designer-expert`
- 2026-04-24 [Frontend] Rediseño premium core aplicado en iOS + web: tokens warm dark, Home hero, Trip Detail y calendario 7 columnas; `next build` y `xcodebuild` pasan
- 2026-04-24 [Frontend] Mockup premium aplicado a pantallas reales: web Trip Detail usa hero con foto/progreso/metricas; iOS Dashboard y Trip Detail usan la misma composicion visual; `next build` y `xcodebuild` pasan
- 2026-04-24 [Frontend] `/dev` convertido en prototipo funcional in-memory: navegacion real, tabs, calendario 7 columnas, drawer de dia y modal IA; removidos marcos/canvas/clases de mockup; `next build` pasa
- 2026-04-24 [Frontend] Calendario mobile de `/dev` ajustado a slots legibles: fecha dd/mm, bandera, codigo de ciudad, contador de estadia e items abreviados; `next build` pasa
- 2026-04-24 [Frontend] Interaccion mobile de calendario corregida: tocar un dia abre bottom sheet desde abajo; desktop conserva panel lateral; `next build` pasa
- 2026-04-25 [Frontend] Feature multi-ciudad mismo dia + Modo Borrador implementados en rama feat/draft-mode; `tsc --noEmit` y `next build` pasan

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

#### Web progress (MAT-39)
- [x] /stats — "Tu mundo": globe cobe WebGL + stat cards + CountUpNumber (2026-04-28)

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
- [x] Eliminar viaje desde Dashboard (pendiente build Xcode)
- [x] Editar fechas de viaje y recalcular calendario (pendiente build Xcode)
- [x] Detalle desde Catálogo (pendiente build Xcode)
- [x] Monedas con símbolos en Catálogo/Costos/Formularios (pendiente build Xcode)
- [x] Build Debug iOS Simulator compila en Xcode 26.4.1
- [x] Modo Borrador iOS — paridad completa con web (2026-04-27)
- [x] Long-press + drag para seleccionar rango de días y asignar ciudad (Ticket 4)
- [x] Settings
- [x] Dashboard — sección "Mis estadísticas" (GlobalStatsStrip: viajes, ciudades, vuelos, días) — T11 (2026-04-27)
- [x] Cache offline CatalogView — T3 completo: CatalogViewModel + CachedCatalogSnapshot (SwiftData v4) + offline banner (2026-04-28)
- [x] "Tu mundo" StatsView iOS (MAT-39) — globe canvas + CountUpText + StatsViewModel + tab "Mundo" (2026-04-28)
- [x] TPP-95: Eliminar tab "Mundo" — stats/globo movidos al tab "Inicio". Ahora hay 4 tabs: Inicio (stats), Viajes (dashboard), Catálogo, Settings (iOS + web) (2026-04-30)
- [x] TPP-97: Días padding grises en calendario — completan la semana, al tocarlos extienden el rango del viaje (iOS + web). Fix: mayor contraste padding days (#1E1E1E fondo, #707070 texto) (2026-04-30)
- [ ] Tests (checklist QA creado; ejecucion Xcode pendiente)
### ⏳ Fase 5 — TestFlight (en preparación)
- [ ] Archive desde Xcode (Mati lo hace ahora — 2026-04-30)
- [ ] Subir build a App Store Connect
- [ ] Invitar a Agustina vía TestFlight (script add-household-member con Firebase UID de su Apple ID)
- [ ] TPP-49 household sharing: Agustina loguea con su Apple ID, Mati corre `firebase/seed/upsert-household-member.ts` con su UID

## Decisiones PM — 2026-04-30

- [PM] TPP-95 mergeado a main: tab "Mundo" eliminado, stats/globo 3D movidos al tab "Inicio". Estructura final de tabs: Inicio / Viajes / Catálogo / Settings (iOS + web). Paridad confirmada.
- [PM] TPP-97 mergeado a main: días padding del calendario (fuera del rango del viaje pero dentro de la semana) ahora son grises y tapeables — al tocarlos extienden el rango. Fix adicional de contraste: fondo #1E1E1E, texto #707070. Paridad iOS + web confirmada.
- [PM] MAT-39 / feat/mat-39 mergeado a main: pantalla "Tu mundo" con globo 3D WebGL + stats animadas (iOS + web). Integrado finalmente como tab "Inicio" vía TPP-95.
- [PM] Fase 5 desbloqueada: Mati hace el archive desde Xcode para subir primer build a TestFlight. Siguiente paso: invitar a Agustina con household sharing (TPP-49).

## Handoffs pendientes
- [x] [product-manager] → [frontend-engineer]: implementar Ticket "Modo Borrador Web" — ver `docs/draft-mode-plan.md` §4 — completado en rama feat/draft-mode
- [x] [product-manager] → [ios-dev]: implementar Ticket "Modo Borrador iOS" — ver `docs/draft-mode-plan.md` §5 (completado 2026-04-27)
- [ ] [setup] → [backend-designer]: iniciar Firebase setup (Fase 1)
- [ ] [backend-designer] → [security-reviewer]: auditar Security Rules antes de deploy
- [ ] [backend-designer] → [frontend-engineer]: API contracts listos para Fase 2
- [x] [product-manager] → [frontend-engineer]: implementar Ticket 1 iOS — eliminar viaje
- [x] [frontend-engineer] → [frontend-engineer]: implementar Ticket 2 iOS — editar fechas y recalcular dias
- [x] [frontend-engineer] → [frontend-engineer]: implementar Ticket 9 iOS — detalle desde Catalogo
- [x] [frontend-engineer] → [frontend-engineer]: implementar Ticket 8 iOS — monedas con simbolos
- [ ] [frontend-engineer] → [backend-designer]: definir estrategia para ciudades reutilizables sin duplicados
- [ ] [product-manager] → [ios-dev]: implementar gap #63 — agregar selector IDA/VUELTA y estructura `legs[]` a ManualFlightForm iOS (ticket en .project/state.md)

## Decisiones PM — 2026-04-27 (gap flight leg type)
- [PM] Gap P1 identificado y documentado en feature-parity.md (ítem #63): ManualFlightForm iOS no tiene secciones IDA/VUELTA ni estructura `legs[]`. Web FlightForm sí las tiene via `FlightLeg.direction`. Es inconsistencia de schema Firestore entre plataformas — un vuelo cargado desde iOS no tendrá campo `legs`, lo que rompería la renderización en web. Ticket ejecutable escrito. Handoff a @ios-dev.

## Política de feature parity (establecida 2026-04-27)
iOS y desktop deben mantener las mismas funcionalidades. Antes de cerrar un feature en una plataforma, marcarlo pendiente en la otra. El feature-parity audit completo está en `.project/feature-parity.md`.

**Estado al 2026-04-27:** Costos — paridad alcanzada. CostsView iOS ahora tiene swipe "Marcar como pagado" por item (CategoryBreakdownSheet) y quick-action "Todo pagado" por categoría (CostsView). Archivos: TripDetailViewModel.swift, CategoryBreakdownSheet.swift, CostsView.swift.

## Gaps iOS identificados (auditoría 2026-04-26)

### P1 — Alta prioridad (bloquean la experiencia del primer viaje real)
1. **Countdown granular en hero card**: iOS muestra "En 45 días" plano. Web tiene 5 niveles del PRD (>30d / 7-30d / 2-7d / mañana / horas). Falta la lógica de nivel + animación "pulsante" cuando es 1 día.
2. **Crear viaje: elección draft/confirmed**: Web presenta un chooser de 2 opciones antes de pedir fechas. iOS va directo al form sin el paso de elección y siempre crea en `.draft`. La distinción visual y el flujo de 2 pasos falta.
3. **TripEditSheet ausente en iOS**: En web, el botón `MoreHorizontal` abre `TripForm` con campos nombre + fechas + cover/tema + eliminar. En iOS, `showTripEdit` llama a `TripEditSheet(trip:)` pero ese archivo no existe (`ios/TripPlannerPro/Features/Editing/TripEditSheet.swift` da 404). El botón "slider.horizontal.3" de la navbar no funciona.
4. **CityEditSheet ausente en iOS**: Web tiene `CityForm` completo (nombre, color, timezone, lat/lng, días). El ItemsView de iOS no tiene subtab "Ciudades" ni permite crear/editar ciudades desde la app (solo vuelos, hoteles, transportes, gastos).

### P2 — Media prioridad (importante para paridad completa)
5. **DraftDatePicker visual con grillas de meses**: Web tiene un calendario interactivo de 2 meses con strip de rango seleccionable. iOS tiene DatePickers nativos (funcionales, pero experiencia diferente). No es un blocker para el MVP pero la UX de web es más rica.
6. **Settings: moneda preferida de display**: Web no tiene este setting aún (también ausente), pero el PRD lo define en Módulo G. iOS tampoco lo tiene.
7. **Settings: export de data JSON**: PRD Módulo G lo requiere. Ausente en ambas plataformas.
8. **Stats hero card — "demo de viaje" (web)**: Web tiene botón "Ver demo" en empty state. iOS tiene empty state sin ese botón. Nice-to-have para testing personal.

### P3 — Baja prioridad / ya en backlog
9. **Cover image/Unsplash en iOS**: TripEditSheet (cuando exista) debería ofrecer el picker de temas + Unsplash como en web. Bloqueado por P1-item 3.
10. **Countdown "Día X de tu viaje" en navegación**: Web muestra "Día X de tu viaje" en el title del active trip en el greeting del dashboard. iOS lo hace en `greeting` del ViewModel (presente) pero el title del hero card no usa la misma jerarquía visual que web.

## Open questions para el usuario
- [Modo Borrador] ¿Un borrador puede tener cero fechas (start_date = "")? El plan lo asume como sí. Confirmar antes de implementar.
- [Modo Borrador] ¿Los borradores se excluyen del tab "Todos"? El plan dice sí — confirmar.
- [Modo Borrador] ¿El botón "Confirmar viaje" solo en el detalle del viaje, o también en la card del Dashboard?
- ¿Ya tenés proyecto en Firebase Console creado? (si sí, agregar URL al CLAUDE.md)
- ¿Arrancamos wireframes de Claude Design antes o después de Firebase setup?

## Links del proyecto
- Notion Hub: https://www.notion.so/3474678bb4428126b6ccd9817b029b0c
- Firebase Console: (pendiente)
- Vercel: (pendiente)
- GitHub repo: (pendiente — crear con `gh repo create trip-planner-pro-2 --private`)
