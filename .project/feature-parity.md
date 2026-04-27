# Feature Parity — Web vs iOS
_Generado: 2026-04-27 | Auditoría manual del código fuente_

---

## Tabla comparativa

| # | Feature | Web | iOS | Gap | Prioridad |
|---|---------|-----|-----|-----|-----------|
| **DASHBOARD** |
| 1 | Greeting contextual (hora del día) | Si — "Buenas tardes, Mati" en 2 líneas | Si — mismo comportamiento | Ninguno | — |
| 2 | Greeting activo "Día X · nombre viaje" | Si — desktop muestra "Día 2 · Europa" con acento dorado | Si — DashboardViewModel lo calcula, pero como título de greeting solo, no en el hero card con el mismo peso visual | Diferencia visual menor | P3 |
| 3 | Stats header "X viajes · Y ciudades" | Si — solo desktop, alineado a la derecha | Si — bajo el nombre, en monotype | Ninguno | — |
| 4 | Hero card — viaje activo / próximo | Si — banner horizontal con left border accent | Si — TripHeroCard grande con gradiente y cover | Diferencia de layout (intencional, adaptada a mobile) | — |
| 5 | **Countdown granular en hero card** | Si — "En X días" (texto plano, sin niveles) | Si — 5 niveles implementados: horas/minutos cuando es hoy, "mañana", días, etc. | **Web es el que falta niveles**, iOS ya lo tiene mejor | — |
| 6 | Stats del hero — vuelos / ciudades / días | Si — BannerPills solo desktop | Si — StatIconRow con iconos | Web no tiene esa info en mobile, iOS sí | Ventaja iOS |
| 7 | Progress ring en hero | No — web usa barra linear de pago | Si — ProgressRing circular mostrando avance temporal | Web tiene anillo distinto (pago %) en TripDetail desktop | Diferencia intencional |
| 8 | Total USD en hero | Si | Si | Ninguno | — |
| 9 | **Empty state con botón "Ver demo"** | Si — dos botones: "Nuevo viaje" + "Ver demo" | Si — botón "Ver demo" en emptyState → createDemoTrip() (Madrid+Barcelona, 2 vuelos, 1 hotel) | Ninguno | — |
| 10 | Filtros de viajes (tabs) | Si — Todos / Futuros / En curso / Pasados / Borradores | Si — mismos 5 filtros como pills | Ninguno | — |
| 11 | Grid de viajes 2 columnas en desktop | Si — `md:grid-cols-2` | N/A (nativo iOS, sin equivalente) | — | — |
| 12 | "Confirmar viaje" inline en lista | Si — botón dorado debajo de cada draft card | Si — DraftConfirmButton en TripsListSection | Ninguno | — |
| 13 | Thumbnail con tema/emoji en la lista | Si — TripCard con tema | Si — TripRowCard con TripTheme | Ninguno | — |
| 14 | Badge de estado (BORRADOR/EN CURSO/etc.) | Si | Si | Ninguno | — |
| 15 | Offline banner | No | Si — "Sin conexión · datos guardados" con isOffline | iOS más completo | — |
| 16 | Loading skeleton | Si — 4 divs skeleton | Si — redacted placeholder | Ninguno | — |
| **CREAR VIAJE** |
| 17 | Chooser Confirmado / Borrador (paso 0) | Si — dos cards en grid 2 col | Si — TripTypeCard, mismo flujo de 2 pasos | Ninguno | — |
| 18 | Formulario nombre + fechas | Si | Si | Ninguno | — |
| 19 | Validación fecha fin > inicio | Si — mensaje de error | Si — `in: startDate...` en DatePicker | Ninguno | — |
| 20 | Fechas marcadas como "tentativas" en borrador | Si — label "Fecha de inicio tentativa" | Si — label "Fechas (opcional)" | Diferencia menor de copy | — |
| **TRIP DETAIL — GENERAL** |
| 21 | Barra de nav con nombre + fechas centrados | Si — mobile header con `MoreHorizontal` | Si — customNavBar con slider.horizontal.3 | Ninguno | — |
| 22 | **TripEditSheet (editar nombre / fechas / tema)** | Si — TripForm completo con cover/tema | Si — TripEditSheet existe en TripCityEditSheets.swift y ThemePickerView.swift | **El archivo existe**, ya no da 404. Gap cerrado. | — |
| 23 | Compact hero strip (progreso / USD / ciudades / vuelos) | Si — mobile only | Si — compactHeroStrip | Ninguno | — |
| 24 | Desktop TripHeroCard (% pagado / vuelos / ciudades / días) | Si — solo en `hidden md:block` | N/A (iOS es siempre mobile) | — | — |
| 25 | Draft banner con DatePickers | Si — DraftDatePicker con grillas de dos meses | Si — draftBanner con DatePicker nativo | **Diferencia de UX**: web tiene calendario visual interactivo de 2 meses; iOS tiene DatePickers nativos (funcionales pero menos visual) | P2 |
| 26 | Tabs Calendario / Lista / Items / Costos | Si — 4 tabs con pill animado | Si — 4 tabs con pill animado | Ninguno | — |
| 27 | FAB sparkles para AI parse | Si — en BottomNav (mobile) y TopNav | Si — aiSparkleButton bottom-right overlay | Ninguno | — |
| **CALENDARIO** |
| 28 | Grid 7 columnas siempre | Si — `grid-cols-7` hardcoded | Si — LazyVGrid columns 7 | Ninguno | — |
| 29 | Day detail sheet / panel | Si — bottom sheet mobile, panel lateral desktop | Si — sheet nativo iOS | Ninguno | — |
| 30 | Badges de vuelos / hoteles / transportes en celda | Si | Si | Ninguno | — |
| 31 | Long press para asignar ciudad a día | Si — LONG_PRESS_MS = 380ms con portal | Si — LongPressGesture + DragGesture → CityRangeAssignSheet (range multi-day, haptics) | Ninguno | — |
| 32 | Editar item desde calendario | Si — abre FlightForm/HotelForm/TransportForm inline | Si — abre SelectedItem sheet | Ninguno | — |
| 33 | City flag / country code en celdas | Si — detectCountryCode + countryFlag | Si — flagEmoji(for:) en DayCell, usado en singleCityBlock y splitCityBlock | Ninguno | — |
| **LISTA (ListView)** |
| 34 | Vista cronológica de todos los items | Si | Si | Ninguno | — |
| **ITEMS VIEW** |
| 35 | Subtabs Vuelos / Hoteles / Transportes | Si — con pill animado | Si — iOS tiene lista unificada por categoría (sin subtabs de navegación horizontal como web) | Diferencia estructural leve | — |
| 36 | **Subtab Ciudades en ItemsView** | Si — 4to subtab "Ciudades" con CityForm | Si — CitiesBlock presente en ItemsView.swift | Ninguno (iOS tiene bloque de ciudades, web tiene subtab) | — |
| 37 | Botón inline "+ Vuelo / + Hotel / etc." | Si — botón dashed por subtab activo | Si — FloatingAdd FAB y AddItemChooser | Diferencia de UI, funcionalidad igual | — |
| 38 | Crear ciudad desde ItemsView | Si — CityForm en subtab Ciudades | Si — CreateCitySheet con catálogo de ciudades anteriores | iOS tiene feature extra: catálogo de ciudades anteriores | Ventaja iOS |
| 39 | Editar / borrar ciudad | Si — CityForm con existing | Si — CityEditSheet con delete | Ninguno | — |
| **COSTOS** |
| 40 | Tabla multi-moneda (Total / Pagado / Pendiente) | Si — tabla con columnas por moneda | Si — byCurrency breakdown | Diferencia de presentación: web es tabla editable in-line; iOS es breakdown visual por categoría | P2 |
| 41 | **Edición inline de precio y pagado** | Si — click en celda para editar total/pagado | Si — tap categoría → CategoryBreakdownSheet → tap item → EditSheet con precio/pagado | Diferencia de UX: 2 taps vs 1 click. Funcionalidad equivalente. | — |
| 42 | FX rate controls (lock/unlock tasa) | Si — RateControl con input + botón bloquear | Si — fxRatesSection en CostsView: tasa implícita por moneda, editable, total proyectado (implementado) | Ninguno | — |
| 43 | Agregar gasto ad-hoc desde Costos | Si — inline form debajo de la tabla | Si — botón "+ Agregar gasto" siempre visible en CostsView → ManualFormSheet(.expense) | Ninguno | — |
| 44 | "Marcar como pagado" quick-action en row | Si — botón hover Check por item | Si — swipe trailing en CategoryBreakdownSheet → "Pagado" con fullSwipe | Diferencia de UX: hover vs swipe. Funcionalidad equivalente. | — |
| 45 | Breakdown por categoría con % visual | No en web (solo tabla) | Si — CostsView con breakdown por categoría + barras | Ventaja iOS | — |
| 46 | Total / Pagado / Pendiente por categoría | No en web tab costos | Si | Ventaja iOS | — |
| **AI PARSE MODAL** |
| 47 | Modo texto (chat-like) | Si | Si | Ninguno | — |
| 48 | Modo archivo/PDF | Si | Si — share extension stub | Ninguno | — |
| 49 | Preview con confidence scores (verde/naranja/rojo) | Si | Si — ConfidenceBadge con 3 niveles en ParsedItemCard (verde ≥85%, naranja ≥60%, rojo) | Ninguno | — |
| 50 | Editar item antes de confirmar | Si | Si — ParsedItemEditSheet accesible vía ícono pencil en cada ParsedItemCard | Ninguno | — |
| 51 | Manual type picker (Vuelo / Hotel / Traslado / Ciudad) | Si — 6 tipos | Si — 4 tipos: Vuelo / Hotel / Traslado / Ciudad (implementado) | Ninguno | — |
| **FORMULARIO DE VUELO** |
| 63 | **Tramos IDA / VUELTA en formulario manual de vuelo** | Si — FlightForm web tiene dos secciones explícitas "IDA" y "VUELTA" (LegSection outbound/inbound), con `FlightLeg.direction` guardado en Firestore bajo campo `legs[]` | **No** — ManualFlightForm iOS tiene un único formulario flat (origin → dest, sin diferenciación de tramo). No existe el concepto de `direction` ni secciones IDA/VUELTA | **Gap P1 confirmado** — iOS no guarda `direction` ni estructura `legs[]`. Inconsistencia de schema entre plataformas. | P1 |
| **CATÁLOGO (cross-trip)** |
| 52 | Tab Vuelos / Hoteles / Transportes / Ciudades | Si — 4 tabs | Si — CatalogView con tabs | Ninguno | — |
| 53 | Búsqueda full-text | Si | Si | Ninguno | — |
| 54 | Filtro por tipo de transporte | Si — TransportFilter pills | Si — TransportFilterChip pills en TransportsTab de CatalogView (tren/bus/ferry/auto/otro) | Ninguno | — |
| 55 | **Ciudades en Catálogo con configuración global** | Si — CitiesCatalog con color/country_code por ciudad editable globalmente | Si — tab "Ciudades" en CatalogView con CityCatalogCard + CityEditSheet (implementado) | Ninguno | — |
| **SETTINGS** |
| 56 | AI provider (Claude / Gemini) | Si — toggle pill | Si — Picker con menu | Ninguno | — |
| 57 | **Moneda preferida (USD/EUR/ARS/BRL)** | Si — 4 pills | Si — CurrencyPicker con @AppStorage("preferredCurrency") en SettingsView (implementado) | Ninguno | — |
| 58 | Perfil (avatar + email) | Si | Si | Ninguno | — |
| 59 | Cerrar sesión | Si | Si | Ninguno | — |
| 60 | Copy UID | No | Si | Ventaja iOS (útil para debug) | — |
| 61 | Version / GitHub link | Si | Si — sección "Sobre la app" en SettingsView con versión de bundle + link GitHub (implementado) | Ninguno | — |
| 62 | **Export JSON** | No en ninguna plataforma | Si — botón share en customNavBar → JSONEncoder → ShareSheet con UIActivityViewController | Ventaja iOS | — |
| 63 | **ManualFlightForm multi-tramo (IDA / VUELTA / escalas)** | Si — FlightForm.tsx con legs[] array, direction outbound/inbound, secciones IDA/VUELTA, "+ escala" | Si — ManualFlightForm refactorizado con LegFormState, LegCard, secciones IDA/VUELTA. Flight.legs guardado en Firestore | Ninguno (cerrado) | — |

---

## Gaps consolidados por prioridad

### P1 — Alta prioridad

| ID | Gap | Plataforma afectada |
|----|-----|---------------------|
| 63 | ManualFlightForm iOS no tiene secciones IDA / VUELTA ni guarda `legs[]` con `direction`. Web FlightForm sí lo hace via `LegSection outbound/inbound`. Inconsistencia de schema Firestore entre plataformas. | iOS |

### P2 — Media prioridad

| ID | Gap | Plataforma afectada |
|----|-----|---------------------|
| 25 | DraftDatePicker visual (2 meses con strip de rango) — iOS tiene DatePicker nativo funcional | iOS |
| 40 | CostsView presentación: web tabla editable multi-moneda vs iOS breakdown por categoría (2 taps) | iOS |

_Todos los gaps P2 relevantes están resueltos. #25 y #40 son diferencias de UX intencionales (iOS vs web nativo)._

### P3 — Baja prioridad

_Todos los gaps P3 están resueltos._

---

## Correcciones respecto a la auditoría previa (.project/state.md)

Los "Gaps iOS identificados" en state.md (sección 2026-04-26) registran 4 items P1 que ya **no son gaps**:

| Item anterior | Estado real |
|---------------|-------------|
| "TripEditSheet ausente — da 404" | TripEditSheet existe en `TripCityEditSheets.swift` junto con CityEditSheet y CreateCitySheet. El slider.horizontal.3 button funciona. |
| "CityEditSheet ausente" | CityEditSheet existe. CityCompactRow en ItemsView lo expone. CreateCitySheet tiene catálogo de ciudades anteriores (feature extra vs web). |
| "Crear viaje: elección draft/confirmed ausente" | CreateTripSheet tiene el chooser de 2 pasos (typeChooserContent + formContent) correctamente implementado. |
| "Countdown granular ausente en iOS" | iOS implementa 5 niveles en `countdownText` incluyendo horas/minutos, "Empieza hoy", "En 1 día", "En X días". Web solo muestra "En X días" plano. |

---

## Recomendaciones de implementación en orden

1. **[P2] FX rate controls en CostsView iOS**: agregar sección de tasas con input editable para monedas no-USD. Permite al usuario fijar el tipo de cambio cuando la API no lo tiene actualizado.

2. **[P2] Catálogo de ciudades con config global**: implementar tab en CatalogView con ciudades cross-trip, color y country_code editables. Requiere `collectionGroup("cities")` query — ADR 003 documenta la estrategia.

3. **[P3] "Ver demo" en empty state iOS**: conectar con un método `createDemoTrip` en FirestoreClient equivalente al web.

4. **[P3] Bandera de país en celdas del calendario**: agregar `countryFlag` helper y mostrar emoji de bandera según `countryCode` en `DayCell`.
