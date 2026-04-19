# 🎨 Design Brief — Trip Planner Pro 2

> Sistema visual dark mode premium + descripción completa de todas las pantallas. Fuente: Notion — última actualización 2026-04-19.

---

## 1. Dirección visual

**Estilo**: Dark mode premium, minimalista, data first. Consistente con Apple Health.
**Referencia**: Apple Health + Linear + Airbnb (solo para el concepto de calendario visual).
**Tono**: serio pero con calidez. Los colores de ciudades y los colores de categorías (vuelo/hotel/transit) son los protagonistas visuales sobre fondos oscuros neutros.

---

## 2. Sistema visual

### 2.1 Paleta

#### Backgrounds
- `#0D0D0D` — background principal (dark charcoal)
- `#1A1A1A` — surface (cards, modals, sheets)
- `#242424` — elevated surface (inputs, buttons secundarios)
- `#333333` — borders / dividers

#### Texto
- `#FFFFFF` — primario (titles, data)
- `#A0A0A0` — secundario (labels, helper text)
- `#707070` — terciario (placeholders, disabled)

#### Acentos de sistema
- `#0A84FF` (iOS blue) — links, CTAs primarios, tab activo
- `#30D158` (iOS green) — estados success, confidence alto
- `#FF9F0A` (iOS orange) — confidence medio, warnings
- `#FF453A` (iOS red) — errores, delete destructivo
- `#BF5AF2` (iOS purple) — feature IA (chat, parse, sugerencias)

#### Paleta de ciudades (8 colores rotativos)
Se asignan en orden al crear cada ciudad. Siempre con opacidad `0.15-0.25` sobre fondo oscuro.

1. `#FF6B6B` — coral
2. `#4ECDC4` — turquesa
3. `#FFD93D` — amarillo
4. `#95E1D3` — menta
5. `#C77DFF` — lavanda
6. `#FF8FA3` — rosa salmón
7. `#6BCB77` — verde fresco
8. `#4D96FF` — azul eléctrico

#### Categorías de items (badges en calendario)
- ✈️ Vuelo → `#0A84FF` (blue)
- 🏨 Hotel → `#FF9F0A` (orange)
- 🚆 Transit → `#BF5AF2` (purple)

### 2.2 Tipografía

**Familia**: SF Pro (nativa iOS) / SF Pro Text + Inter fallback en web.

| Estilo | Size | Weight | Uso |
|--------|------|--------|-----|
| Large Title | 34 | Bold | Headers de pantalla principal |
| Title 1 | 28 | Bold | Titles de sección |
| Title 2 | 22 | Semibold | Subsecciones |
| Title 3 | 20 | Semibold | Cards destacadas |
| Headline | 17 | Semibold | Labels destacados, nombres de items |
| Body | 17 | Regular | Texto de contenido |
| Callout | 16 | Regular | CTA text |
| Subheadline | 15 | Regular | Metadata (fechas, horarios) |
| Footnote | 13 | Regular | Helper text |
| Caption 1 | 12 | Medium | Badges, tags |
| Caption 2 | 11 | Regular | Timestamps minúsculos |

### 2.3 Iconografía

**Set único**: SF Symbols 5+.

Íconos clave:
- `airplane` — vuelos
- `bed.double.fill` — hoteles
- `tram.fill` / `bus.fill` / `car.fill` / `ferry.fill` — transportes
- `sparkles` — carga IA (primary action)
- `text.bubble` — chat natural
- `doc.text.viewfinder` — parse de documento
- `pencil` — edición manual
- `plus.circle.fill` — add item
- `chart.line.uptrend.xyaxis` — gastos / FX
- `gear` — settings

### 2.4 Espaciado y radios

**Escala de spacing** (múltiplos de 4):
- `4` xs
- `8` sm
- `12` md
- `16` lg (default entre elementos)
- `24` xl (entre secciones)
- `32` 2xl (margen de pantalla)
- `48` 3xl (hero spacing)

**Radios**:
- `8` — buttons pequeños, badges
- `12` — inputs, buttons medium
- `16` — cards
- `20` — modals, sheets
- `999` — pills, tabs, chips

### 2.5 Sombras y elevación

En dark mode se usa **elevación por color de background** (no box-shadows):
- Surface → `#1A1A1A`
- Elevated → `#242424`
- Modal → `#1A1A1A` con backdrop blur

Sombras sutiles solo para flotantes (FAB, tooltips): `0 8px 24px rgba(0,0,0,0.4)`

### 2.6 Motion

- Transiciones: 200-300ms, easing `ease-out`
- Sheet modals: spring nativo iOS
- Loading states: skeleton shimmer (no spinners)
- Success feedback: haptic `.success` + mini-checkmark 400ms
- Parse IA en progreso: animación sutil de `sparkles` pulsante

---

## 3. Pantallas — descripción completa

### 3.1 Onboarding (3 pantallas)

**Pantalla 1 — Bienvenida**
- Logo + nombre "Trip Planner Pro 2"
- Tagline: "Organizá tus viajes sin tipear."
- Hero visual: mock del calendar con ciudades coloreadas
- Botón primario: "Empezar"

**Pantalla 2 — Cómo funciona**
- 3 cards horizontales:
  1. 💬 "Pegá el email de tu booking"
  2. 📄 "O subí el PDF"
  3. ✨ "La IA arma tu viaje"
- Botón: "Siguiente"

**Pantalla 3 — Sign in with Apple**
- Copy: "Iniciá sesión para sincronizar entre tu iPhone y tu Mac"
- Botón oficial de Sign in with Apple
- Link pequeño: "Política de privacidad"

### 3.2 Dashboard / Home

**Header**:
- Saludo contextual dinámico (ver Módulo A del PRD)
- Avatar arriba derecha (link a settings)

**Sección — Viaje en curso o próximo** (card grande):
- Cover image + nombre + countdown vivo
- Si hay viaje en curso: cover + "Día 3 de 14" + total USD + botón "Ver viaje"
- Si no hay ninguno: CTA grande "Crear nuevo viaje"

**Sección — Resumen anual** (mini-stats 2x2):
- Viajes este año, Ciudades visitadas, Días viajando, Total gastado (USD)

**Sección — Mis viajes** (lista):
- Pills de filtro: Todos · Futuros · En curso · Pasados
- Cards horizontales con cover + nombre + fechas + total USD

**FAB**: `plus.circle.fill` azul → Crear viaje

**Tab bar** (5 tabs): Home · Viajes · Cargar (sparkles) · Mapa · Settings

### 3.3 Crear nuevo viaje (con Unsplash cover)

Sheet modal desde abajo:
- Input: nombre del viaje
- Date range picker: inicio + fin
- Selector de primera ciudad (autocomplete Nominatim)
- Carrusel de 3 cover images sugeridas de Unsplash
- CTA: "Crear viaje"

### 3.4 Trip Detail

**Header**: back button + título + menú ···

**Stats row** (horizontal scroll): Total USD · Ciudades · Vuelos · Hoteles

**Tabs pill**: Calendar · List · Map

**Calendar view** (default) — ver 3.4.1 para specs completas.

**List view**: Timeline vertical por día, cards agrupados con sticky header.

**Map view**: Mapa con pins de ciudades coloreados + líneas cronológicas.

**FAB flotante**: `sparkles` → abre modal de carga IA

### 3.4.1 Calendar view — especificaciones del grid ★

#### Layout
- **Dirección**: grid vertical de semanas apiladas
- **Columnas**: exactamente 7 (Lun→Dom), siempre, en mobile y desktop
- **Gap**: 6px entre celdas (móvil), 8px (desktop)
- **Padding horizontal**: 12px (móvil), 24px (desktop)

#### Celda del día
- **Aspect ratio móvil**: 55×92
- **Altura desktop**: 120px fija
- **Radio**: 10px
- **Padding interno**: 6px top, 4px sides, 4px bottom
- **Background default**: `#1A1A1A` con borde `#333333` 1px
- **Background con ciudad**: color de ciudad al 14% opacity + borde al 30%
- **Background día fuera de rango**: `opacity: 0.3`, no clickeable
- **Background día activo**: borde `#0A84FF` 2px

#### Contenido de la celda (de arriba a abajo)
1. **Número del día** — 13px móvil / 15px desktop, weight 700
2. **Items stack** — badges verticales con gap 3px, max 3 visibles
3. **Tag de ciudad** — mt-auto (fondo), 9px móvil, weight 700, UPPERCASE

#### Badges de items
- **Tamaño**: 9px móvil / 11px desktop, weight 600, padding 2×4px, radio 4px
- **Contenido informativo**:
  - Vuelo: `✈ 21:35` — bg azul al 20%, color `#60A5FA`
  - Hotel: `🏨 NH` (marca corta) — bg naranja al 18%, color `#FBBF24`
  - Transit: `🚆 09:40` — bg púrpura al 20%, color `#D8B4FE`

#### Vuelos y transportes que cruzan días
Un vuelo EZE→MAD aparece en las celdas de salida Y llegada, con la hora local de cada aeropuerto:
- Celda 15/03 (salida): `✈ 21:35`
- Celda 16/03 (llegada): `✈ 14:20 MAD`

#### Interacciones

| Gesto | Acción | Feedback |
|-------|--------|----------|
| Tap simple | Abre Day Detail sheet | Scale 0.97 + haptic light |
| Long-press 500ms | Mini-menu flotante quick-add | Haptic medium + popIn |
| Long-press + drag | Marca rango para asignar ciudad (v1.1) | Highlight en días |
| Tap leyenda ciudad | Filtra/resalta días de esa ciudad | Dim de días no relevantes |

#### Quick-add mini menu
- Background `#242424`, borde `#333333`, radio 14px
- 4 botones: `🏨 Hotel`, `✈ Vuelo`, `🚆 Transit`, `📝 Nota`
- Tap → abre Modal Carga IA con item_type pre-seteado

#### Day Detail sheet (tap simple)
- Sheet desde abajo con handle 36×5px
- Backdrop `rgba(0,0,0,0.6)` + `backdrop-blur(8px)`
- Contenido: título del día + ciudad asignada + lista de items + botón `✨ Agregar al día`
- Spring transition cubic-bezier(0.32, 0.72, 0, 1) 300ms

#### Responsive
- **Mobile (<768px)**: celdas 55×92, badges 9px, tag ciudad 9px
- **Desktop (≥1024px)**: celdas height 120px, badges 11px, gap 8px
- **Nunca** cambia el layout a "un día por fila"

#### Accesibilidad
- `role="button"` con `aria-label="Sábado 20 de marzo — Madrid — 1 hotel, 1 transit"`
- Focus ring: outline `#0A84FF` 2px offset 2px
- Soporte teclado: Tab navega, Enter abre sheet, SpaceBar quick-add

### 3.5 Modal de carga IA ★

Sheet full-screen desde abajo.

**Header**: Close + "Agregar al viaje" + Segmented control: Chat · Archivo · Manual

#### Modo Chat (default)
- Text area grande (~60% del alto)
- Placeholder: *"Ej: Mi vuelo Iberia IB6844 sale el 15/03 a las 21:35 de Buenos Aires a Madrid..."*
- Chips con ejemplos rápidos: "Vuelo", "Hotel", "Tren"
- Footer: botón `sparkles` "Parsear con Claude"
- Procesando: animación sparkles + "Claude está entendiendo tu viaje…"

#### Modo Archivo
- Drop zone grande punteada
- 3 opciones: 📁 Elegir archivo · 📷 Tomar foto · 📋 Pegar portapapeles
- Footer: botón `sparkles` "Parsear con Gemini"

#### Modo Manual
- Tabs: Vuelo · Hotel · Transporte
- Form con campos grandes + autocomplete
- Footer: "Guardar"

#### Preview post-parse
- Lista de items detectados con: ícono + tipo + título + metadata + confidence badge
- Confidence: verde (>0.85), naranja (0.6-0.85), rojo (<0.6)
- Footer: "Confirmar y agregar al viaje" + "Volver a editar input"

### 3.6 Day Detail (sheet)

Sheet medium-height con: fecha formateada, ciudad asignada con chip de color, lista vertical de items, empty state con botón `sparkles`.

### 3.7 Detalle de item (vuelo / hotel / transporte)

Sheet modal con layout **boarding pass** para vuelos/transportes:

```
✈ Iberia IB6844

  EZE  →  MAD                    Business

  Salida     21:35   Buenos Aires (GMT-3)
  15 mar 2026        America/Argentina/Buenos_Aires

  Llegada    14:20   Madrid (GMT+2)
  16 mar 2026        Europe/Madrid

  Duración   12h 45min

  Asiento    24A
  Código     ABC123
  Precio     EUR 742  (≈ USD 810 al fx actual)
```

Reglas visuales:
- Horas locales: 28px, weight 700, monospace
- Ciudad + offset GMT: 14px color secundario
- Timezone IANA: 11px color terciario
- Si la fecha de llegada cambia: chip sutil `+1 día`

### 3.8 Settings

Lista estilo iOS Settings con secciones: Cuenta · IA · Preferencias · Datos · Sobre.

**Sección IA**:
- Provider default (picker: Claude / Gemini / OpenAI)
- Provider multimodal (picker, default Gemini)
- API keys (row por provider → sheet para pegar key)
- Ver últimos parse jobs

---

## 4. Flujos clave

### Flujo A — Primer uso
```
Bienvenida → Cómo funciona → Sign in with Apple → Dashboard vacío
→ "Crear tu primer viaje" → Create Trip → Trip Detail vacío
→ FAB sparkles → Modal Carga IA (Chat)
```

### Flujo B — Carga de vuelo con chat natural
```
Trip Detail → FAB sparkles → Modal Carga IA (Chat)
→ Mati escribe: "Vuelo Iberia IB6844 EZE-MAD 15/03 21:35 USD 850"
→ Tap "Parsear con Claude"
→ Loading sparkles (1-3s)
→ Preview: 1 vuelo detectado, confidence 0.92
→ Tap "Confirmar y agregar"
→ Toast success + vuelo en calendar day 15/03
```

### Flujo C — Carga de hotel con PDF
```
Mail/Safari → Share → Trip Planner Pro 2 → Selector de viaje activo
→ Modal Carga IA con archivo ya adjunto
→ Tap "Parsear con Gemini"
→ Preview: 1 hotel, confidence 0.88
→ Confirmar → Hotel agregado, días coloreados
```

### Flujo D — Edición manual post-parse parcial
```
Preview post-parse → Item con confidence 0.55 en naranja
→ Tap "Editar" → Form pre-llenado con lo que IA extrajo
→ Mati corrige airline y seat → Guardar
```

---

## 5. Referencias visuales

- **Apple Health**: paleta dark + data-first + elevación por color
- **Linear**: densidad de información + animaciones sutiles
- **Airbnb (solo concepto calendar)**: grid Mon-Sun con celdas coloreadas
- **Raycast**: modales con command palette aesthetic para el chat natural
- **Things 3**: empty states elegantes y tipografía

---

## 6. Orden de pantallas para Claude Design

1. **Dashboard** (arrancar acá)
2. **Trip Detail — Calendar view** (el key visual)
3. **Modal Carga IA — Chat mode + Preview post-parse**
4. **Modal Carga IA — Archivo mode**
5. **Trip Detail — List view + Map view**
6. **Day Detail sheet**
7. **Create Trip sheet**
8. **Detalle de vuelo / hotel / transporte**
9. **Onboarding (3 pantallas)**
10. **Settings + Parse Jobs History**

---

## 7. Prompt de arranque para Claude Design

```
Diseñá una app iOS nativa + PWA web de planificación de viajes llamada Trip Planner Pro 2.

Contexto:
- Usuario único: product designer que viaja 3-6 veces al año
- Estilo: dark mode premium minimalista, similar a Apple Health + Linear
- Paleta: backgrounds #0D0D0D y #1A1A1A, acentos iOS (#0A84FF azul,
  #30D158 verde, #FF9F0A naranja, #BF5AF2 púrpura), 8 colores rotativos
  de ciudades (#FF6B6B, #4ECDC4, #FFD93D, #95E1D3, #C77DFF, #FF8FA3,
  #6BCB77, #4D96FF) con opacidad 0.15-0.25 sobre fondos oscuros
- Tipografía: SF Pro (nativa iOS)
- Iconografía: SF Symbols exclusivamente
- El diferencial es la carga con IA: tres modos (chat natural, archivo, manual)

Primero diseñá el Dashboard con:
1. Header con saludo "Hola, Mati" y avatar arriba derecha
2. Card grande de viaje en curso o próximo (cover + nombre + total USD + CTA)
3. Grid 2x2 de stats: Viajes este año, Ciudades visitadas, Días viajando, Total gastado
4. Pills de filtro (Todos / Futuros / En curso / Pasados)
5. Lista horizontal de cards de viaje con cover, nombre, fechas, total USD
6. FAB flotante (plus.circle.fill) abajo derecha
7. Tab bar inferior con 5 tabs: Home, Viajes, Cargar (sparkles), Mapa, Settings

Después del Dashboard, seguimos con:
- Trip Detail con Calendar view (grid VERTICAL de semanas apiladas, 7 columnas
  Mon->Sun fijas, celdas 55x92 en mobile / 120px alto en desktop, contenido por
  celda: número del día arriba, stack vertical de badges con hora real del item
  (ej: "✈ 21:35", "🏨 NH"), tag de ciudad abajo en uppercase, fondo tintado con
  color de ciudad al 14% opacity. NUNCA colapsar a "un día por fila" en mobile.)
- Mini quick-add menu (long-press en celda abre menú flotante con 4 botones:
  Hotel / Vuelo / Transit / Nota)
- Day Detail sheet desde abajo (tap simple en celda)
- Modal Carga IA con los 3 modos (Chat / Archivo / Manual) y preview post-parse

Usa el dark mode consistentemente y prioriza la legibilidad de datos
sobre la decoración. Los colores de ciudades y las sparkles moradas del
módulo IA son los únicos acentos coloridos importantes.
```

---

## 8. Componentes reutilizables del design system

- `TripCard` — cover + name + dates + total USD
- `CalendarCell` — day + city color + badges
- `CityPill` — nombre + color dot
- `ItemRow` — ícono + título + metadata + confidence opcional
- `ConfidenceBadge` — verde/naranja/rojo según score
- `AIParseButton` — sparkles + texto + loading state
- `ProviderChip` — Claude / Gemini / OpenAI con colores diferenciados
- `StatCard` — valor grande + label
- `SegmentedTab` — pill tabs estilo iOS
- `SheetHeader` — back + title + close

---

*Design Brief v1.0 — exportado desde Notion el 2026-04-19.*
