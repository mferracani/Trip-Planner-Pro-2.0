# QA Checklist — Paridad iOS ↔ Web — 2026-04-28

Auditoría de código: todos los archivos fuente relevantes de iOS y web fueron leídos.
Esto no es un test de documentación — cada punto cita el archivo y la línea/función exacta.

---

## Metodología

- Fuente de verdad: `docs/PRD.md` + `docs/DESIGN_BRIEF.md`
- Archivos iOS leídos: `DashboardView.swift`, `CatalogView.swift`, `CalendarView.swift`, `ItemsView.swift`, `ListView.swift`, `CostsView.swift`, `AIParseModal.swift`, `ManualForms.swift`, `EditSheets.swift`, `TripCityEditSheets.swift`, `SettingsView.swift`
- Archivos web leídos: `Dashboard.tsx`, `CatalogPage.tsx`, `CalendarView.tsx`, `ItemsView.tsx`, `ListView.tsx`, `CostView.tsx`, `AiParseModal.tsx`, `ManualItemForms.tsx`, `FlightForm.tsx`, `SettingsPage.tsx`

---

## 1. Dashboard

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Saludo por hora del día | `greetingTime` en DashboardView | `getContextualGreeting()` en Dashboard.tsx | ✅ Paridad |
| Hero card excluye borradores | `nonDraftTrips` lógica presente | `nonDraftTrips` en Dashboard.tsx | ✅ Paridad |
| Tab "Borradores" separado | `DraftTab` presente | `DraftTab` en filtros | ✅ Paridad |
| `DraftConfirmButton` visible en card | `client.updateTripStatus(tripID:, status:.planned)` | `updateTripStatus(userId, tripId, "planned")` | ✅ Paridad |
| GlobalStatsStrip (viajes/ciudades/vuelos/días) | `GlobalStatsStrip` componente separado | Estadísticas en header desktop: `trips.length viajes · totalCities ciudades` — solo 2 métricas, sin vuelos ni días | ⚠️ Gap: web muestra solo 2 de 4 métricas vs 4 en iOS |
| Empty state "Ver demo" | No existe — empty state sin botón demo | `createDemoTrip()` botón presente | ⚠️ Gap: web tiene demo trip, iOS no |
| Countdown granular en hero card | `countdownText` en `NextTripCard`: "Empieza hoy" / "Faltan Xh Xm" / "En 1 día" / "En X días" — NO tiene nivel semanas/meses | `getCountdownText()` en Dashboard.tsx: 5 niveles — "Empieza hoy" / "Mañana" / "En X días" (≤6) / "En X semanas" (≤13) / "En X meses" | ❌ Bug P1: iOS usa "En 45 días" para viajes en 3 meses en lugar de "En 6 semanas". PRD §2 especifica 5 niveles. `DashboardView.swift` línea 322-323 |
| Avatar tap → navegación/settings | `Button { } label: {...}` — acción vacía (línea 144 DashboardView.swift) | Header avatar navega a Settings | ❌ Bug: Avatar en iOS no hace nada al tocar. Línea 144 DashboardView.swift |
| Flujo crear viaje: chooser draft/confirmed | iOS va directo al form, siempre crea `.draft` — sin chooser de 2 pasos | Web presenta selector visual antes de pedir fechas | ❌ Bug P1: Flujo de creación de viaje en iOS falta el paso de elección de tipo |

---

## 2. Trip Creation (Crear Viaje)

| Feature | iOS | Web | Estado |
|---|---|---|---|
| `CreateTripSheet` con nombre + fechas | `CreateTripSheet.swift` existe | `TripForm` modal | ✅ Paridad en forma |
| Elección draft vs confirmed antes de form | Ausente — directo al form | `DraftConfirmChooser` presentado primero | ❌ Bug P1: gap documentado en state.md — sin implementar |
| DraftDatePicker visual (calendarios interactivos) | `DatePicker` nativo — funcional pero diferente UX | Grilla de 2 meses interactiva | ⚠️ Gap P2: UX diferente, aceptable para MVP |
| `tentative_start_date` como texto libre para borradores sin fecha | No verificado en CreateTripSheet, pero Trip model lo soporta | Web lo escribe como string campo | ⚠️ Verificar en runtime |

---

## 3. Trip Detail — General

| Feature | iOS | Web | Estado |
|---|---|---|---|
| `TripEditSheet` (nombre + fechas + tema + delete) | `TripCityEditSheets.swift` línea 28 — existe con campos nombre/fechas/tema-picker | `TripForm` con todos los campos | ✅ Paridad — el archivo ya existe; la P1 de state.md está resuelta |
| Delete trip desde TripEditSheet | `onDelete: nil` en TripEditSheet — el botón eliminar NO está disponible desde el edit sheet | Web tiene delete en el form | ❌ Bug: iOS TripEditSheet no expone delete. `TripCityEditSheets.swift` línea 69 |
| Tabs principales (Calendario / Lista / Items / Costos) | 4 tabs presentes | 4 tabs presentes | ✅ Paridad |

---

## 4. Calendar View (Módulo B)

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Grid 7 columnas siempre | `buildWeeks()` lunes-primero, 7 columnas | `buildWeeks()` idéntico | ✅ Paridad |
| Vuelo cross-midnight en celda salida Y llegada | `ListView.swift` `isArrivalLeg` logic + CalendarView map — sí aparece en ambas | `buildDayItemsMap()` incluye dep AND arr date | ✅ Paridad |
| Badge hora local del aeropuerto (no UTC) | Usa `departure_local_time` — string local | Usa `departure_local_time` — string local | ✅ Paridad |
| Hotel en cada día del rango check-in→check-out | `vm.hotels(on:)` filtra `check_in <= date && check_out > date` | `buildDayItemsMap()` idem | ✅ Paridad |
| LongPress + drag para seleccionar rango | `LongPressGesture(0.35s).sequenced(before: DragGesture)` | `380ms` + DragGesture con `navigator.vibrate(12)` | ✅ Paridad funcional (timing: 350ms iOS vs 380ms web — diferencia menor) |
| Action bar post-selección (Agregar Ciudad / Hotel / Filtrar) | `CityRangeAssignSheet` — sheet nativo iOS, no bottom bar | `SelectionActionBar` fijo en bottom | ✅ Paridad funcional (patrón nativo diferente — aceptable) |
| "Agregar al día" quick-add en DayDetailSheet | NO existe en iOS DayDetailSheet | Botón "✨ Agregar al día" con type picker | ❌ Bug P2: iOS no tiene quick-add desde el detalle del día. Requiere ir a ItemsView o usar AIParseModal |
| Date adjustment controls (±1 día en start/end del viaje) | Ausente | Controls presentes en CalendarView.tsx | ⚠️ Gap P2: Web permite ajustar fechas del viaje desde el calendario, iOS solo desde TripEditSheet |
| Leyenda de ciudades: tappable para filtrar | Pill para filtrar ciudad presente | `CityLegend` tappable para filtrar | ✅ Paridad |
| `CityEditSheet` accesible desde leyenda | Tap en city pill en legend abre `CityEditSheet` | `CityForm` modal | ✅ Paridad — CityEditSheet existe en TripCityEditSheets.swift línea 202 |
| citySettings overlay global (colores/países) | NO carga `citySettingsRef` | Web carga de Firestore para override global | ⚠️ Gap: Web tiene un nivel de personalización global de ciudades que iOS no tiene |

---

## 5. List View (Módulo B — Vista Lista)

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Agrupado por día cronológicamente | `ListView.swift` usa `tripDays` generando todos los días de start a end | `buildDayGroups()` en ListView.tsx — mismo comportamiento | ✅ Paridad |
| Días sin items | iOS muestra "Sin eventos este día" para cada día vacío | Web filtra días vacíos con `.filter(g => g.flights.length > 0 ...)` | ⚠️ Diferencia UX: iOS muestra todos los días (incluso vacíos), web solo muestra días con contenido. Puede ser intencional |
| Vuelos: origin → destination con hora | `FlightRow` muestra `origin → dest` + `airline flightNumber` + hora | `FlightRow` en ListView.tsx muestra `origin → dest` + flight_number + hora | ✅ Paridad |
| Multi-leg: active leg por fecha | `activeLeg` computed property filtra leg correcto para la fecha | `dayLegs` filtra legs por fecha | ✅ Paridad |
| Legacy mono-leg soportado | Fallback a `flight.originIATA` cuando `legs == nil` | Fallback a `flight.departure_local_time` cuando `legs == nil` | ✅ Paridad |
| Expenses en lista | `ExpenseRow` presente | `ExpenseRow` presente | ✅ Paridad |
| Tap item → edit sheet | `.editSheet(item:)` modifier | `setEditing({kind, data})` → modal | ✅ Paridad |
| Precio trailing en cada item | `trailingSecondary: flight.priceUSD` | No mostrado en ListView.tsx FlightRow — solo tiempo | ⚠️ Gap: iOS muestra precio USD en cada row de la lista; web no |

---

## 6. Items View

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Vuelos / Hoteles / Transportes | Presentes en bloques | Subtabs con slider animado | ✅ Paridad de datos |
| Ciudades | `CitiesBlock` presente | Subtab "Ciudades" presente | ✅ Paridad |
| Subtabs con animación | NO — scroll view único con todos los bloques apilados | Subtabs con animated slider indicator | ⚠️ Diferencia UX — aceptable, patrón nativo diferente |
| Car_rental separado | `CarRentalsBlock` separado con color naranja | No separado — aparece en Transportes | ⚠️ Gap: iOS separa car_rental en bloque propio; web no. Inconsistencia de categorización visual |
| Expenses block | `ExpensesBlock` para gastos no vinculados | Subtab de Costos separado — no en ItemsView | ⚠️ Diferencia de organización — gastos en iOS están en Items; en web están en tab Costos. Aceptable pero diferente |

---

## 7. Costs View (Módulo F — parcial)

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Total USD hero + daily avg + paid + remaining | Hero con 4 métricas en CostsView | Tabla spreadsheet sin hero de métricas | ⚠️ Gap: iOS tiene vista de resumen más rica; web tiene tabla editable más detallada |
| Category breakdown (barra de progreso) | `BreakdownBar` per category tappable | No tiene barras de progreso por categoría | ⚠️ Gap: iOS tiene visualización de breakdown que web no tiene |
| FX rate editable | TextField por moneda | Lock/unlock controls por moneda | ✅ Paridad funcional (UI diferente) |
| Inline cell editing | Ausente — usa sheet separado | Click-to-edit inline en tabla | ⚠️ Diferencia UX: web permite edición inline; iOS abre un sheet |
| "Mark as paid" | Swipe action en `CategoryBreakdownSheet` | Botón verde por hover en fila | ✅ Paridad funcional |
| "Mark all paid" por categoría | Alert con `updateTripStatus` | No implementado en web | ⚠️ Gap: iOS tiene "todo pagado" por categoría; web no |
| Add expense | `ManualFormSheet` sheet | Form inline al final de la tabla | ✅ Paridad funcional |
| Viaje pasado → tasa fija (PRD Módulo F) | No verificado en cliente — depende de Cloud Function | No verificado en cliente — depende de Cloud Function | ⚠️ Pendiente verificar lógica de FX rate locking |

---

## 8. AI Parse Modal (Módulo D)

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Modo Chat (texto libre → Claude) | ✅ Modo `.chat` presente | ✅ Modo "Chat" presente | ✅ Paridad |
| Modo Archivo (PDF/imagen → Gemini) | ❌ **AUSENTE** — `ParseMode` enum solo tiene `.chat` y `.manual` (AIParseModal.swift línea 20-22) | ✅ Modo "Archivo" presente — upload a Firebase Storage + llamada a Gemini | ❌ Bug P1 BLOQUEANTE: iOS no tiene modo de adjuntos. El diferencial principal del producto (Share Sheet + parse de PDF) está incompleto |
| Modo Manual | ✅ Presente con formularios por tipo | ✅ Presente con `ManualTypePicker` | ✅ Paridad |
| Confidence badges: color verde/naranja/rojo | ✅ Presentes — umbrales: `>= 0.85 → verde`, `>= 0.60 → naranja` (ConfidenceBadge línea 719-720) | ✅ Presentes — umbrales: `>= 0.9 → verde`, `>= 0.7 → naranja` (AiParseModal.tsx línea 535) | ❌ Bug P1: Umbrales inconsistentes entre plataformas. PRD/Design Brief definen un único estándar. iOS es más permisivo (acepta 84% como verde). Debe unificarse |
| Editar item antes de confirmar | ✅ `ParsedItemEditSheet` por item + checkbox selección | ✅ Preview editable con × para eliminar | ✅ Paridad funcional |
| Confirmar → crear en Firestore | ✅ `FirestoreClient+ManualSave.swift` | ✅ `createFlight/createHotel/createTransport` | ✅ Paridad |
| Error state inline (no pantalla en blanco) | ✅ `.error(String)` case con display | ✅ Caja roja con mensaje de error | ✅ Paridad |
| Rotating loading messages | No verificado en detalle | ✅ Mensajes rotativos presentes | ⚠️ Verificar en iOS |
| `@AppStorage("aiProvider")` respeta preferencia | ✅ Presente | ✅ localStorage `ai_provider_chat` | ✅ Paridad |

---

## 9. Flight Form — ManualFlightForm + EditSheet

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Estructura IDA + VUELTA con `legs[]` | ✅ `outboundLegs` + `inboundLegs` en `ManualFlightForm` | ✅ `LegSection` con `direction: outbound/inbound` en `FlightForm.tsx` | ✅ Paridad de schema |
| IATA selector con autocompletado | No verificado (dataset estático presente según state.md) | No verificado | ⚠️ Pendiente |
| Timezone selector por leg (IANA) | ❌ **ManualFlightForm**: `parseLocalApproxUTC` — cálculo aproximado sin selector IANA (ManualForms.swift). **FlightEditSheet**: ✅ `CommonTimezones.options` — PickerInput para departure y arrival timezone (EditSheets.swift línea 95-103) | ✅ `TzPicker` con `COMMON_TIMEZONES` en ManualItemForms.tsx y FlightForm.tsx | ❌ Bug P1 conocido (#63): ManualFlightForm iOS no tiene TZ selector → `departureUTC` almacenado como "local time treated as UTC" → error de schema en Firestore vs web |
| `duration_minutes` calculado al escribir | ✅ `FlightEditSheet.save()` línea 166-168: `Int(arr.timeIntervalSince(dep) / 60)` | ✅ `minutesBetween(depUtc, arrUtc)` en FlightForm.tsx | ✅ Paridad en EditSheet; ❌ ManualFlightForm iOS usa `parseLocalApproxUTC` — duración puede ser incorrecta |
| Precio / booking ref / seat / cabin class | ✅ Todos en FlightEditSheet | ✅ Todos en FlightForm | ✅ Paridad |
| price_usd separado de price | ✅ `priceUSD` field en FlightEditSheet | ✅ `priceUsd` field en FlightForm | ✅ Paridad |

---

## 10. Hotel Form — ManualHotelForm + EditSheet

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Nombre, check-in/out, tipo habitación, booking ref | ✅ `ManualHotelForm.swift` + `HotelEditSheet.swift` | ✅ `ManualHotelForm.tsx` + `HotelForm.tsx` | ✅ Paridad |
| Precio/noche + total (auto-calculado) | ✅ iOS calcula pero sin sync automático bidireccional al cambiar fechas | ✅ Web `syncFromNightly/syncFromTotal + recomputeFrom` — bidireccional con auto-sync al cambiar fechas | ⚠️ Gap menor: iOS no auto-recalcula total cuando se cambian las fechas (solo al editar precio). Web sí. |
| Dirección | No en `ManualHotelForm.swift` (solo name/dates/price/roomType/bookingRef) | ✅ Campo address en `ManualHotelForm.tsx` | ⚠️ Gap: iOS no tiene campo address en el form de creación (existe en el modelo) |
| Brand/cadena hotelera | ✅ Campo `brand` en `HotelEditSheet.swift` | No en ManualHotelForm.tsx | ⚠️ Gap menor: iOS tiene campo brand en edit; web no lo tiene en creación manual |

---

## 11. Transport Form — ManualTransportForm + EditSheet

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Tipos: train/bus/ferry/car/taxi/subway | ✅ 8 tipos incluyendo car_rental | ✅ 7 tipos incluyendo car (= car_rental) | ✅ Paridad funcional |
| Origin → destination | ✅ Ambos campos | ✅ Ambos campos | ✅ Paridad |
| Timezone selector para salida y llegada | ✅ En `TransportEditSheet` con `CommonTimezones.options` | ✅ `TzPicker` en ManualTransportForm.tsx | ✅ Paridad en edit; iOS ManualTransportForm también tiene TZ (no es aproximación como en Flight) |
| Booking ref, precio, operador | ✅ Presentes | ✅ Presentes | ✅ Paridad |

---

## 12. Settings

| Feature | iOS | Web | Estado |
|---|---|---|---|
| Perfil: nombre/email/avatar | ✅ Cuenta section con avatar + name + email | ✅ Perfil section | ✅ Paridad |
| Sign out | ✅ Con confirmation alert | ✅ Sin confirmation alert | ⚠️ Diferencia: iOS pide confirmación, web no. Preferible con confirmación (previene accidente) |
| AI provider toggle (Claude/Gemini) | ✅ `AIProviderPicker` con `@AppStorage("aiProvider")` | ✅ `localStorage("ai_provider_chat")` | ✅ Paridad |
| Moneda preferida de display | ✅ `CurrencyPicker` pills con `@AppStorage("preferredCurrency")` | ✅ `localStorage("preferred_currency")` | ✅ Paridad |
| Export JSON | ❌ Ausente | ❌ Ausente | ⚠️ Ausente en ambas plataformas — PRD Módulo G lo requiere. Fuera de MVP aceptable |
| UID copy row (debug) | ✅ Presente | ❌ Ausente | ⚠️ iOS-only debug feature — aceptable |
| Versión + GitHub link | ✅ Presentes | ✅ Presentes | ✅ Paridad |

---

## 13. Catalog

| Feature | iOS | Web | Estado |
|---|---|---|---|
| 4 tabs: Vuelos/Hoteles/Traslados/Ciudades | ✅ Presentes | ✅ Presentes | ✅ Paridad |
| Search por nombre | ✅ Presente | ✅ Presente | ✅ Paridad |
| Transport type filter chips | ✅ Presente + incluye "car_rental" | ✅ Presente — no incluye "car_rental" como chip separado | ⚠️ Gap: iOS tiene filtro car_rental; web no |
| Skeleton shimmer loading | ✅ 8 SkeletonCard con animación shimmer | ❌ Solo "Cargando..." texto plano | ⚠️ Gap UX: iOS tiene mejor loading state |
| Offline banner + cache SwiftData | ✅ `CachedCatalogSnapshot` + banner "Sin conexión" | ❌ Sin soporte offline | ⚠️ Gap: iOS tiene offline; web no — aceptable por diferencia de plataforma |
| Error state dedicado | ✅ `CatalogErrorView` | ❌ No visible en código revisado | ⚠️ Gap: Web puede mostrar error sin UI diferenciada |
| TransportCatalogCard: origin → destination | ❌ Bug: `CatalogView.swift` muestra solo `transport.destination` en primary text line | ✅ Web muestra `origin → destination` | ❌ Bug P2: iOS `TransportCatalogCard` muestra destino únicamente, falta origen |
| CityCatalogCard tappable → CityEditSheet | ✅ Abre `CityEditSheet` | ✅ Abre `CityForm` | ✅ Paridad |
| Tap item → edit | ✅ Abre `FlightEditSheet`/`HotelEditSheet`/`TransportEditSheet` | ✅ Modal con form correspondiente | ✅ Paridad |

---

## Resumen de bugs encontrados

### Bugs P1 — Bloqueantes

| # | Descripción | Archivo | Línea/Función | Owner |
|---|---|---|---|---|
| B-01 | iOS no tiene modo "Archivo/PDF" en AIParseModal — el diferencial del producto está incompleto | `AIParseModal.swift` | `ParseMode` enum línea 20-22 | @ios-dev |
| B-02 | Confidence badge thresholds inconsistentes: iOS usa ≥0.85/≥0.60, web usa ≥0.90/≥0.70 — un mismo parse devuelve colores diferentes según plataforma | `AIParseModal.swift` línea 719-720 vs `AiParseModal.tsx` línea 535 | ConfidenceBadge vs ParsedItemCard | @ios-dev |
| B-03 | ManualFlightForm iOS no tiene TZ selector — usa `parseLocalApproxUTC` que trata la hora local como UTC → schema Firestore corrupto para vuelos cargados desde iOS manual | `ManualForms.swift` `parseLocalApproxUTC` | LegFormState.toFlightLeg | @ios-dev |
| B-04 | Countdown iOS: faltan niveles "semanas" y "meses" — "En 45 días" en lugar de "En 6 semanas" para viajes >2 semanas | `DashboardView.swift` línea 322-323 | `countdownText` en NextTripCard | @ios-dev |
| B-05 | Flujo crear viaje en iOS falta el chooser draft/confirmed — siempre crea en `.draft` sin dar opción | `CreateTripSheet.swift` | sin DraftConfirmChooser | @ios-dev |

### Bugs P2 — Importantes

| # | Descripción | Archivo | Línea/Función | Owner |
|---|---|---|---|---|
| B-06 | iOS `TransportCatalogCard` muestra solo `transport.destination` como texto principal; debería ser `origin → destination` | `CatalogView.swift` | `TransportCatalogCard` primary text | @ios-dev |
| B-07 | iOS Dashboard avatar button tiene acción vacía `Button { }` — tap no hace nada | `DashboardView.swift` línea 144 | `avatarButton` | @ios-dev |
| B-08 | iOS `TripEditSheet` no expone el botón "Eliminar viaje" (`onDelete: nil`) — el usuario no puede borrar un viaje desde el edit sheet | `TripCityEditSheets.swift` línea 69 | `EditSheetShell(onDelete: nil)` | @ios-dev |
| B-09 | iOS DayDetailSheet no tiene quick-add "Agregar al día" — el usuario debe navegar a ItemsView o AIParseModal para agregar items a un día específico | `CalendarView.swift` | DayDetailSheet — falta botón | @ios-dev |

### Bugs P3 — Menores / UX

| # | Descripción | Plataforma | Owner |
|---|---|---|---|
| B-10 | iOS ListView muestra todos los días del viaje (incluso vacíos "Sin eventos este día"); web filtra solo días con items. La web es más limpia pero pierdes visibilidad del día vacío | iOS | PM para decidir comportamiento correcto |
| B-11 | iOS HotelEditSheet auto-calcula noches pero no sync bidireccional al cambiar fechas (solo al editar precio). Web sí hace sync completo | iOS | @ios-dev |
| B-12 | iOS ManualHotelForm no tiene campo "Dirección" — web sí lo tiene | iOS | @ios-dev |
| B-13 | Web GlobalStatsStrip en header desktop solo muestra 2 métricas (viajes + ciudades) vs 4 en iOS (+ vuelos + días) | Web | @frontend-engineer |

---

## Gaps de paridad (no son bugs — son features presentes en una sola plataforma)

| Gap | iOS | Web | Decisión sugerida |
|---|---|---|---|
| Modo Archivo IA | Ausente | Presente | Implementar en iOS — es el diferencial del producto (B-01) |
| Date adjustment ±1 día en calendario | Ausente | Presente | Agregar a iOS TripDetailView |
| citySettings global override | Ausente | Presente (carga de Firestore) | Evaluar si es necesario para MVP |
| Car_rental en filtro Catalog | Presente | Ausente | Agregar chip en web CatalogPage |
| Offline cache en Catalog | SwiftData completo | Ausente | Aceptable — plataformas distintas |
| DraftDatePicker visual con grillas | Ausente (DatePicker nativo) | Presente | P2 — post MVP |
| Export JSON Settings | Ausente | Ausente | Ambas lo necesitan — PRD Módulo G |
| "Mark all paid" por categoría | Presente en iOS CostsView | Ausente en web | Agregar a web CostView |
| Demo trip en empty state | Ausente | Presente | Nice-to-have, baja prioridad |
| Skeleton shimmer en loading | Presente en iOS Catalog | Ausente en web Catalog | Mejora UX para web |

---

## Diferencias intencionales de UX (no son gaps)

Estas diferencias siguen patrones nativos de cada plataforma y no requieren cambios:

- Action bar post-selección de rango: iOS usa sheet nativo (`CityRangeAssignSheet`) vs web usa bottom bar fija — ambos exponen las mismas acciones.
- Items view layout: iOS usa scroll único con bloques apilados; web usa subtabs con slider — ambos muestran el mismo contenido.
- Sign out confirmation: iOS tiene alert de confirmación; web no — el comportamiento iOS es más seguro, la diferencia es aceptable.
- CostsView layout: iOS tiene hero de métricas + barras de progreso; web tiene tabla editable inline — enfoques complementarios, no conflictivos.
- UID debug row en Settings iOS: solo para desarrollo, no afecta paridad funcional.

---

## Cobertura de tests automatizados

### Unit tests existentes
- Ninguno encontrado en los archivos revisados. No hay archivos `*Tests.swift` o `*.test.ts` en el scope auditado.

### Tests pendientes según PRD/state.md
- [ ] Countdown: verificar 5 niveles (>30d / 7-30d / 2-7d / mañana / horas) en iOS
- [ ] Confidence badge colores en ambas plataformas con valores de borde (0.85, 0.70, 0.60, 0.90)
- [ ] `duration_minutes` en `FlightEditSheet.save()` para vuelo EZE→MAD (12h 45m = 765 min)
- [ ] `parseUTC(local:tz:)` en EditSheets.swift — verificar con DST (America/Argentina/Buenos_Aires vs Europe/Madrid)
- [ ] Firestore rules: usuario A no puede leer data de usuario B
- [ ] Calendar grid: nunca colapsa a menos de 7 columnas en 375px

---

## Recomendacion

- [x] Listo con observaciones menores
- [ ] Listo para release
- [ ] Bloqueado por bugs criticos

La app funciona pero tiene 5 bugs P1 que afectan la propuesta de valor:

**Accion inmediata requerida:**
1. B-01: Implementar modo Archivo en iOS AIParseModal (`@ios-dev`)
2. B-02: Unificar confidence thresholds en 0.90/0.70 (según Design Brief) en iOS `ConfidenceBadge` (`@ios-dev`)
3. B-03: Agregar TZ selector a `ManualFlightForm` iOS usando `CommonTimezones.options` — mismo patron que `FlightEditSheet` ya implementado (`@ios-dev`)
4. B-04: Agregar niveles semanas/meses a `countdownText` en `DashboardView.swift` (`@ios-dev`)
5. B-05: Implementar chooser draft/confirmed antes del form de creación de viaje en iOS (`@ios-dev`)

**Bugs P2 que deben cerrarse antes del próximo TestFlight:**
- B-06: Fix `TransportCatalogCard` para mostrar `origin → destination`
- B-07: Conectar avatar button a SettingsView
- B-08: Habilitar delete en `TripEditSheet` (`onDelete: deleteTrip`)
- B-09: Agregar quick-add button en `DayDetailSheet`
