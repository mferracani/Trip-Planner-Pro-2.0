# Handoff: Trip Planner Pro 2

## Overview

**Trip Planner Pro 2 (TPP2)** es una app personal de planificación de viajes con un flujo central diferenciado: el usuario pega emails/tickets/confirmaciones en un modal y Claude (IA) parsea automáticamente los datos para crear items del viaje (vuelos, hoteles, trenes). La vista estrella es el **Trip Detail — Calendar**, un calendario semanal vertical donde cada día está tintado con el color de la ciudad visitada.

Producto mobile-first (iPhone) con PWA desktop. Dark mode premium, denso, data-first. Target: un único usuario (el dueño), no es multi-tenant.

## About the Design Files

Los archivos en `prototype/` son **referencias de diseño creadas en HTML/React-via-Babel** — prototipos que muestran la apariencia y el comportamiento deseados. **No son código de producción para copiar tal cual.**

La tarea es **recrear estos diseños en el entorno del codebase objetivo** (React Native / Expo / Swift / Next.js / lo que sea) usando los patrones y librerías ya establecidos en ese codebase. Si no existe aún un codebase, elegir el framework más apropiado para el producto (sugerido: **Expo + React Native** si el foco es mobile-first con PWA desktop via Expo Web, o **Next.js + React Native Web** si se prioriza desktop-first).

El HTML sirve como **fuente de verdad visual**: colores exactos, tipografía, spacing, layouts, estados, copy. El flujo de datos y arquitectura se dejan al criterio del developer.

## Fidelity

**High-fidelity (hifi)**. Los mocks tienen:
- Colores finales con hex exactos
- Tipografía definida (Inter Tight como sustituto de SF Pro — ver sección Typography)
- Spacing, radius, shadows definidos como tokens
- Estados: hover, active, loading, empty
- Copy definitivo en español (rioplatense, voseo donde aplica)
- Transiciones y animaciones clave (modal sheets, parse loading, view switches)

Debe recrearse pixel-close respetando tokens. Pequeñas adaptaciones al sistema nativo de la plataforma (ej. usar `UIBlurEffect` en iOS en vez de `backdrop-filter`) son bienvenidas.

## Stack de referencia del prototipo

- React 18 + JSX via Babel standalone (único HTML)
- Sin bundler, sin framework mobile — puro CSS-in-JS con inline style objects
- localStorage para persistencia de navegación
- No hay backend; toda la data es mock (`MOCK_TRIP`, `MOCK_STATS`, `PARSE_EXAMPLES` en `src/tokens.js`)

## Pantallas implementadas (10)

Ver `prototype/Trip Planner Pro 2.html` y los componentes en `prototype/src/screens/`.

### 1. Onboarding (3 steps)
- **Archivo**: `src/screens/dashboard.jsx` → `Onboarding`
- **Purpose**: Introducir el producto al primer uso
- **Layout**: Full screen dark, hero visual grande arriba (emoji+gradient placeholder), título 32px bold, subtítulo 15px secondary, botón primario pill full-width bottom, dots de progreso
- **Steps**:
  1. "Planeá tu viaje sin planillas" — hero con avión iluminado
  2. "Pegá el email, la IA hace el resto" — hero con sparkles/parse mock
  3. "Tu viaje, en una vista" — hero con calendar mini
- **CTA final**: "Empezar" → Dashboard

### 2. Dashboard (Home)
- **Archivo**: `src/screens/dashboard.jsx` → `Dashboard`
- **Purpose**: Punto de entrada, muestra próximo viaje + stats + acciones rápidas
- **Layout**: Scroll vertical. Header con saludo contextual + avatar. Hero card (next trip) ocupando ~60% del ancho visible. Grid 2×2 de stats. Lista de "Mis viajes" compacta. FAB "+" abajo derecha.
- **Hero card (Next trip)**:
  - Background: gradiente sutil sobre `bg.surface` con tinte de la ciudad de destino
  - Título: nombre del viaje (22px, 600)
  - Countdown: "En 47 días" (13px, secondary)
  - Metadata row: ruta cities (MAD → BCN → ROM), dates, total USD
  - Tap → Trip Detail
- **Saludo contextual**: cambia según estado del viaje (ver `GREETINGS` en tokens.js)

### 3. Mis Viajes (lista)
- **Archivo**: `src/screens/dashboard.jsx` → `TripsList`
- **Purpose**: Ver todos los viajes (planeados, en curso, pasados)
- **Layout**: Header simple + lista de cards vertical. Cada card: nombre, dates, total, status badge. Filtros arriba: All / Planned / Active / Past (segmented control).

### 4. Trip Detail — Calendar view ★
- **Archivo**: `src/screens/tripDetail.jsx` → `CalendarView`
- **Purpose**: Ver el viaje día por día en grid semanal con items
- **Layout crítico**:
  - Grid CSS `grid-template-columns: repeat(7, 1fr)` — días de la semana Lun→Dom fijos
  - Scroll vertical = más semanas
  - Cada celda: día (número grande 20px, top-left), items apilados verticalmente (badges pequeñas de 10-11px con hora + ícono tipo), tag de ciudad abajo en uppercase tracking amplio
  - **Background de la celda**: tintado al 14% con el color de la ciudad (`cityBg(hex, 0.14)`). Si cruza 2 ciudades, gradient diagonal
  - Día actual: ring azul `accent.blue` 2px
  - Celda vacía (fuera del viaje): `text.quaternary` sobre `bg.base`
- **Header del Trip Detail**:
  - Back button, título del viaje, menú (⋯)
  - Segmented control: Calendar / List / Map
  - Strip de ciudades con dots de color

### 5. Trip Detail — List view
- **Archivo**: `src/screens/tripDetail.jsx` → `ListView`
- **Layout**: Items cronológicos agrupados por día. Cada día header con fecha + ciudad color dot. Item cards con ícono tipo, descripción principal, hora, precio.

### 6. Trip Detail — Map view
- **Archivo**: `src/screens/tripDetail.jsx` → `MapView`
- **Purpose**: Ver el viaje geográficamente (estado placeholder, recomendación: MapKit / Mapbox)
- **Layout**: Mapa dark con pins de ciudad conectados con línea curva animada, bottom sheet con ciudades listadas

### 7. Day Detail (sheet)
- **Archivo**: `src/screens/tripDetail.jsx` → `DayDetailSheet`
- **Trigger**: tap sobre una celda del calendar
- **Layout**: Sheet desde abajo (70% altura). Header: fecha completa + ciudad. Timeline vertical de items del día con líneas conectoras. Cada item es tap → Item Detail.

### 8. Modal Carga IA (★ segundo en importancia)
- **Archivo**: `src/screens/modals.jsx` → `ParseModal`
- **Purpose**: Cargar items vía pegar texto, subir archivo, o ingresar manual
- **Layout**: Full-screen modal con 3 tabs arriba:
  - **Chat / Texto**: textarea grande, 3 botones de ejemplos (Vuelo / Hotel / Tren), botón "Parsear con IA" con sparkle icon
  - **Archivo**: drop zone grande, formatos aceptados (.pdf, .eml, .ics, imagen)
  - **Manual**: formulario tradicional con type picker arriba
- **Estados**:
  1. Input (textarea con placeholder)
  2. Loading: animación sparkles flotando + "Claude está leyendo…" + progress shimmer
  3. Preview: card con items parseados, cada uno con badge de **confidence score** (verde ≥0.9, naranja 0.7-0.9, rojo <0.7), botón "Confirmar y agregar" / "Revisar"
- **Ejemplos mock**: ver `PARSE_EXAMPLES` en tokens.js (Iberia flight, H10 hotel, Renfe train)

### 9. Create Trip (sheet)
- **Archivo**: `src/screens/modals.jsx` → `CreateTripSheet`
- **Layout**: Sheet 80% altura. Campos: nombre, fechas (date range picker), ciudades (tag input), notas. Botón primario "Crear".

### 10. Item Detail — Boarding Pass
- **Archivo**: `src/screens/modals.jsx` → `ItemDetailSheet`
- **Purpose**: Ver un vuelo/hotel/tren en formato ticket
- **Layout**: Sheet full height. Para flight: header con airline + código, origen/destino gigante (40px uppercase), hora sale/llega, duración en el medio con ícono avión, perforación visual horizontal (dashed), seat + class + código reserva abajo, barcode/QR placeholder al pie.

### 11. Settings (bonus)
- **Archivo**: `src/screens/modals.jsx` → `SettingsSheet`
- **Layout**: Lista grouped estilo iOS. Secciones: Cuenta, IA & Parse, Apariencia, Datos, About. Items con chevron derecho.

### 12. Parse Jobs (histórico)
- **Archivo**: `src/screens/modals.jsx` → `ParseJobsSheet`
- **Purpose**: Ver histórico de parses hechos (debugging/auditoría)
- **Layout**: Lista de jobs con: timestamp, tokens usados, latencia, input truncado, botón "Re-parsear"

## Interactions & Behavior

### Navegación
- **Transición entre pantallas**: slide horizontal 280ms `cubic-bezier(0.32, 0.72, 0, 1)` (iOS default)
- **Sheets**: slide-up desde abajo, 320ms con easing spring-ish. Backdrop fade `rgba(0,0,0,0.6)` con `backdrop-filter: blur(20px)`
- **Tab switches** (Calendar/List/Map): crossfade 200ms
- Back button / swipe-back: tap en "<" top-left, o swipe desde borde izquierdo (en nativo)

### Parse loading animation
- Sparkles SVG flotando con `@keyframes float` (3s loop, staggered delays)
- Progress bar shimmer gradient animado
- Texto rotante: "Claude está leyendo…" → "Identificando entidades…" → "Estructurando datos…" (cada ~800ms)

### Confidence states
- ≥0.9 → verde `#30D158`, texto "Alta confianza"
- 0.7–0.9 → naranja `#FF9F0A`, texto "Revisar"
- <0.7 → rojo `#FF453A`, texto "Baja confianza — verificar"

### Calendar cell tap
- Feedback: scale(0.96) 120ms → abre Day Detail sheet

### FAB "+"
- Tap → Action sheet con opciones: Nuevo viaje / Cargar item (IA) / Manual

### Estados empty
- Sin viajes: ilustración avión + "Tu primer viaje empieza acá" + CTA "Crear viaje"
- Sin items en un día: celda con guión sutil "—" en `text.quaternary`

## State Management

Variables globales (prototype usa `useState` + localStorage; en producción sugerido Zustand / Redux Toolkit / SwiftData):

- `currentScreen`: 'onboarding' | 'dashboard' | 'tripsList' | 'tripDetail' | 'settings' | 'parseJobs'
- `tripDetailView`: 'calendar' | 'list' | 'map'
- `activeTripId`: string | null
- `activeSheet`: null | 'dayDetail' | 'parseModal' | 'createTrip' | 'itemDetail' | 'settings' | 'parseJobs'
- `selectedDay`: ISO date string | null
- `selectedItemId`: string | null
- `parseModalState`: 'input' | 'loading' | 'preview'
- `parseModalTab`: 'chat' | 'file' | 'manual'
- `tripStatus` (tweak): 'planned' | 'active' | 'past'
- `greetingKey` (tweak): 'idle' | 'soon' | 'departure' | 'during' | 'lastday' | 'return' | 'postTrip'

Persistir en localStorage: `currentScreen`, `tripDetailView`, `activeTripId`. Re-hidratar al cargar.

## Design Tokens

### Colors

```
bg.base            #0D0D0D   fondo principal app
bg.surface         #1A1A1A   cards, sheets
bg.elevated        #242424   cards sobre surface, inputs
bg.border          #333333   divisores fuertes
bg.borderSoft      #262626   divisores sutiles
bg.modalBackdrop   rgba(0,0,0,0.72) con backdrop-filter blur(20px)

text.primary       #FFFFFF
text.secondary     #A0A0A0   subtítulos, metadata
text.tertiary      #707070   metadata menor
text.quaternary    #4D4D4D   deshabilitado, empty

accent.blue        #0A84FF   primario, CTAs, links, día actual
accent.green       #30D158   éxito, alta confianza
accent.orange      #FF9F0A   warning, media confianza
accent.red         #FF453A   error, baja confianza
accent.purple      #BF5AF2   IA, sparkles, highlights
```

### Cities palette (rotativa, 8 colores)

Usados para tintar celdas del calendar, dots de ciudad, acentos contextuales. Se asignan por orden de aparición en el trip (`colorIdx` en `MOCK_TRIP.cities`).

```
coral      #FF6B6B
teal       #4ECDC4
yellow     #FFD93D
mint       #95E1D3
lavender   #C77DFF
salmon     #FF8FA3
green      #6BCB77
blue       #4D96FF
```

**Uso**:
- Background de celda: color a 14% alpha — `rgba(R,G,B,0.14)`
- Dot / tag de ciudad: color a 100%
- Border accent: color a 40% alpha

Helpers: `cityBg(hex, alpha)` y `cityFg(hex, alpha)` en `src/tokens.js`.

### Typography

**Font family**: `'Inter Tight', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`

- Sustituto de SF Pro elegido por métricas cercanas. En iOS nativo usar **SF Pro Display/Text** directamente.

**Monospace**: `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace` — para códigos de vuelo, seat numbers, parse jobs stats.

**Escala** (aproximada, ver uso real en componentes):
- Display (hero): 32px / 700 / -0.02em
- Title 1: 24px / 600 / -0.01em
- Title 2: 20px / 600
- Body: 15px / 400
- Callout: 13px / 500
- Caption: 11px / 500 / 0.04em tracking (para tags uppercase)
- Micro: 10px / 600 uppercase tracking 0.08em

### Spacing (4px base)

```
xs   4
sm   8
md   12
lg   16
xl   24
xxl  32
xxxl 48
```

### Radius

```
sm    8    (chips, small buttons)
md    12   (cards internas, inputs)
lg    16   (cards principales, sheets)
xl    20   (modals, hero card)
pill  999  (pill buttons, tags)
```

### Shadows

Dark mode usa shadows muy sutiles o ninguna. Elevación se comunica vía `bg.elevated`. Para sheets: ring superior blanco 1px a 5% alpha.

```
sheet-top-ring: inset 0 1px 0 rgba(255,255,255,0.05)
card-subtle:    0 1px 0 rgba(255,255,255,0.03)
```

## Assets

### Iconos
Los íconos del prototipo son **SVGs originales inline** dibujados en `src/icons.jsx` con trazo fino estilo Lucide (`stroke-width: 1.5`, 24×24 viewBox).

Íconos implementados: `Plane`, `Hotel`, `Train`, `Calendar`, `List`, `Map`, `Settings`, `Plus`, `ChevronLeft`, `ChevronRight`, `Sparkles`, `Upload`, `Edit`, `Close`, `MoreHorizontal`, `Check`, `Search`, `User`, `Sun`, `Moon`.

**En producción**: reemplazar por [Lucide](https://lucide.dev) (React Native: `lucide-react-native`) o, si es iOS nativo, por **SF Symbols** directamente. Mapping sugerido:
- Plane → `airplane`
- Hotel → `bed.double.fill`
- Train → `tram.fill`
- Sparkles → `sparkles`
- (resto son equivalentes directos)

### Imagery
No hay imágenes reales en el prototipo. Los "covers" de ciudades son placeholders con gradients sobre el color de la ciudad. En producción usar fotos reales (Unsplash API con el nombre de la ciudad, o upload manual del usuario).

### Barcode / QR en boarding pass
Placeholder SVG con barras aleatorias. En producción usar librería tipo `jsbarcode` / `qrcode.react` con el `code6` del item.

## Mock data

Todo en `prototype/src/tokens.js`:

- `MOCK_TRIP` — viaje Europa 14 días (BUE → MAD → BCN → ROM → BUE) con 8 items (4 vuelos, 3 hoteles, 1 tren)
- `MOCK_STATS` — stats del dashboard (viajes/año, ciudades, días, gastado)
- `MOCK_TRIPS_LIST` — 4 viajes de ejemplo para "Mis Viajes"
- `GREETINGS` — 7 variantes de saludo contextual
- `PARSE_EXAMPLES` — 3 ejemplos prearmados del modal IA (vuelo Iberia, hotel H10, tren Renfe) con input, items resultantes, confidence, tokens y latency

## Tweaks (controles de diseño en el prototipo)

El prototipo expone un panel **Tweaks** (toolbar toggle) con:
- **Trip status**: cambia el estado del viaje mock y actualiza el dashboard
- **Greeting**: cicla por los 7 saludos contextuales

Estos tweaks son **solo del prototipo** para explorar estados — en producción el estado viene del backend / lógica real (fechas vs ahora).

## Files

```
prototype/
├── Trip Planner Pro 2.html           root HTML, monta React, carga scripts Babel
├── src/
│   ├── tokens.js                     design tokens + mock data (START HERE)
│   ├── icons.jsx                     SVG icons inline
│   ├── ui.jsx                        componentes básicos (Button, Card, Tag, etc)
│   ├── app.jsx                       root App, routing, Tweaks panel
│   └── screens/
│       ├── dashboard.jsx             Onboarding, Dashboard, TripsList
│       ├── tripDetail.jsx            Calendar/List/Map views, Day Detail
│       └── modals.jsx                ParseModal, CreateTripSheet, ItemDetailSheet, Settings, ParseJobs
└── frames/
    ├── ios-frame.jsx                 bezel iPhone con status bar
    └── browser-window.jsx            chrome web PWA
```

**Dónde arrancar leyendo**:
1. `src/tokens.js` — toda la paleta, spacing, mock data
2. `src/app.jsx` — cómo está organizado el routing y los screens
3. `src/screens/tripDetail.jsx` → `CalendarView` — la vista crítica del producto
4. `src/screens/modals.jsx` → `ParseModal` — el flujo diferenciador de la app

## Implementation notes

- **Mobile-first**: diseñar primero el mobile, desktop es un "wider canvas" con más aire — no inventar nuevas densidades
- **PWA desktop**: el prototipo muestra iPhone + web lado a lado. En desktop, los sheets se convierten en modales centrados con max-width 520px
- **Parse IA en producción**: usar Claude API (claude-sonnet-4.x recomendado por razonamiento sobre texto desestructurado) con un system prompt que fuerce JSON schema output. Store de parse jobs para auditoría y mejora del prompt
- **Timezone handling**: los vuelos tienen `tzFrom` y `tzTo` — respetar zonas horarias en la UI (mostrar hora local de cada punta)
- **Offline-first**: toda la data debe estar disponible offline (IndexedDB / Core Data / Realm). La IA requiere red pero el resto no.
- **Dark mode only por ahora**: no implementar light mode en v1 — el diseño está optimizado para dark

## Contacto / siguientes pasos

Preguntas o aclaraciones → abrir issue o volver al prototipo original y comentar sobre un elemento específico con la herramienta de inline comments.
