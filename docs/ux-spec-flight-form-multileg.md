# UX Spec — Formulario de reserva de vuelos multi-tramo

**Feature**: FlightItinerary form (multi-leg)
**Reemplaza**: `web/next/components/forms/FlightForm.tsx` (mono-tramo)
**Fecha**: 2026-04-25
**Autor**: UX Design agent

---

## Flows principales

### Flow 1: Crear reserva nueva desde cero

1. Usuario abre Trip Detail y toca FAB o accede a "Añadir vuelo" desde List view
2. Se abre el FormSheet con el formulario vacío
3. Usuario completa datos de reserva (booking ref, precio, moneda) en el header
4. Toca `+ Agregar tramo de ida` — se expande el formulario inline de tramo
5. Completa los datos del primer tramo (EZE → MAD) y toca `[ Agregar tramo ]`
6. El tramo queda colapsado como card. Si hay escala, toca `+ Agregar tramo de ida` de nuevo
7. Para el regreso, toca `+ Agregar tramo de vuelta`
8. Repite el proceso para tramos de vuelta
9. Toca `[ Guardar reserva ]` fijo al pie — valida y persiste en Firestore

### Flow 2: Editar tramo existente

1. En el form con tramos cargados, usuario toca `[✎]` en un tramo card
2. El tramo se expande inline mostrando sus campos pre-llenados
3. Usuario edita y toca `[ Actualizar tramo ]`
4. El tramo vuelve al estado colapsado con los datos actualizados

### Flow 3: Reserva solo ida (edge case normal)

El flow es idéntico al Flow 1 pero el usuario nunca toca `+ Agregar tramo de vuelta`.
La sección "VUELTA" no existe visualmente hasta que se toca ese botón.
Al guardar, el itinerary tiene `legs` con solo tramos de dirección `outbound`.

### Flow 4: Edición de reserva existente (post-parse o post-guardado)

1. Usuario toca el vuelo en la List view o en el Day Detail sheet
2. Se abre el FormSheet en modo edición, con todos los tramos ya desplegados como cards
3. Puede editar datos de reserva, agregar/eliminar/editar tramos, cambiar dirección de tramos
4. `[ Guardar reserva ]` hace `updateFlight` al doc existente

---

## Mapa de pantallas

```
Trip Detail (List / Calendar)
  └── FormSheet — vacío (crear)
        ├── Tramo expandido (inline leg form)
        │     └── Tramo colapsado (leg card)
        └── FormSheet — con tramos (editar reserva existente)
              └── Tramo expandido (inline leg form en modo edición)
```

---

## Wireframes

---

### Pantalla 1A — Form vacío / MOBILE

**Propósito**: Crear reserva nueva desde cero en pantalla chica.
**Estados**: default (este wireframe), saving (pie con spinner), error (banner bajo header)

```
┌────────────────────────────────────┐
│ [✕]   Nueva reserva de vuelo       │  ← SheetHeader, superficie #1A1A1A
├────────────────────────────────────┤
│                                    │
│  DATOS DE LA RESERVA               │  ← Label sección, texto secundario
│  ┌──────────────────────────────┐  │
│  │ Booking ref       ABC123___  │  │  ← Input #242424
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────┐  ┌───┐  ┌──────┐ │
│  │ Precio  850_ │  │EUR│▼ │ USD_ │ │  ← Precio / Moneda / Equiv.USD
│  └──────────────┘  └───┘  └──────┘ │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Monto pagado    ___________  │  │
│  └──────────────────────────────┘  │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ✈ IDA                             │  ← Header sección IDA, ícono azul
│                                    │
│  No hay tramos de ida.             │  ← Empty state, texto terciario
│                                    │
│  ┌──────────────────────────────┐  │
│  │  [+]  Agregar tramo de ida   │  │  ← Botón outline azul (#0A84FF)
│  └──────────────────────────────┘  │
│                                    │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │  ← Divider sutil #333333
│                                    │
│  ↩ VUELTA                          │  ← Header sección VUELTA, ícono gris
│                                    │
│  No hay tramos de vuelta.          │  ← Empty state, texto terciario
│                                    │
│  ┌──────────────────────────────┐  │
│  │  [+]  Agregar tramo vuelta   │  │  ← Botón outline gris (#333333)
│  └──────────────────────────────┘  │
│                                    │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │      [ Guardar reserva ]     │  │  ← CTA primario fijo al pie,
│  └──────────────────────────────┘  │    deshabilitado hasta tener 1+ tramo
└────────────────────────────────────┘
```

**Jerarquía:**
- Primario: `[ Guardar reserva ]`
- Secundario: `[+] Agregar tramo de ida`
- Terciario: `[+] Agregar tramo vuelta`

**Acciones:**
- `[✕]` → cierra sheet sin guardar
- `[+] Agregar tramo de ida` → expande formulario inline de tramo (Pantalla 3A) debajo del botón
- `[+] Agregar tramo vuelta` → ídem para sección vuelta
- `[ Guardar reserva ]` → deshabilitado hasta que exista al menos 1 tramo; al tap → saving state

**Notas de diferenciación IDA / VUELTA:**
- Ícono IDA: `airplane` apuntando derecha, tintado en `#0A84FF`
- Ícono VUELTA: `airplane` apuntando izquierda (SF Symbol `airplane` con rotation o `airplane.arrival`), tintado en `#A0A0A0` cuando sin tramos, cambia a `#30D158` (verde) cuando tiene al menos 1 tramo
- El botón `+ Agregar tramo de ida` usa borde y texto en `#0A84FF`
- El botón `+ Agregar tramo vuelta` usa borde y texto en `#A0A0A0` (neutro, menos prominente)
- La línea divisora entre secciones es el único separador visual necesario

---

### Pantalla 1B — Form vacío / DESKTOP

**Propósito**: Misma pantalla en modal centrado, max-width 560px.
**Diferencia clave**: grid de 2 columnas en campos de reserva, más respiración vertical.

```
┌────────────────────────────────────────────────────────┐
│ [✕]       Nueva reserva de vuelo                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  DATOS DE LA RESERVA                                   │
│                                                        │
│  ┌──────────────────────┐  ┌──────┐  ┌───────────────┐ │
│  │ Booking ref  ABC123_ │  │ EUR▼ │  │ Precio  850__ │ │
│  └──────────────────────┘  └──────┘  └───────────────┘ │
│                                                        │
│  ┌──────────────────────┐  ┌───────────────────────── ┐ │
│  │ Equiv. USD  ________ │  │ Monto pagado  _________  │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ✈ IDA                                                 │
│                                                        │
│  No hay tramos de ida aún.                             │
│                                                        │
│  ┌──────────────────────┐                              │
│  │  [+]  Agregar tramo de ida  │                       │
│  └──────────────────────┘                              │
│                                                        │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│                                                        │
│  ↩ VUELTA                                              │
│                                                        │
│  No hay tramos de vuelta aún.                          │
│                                                        │
│  ┌──────────────────────┐                              │
│  │  [+]  Agregar tramo de vuelta  │                    │
│  └──────────────────────┘                              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                         ┌──────────────────────────┐   │
│                         │   [ Guardar reserva ]    │   │
│                         └──────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

**Diferencias respecto a mobile:**
- Booking ref + Moneda en una misma fila de 3 columnas
- Equiv. USD + Monto pagado en fila de 2 columnas
- CTA alineado a la derecha
- Los botones `+ Agregar tramo` no ocupan el ancho completo (solo el ancho del texto + padding)

---

### Pantalla 2A — Form con tramos cargados / MOBILE

**Propósito**: Estado del form después de agregar 2 tramos de ida + 1 de vuelta.
**Data real**: EZE → MAD → PMI (ida) · PMI → MAD (vuelta)

```
┌────────────────────────────────────┐
│ [✕]   Editar reserva              │
├────────────────────────────────────┤
│                                    │
│  DATOS DE LA RESERVA               │
│  ┌──────────────────────────────┐  │
│  │ Booking ref       IB3K9X    │  │
│  └──────────────────────────────┘  │
│  ┌──────────────┐  ┌───┐  ┌──────┐ │
│  │ Precio  742  │  │EUR│▼ │ ~USD │ │
│  └──────────────┘  └───┘  └──────┘ │
│  ┌──────────────────────────────┐  │
│  │ Monto pagado   742          │  │
│  └──────────────────────────────┘  │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ✈ IDA                         2  │  ← badge contador de tramos
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ✈  EZE → MAD                │  │  ← Leg card colapsada
│  │    IB6844 · 15 mar · 21:35→14:20 [✎] [✕] │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ✈  MAD → PMI                │  │  ← Leg card colapsada, 2do tramo
│  │    IB3707 · 16 mar · 17:50→19:20 [✎] [✕] │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  [+]  Agregar tramo de ida   │  │  ← Sigue disponible
│  └──────────────────────────────┘  │
│                                    │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│                                    │
│  ↩ VUELTA                      1  │  ← badge verde cuando tiene tramos
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ✈  PMI → MAD                │  │  ← Leg card vuelta
│  │    IB3706 · 28 mar · 08:10→09:40 [✎] [✕] │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  [+]  Agregar tramo vuelta   │  │
│  └──────────────────────────────┘  │
│                                    │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │      [ Guardar reserva ]     │  │  ← Habilitado
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Anatomía de la Leg card colapsada:**
```
┌──────────────────────────────────────┐
│ ✈  EZE → MAD                  [✎][✕]│
│    IB6844 · 15 mar · 21:35 → 14:20  │
│                               12h 45m│
└──────────────────────────────────────┘
```
- Primera línea: `ícono` + `IATA origen → IATA destino` (peso semibold, texto primario) + botones `[✎]` (editar) y `[✕]` (eliminar)
- Segunda línea: `Vuelo NRO · Fecha · HH:MM → HH:MM` (texto secundario, subheadline)
- Badge de duración en borde inferior derecho (texto terciario, footnote)
- Background `#242424`, radio 12, borde `#333333` 1px

**Acciones:**
- `[✎]` en leg card → expande esa card en modo edición (Pantalla 3A con datos pre-cargados)
- `[✕]` en leg card → confirma con alert destructivo → elimina el tramo de la lista local
- `[+] Agregar tramo de ida` → agrega nuevo tramo inline bajo los existentes
- `[+] Agregar tramo vuelta` → ídem para vuelta
- `[ Guardar reserva ]` → persiste todo en Firestore como un solo doc `flights/`

---

### Pantalla 2B — Form con tramos cargados / DESKTOP

```
┌────────────────────────────────────────────────────────┐
│ [✕]       Editar reserva                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  DATOS DE LA RESERVA                                   │
│  ┌──────────────────────┐  ┌──────┐  ┌───────────────┐ │
│  │ Booking ref  IB3K9X  │  │ EUR▼ │  │ Precio  742   │ │
│  └──────────────────────┘  └──────┘  └───────────────┘ │
│  ┌──────────────────────┐  ┌───────────────────────── ┐ │
│  │ Equiv. USD   ~810    │  │ Monto pagado  742        │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ✈ IDA  (2 tramos)                                     │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✈  EZE → MAD              IB6844 · 15 mar   [✎][✕]│ │
│  │    21:35 (EZE) → 14:20 (MAD) · 12h 45m          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✈  MAD → PMI              IB3707 · 16 mar   [✎][✕]│ │
│  │    17:50 (MAD) → 19:20 (PMI) · 1h 30m           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────┐                              │
│  │  [+]  Agregar tramo de ida  │                       │
│  └──────────────────────┘                              │
│                                                        │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│                                                        │
│  ↩ VUELTA  (1 tramo)                                   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✈  PMI → MAD              IB3706 · 28 mar   [✎][✕]│ │
│  │    08:10 (PMI) → 09:40 (MAD) · 1h 30m           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────┐                              │
│  │  [+]  Agregar tramo de vuelta  │                    │
│  └──────────────────────┘                              │
│                                                        │
├────────────────────────────────────────────────────────┤
│                         ┌──────────────────────────┐   │
│                         │   [ Guardar reserva ]    │   │
│                         └──────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

### Pantalla 3A — Formulario inline de tramo / MOBILE

**Propósito**: Captura o edición de los datos de un tramo individual.
**Contexto**: Se renderiza embebido dentro de la sección IDA o VUELTA (no es pantalla separada).
**Estados**: adding (CTA = "Agregar tramo"), editing (CTA = "Actualizar tramo"), loading (campos disabled + spinner)

```
┌────────────────────────────────────┐
│  [contexto: sección IDA]           │
│                                    │
│  ╔══════════════════════════════╗  │
│  ║  Tramo de ida                ║  │  ← Header inline, background #1A1A1A
│  ║  ── ── ── ── ── ── ── ── ──  ║  │     borde superior/izq/der #0A84FF 1px
│  ║                              ║  │     (o #A0A0A0 para vuelta)
│  ║  ┌──────────┐  ┌───────────┐ ║  │
│  ║  │ Origen   │  │ Destino   │ ║  │  ← Fila IATA
│  ║  │ EZE_____ │  │ MAD_____  │ ║  │     (apilados en mobile)
│  ║  └──────────┘  └───────────┘ ║  │
│  ║                              ║  │
│  ║  ┌──────────┐  ┌───────────┐ ║  │  ← Aerolínea + Nro vuelo
│  ║  │Aerolínea │  │ Nro vuelo │ ║  │
│  ║  │ Iberia__ │  │ IB6844__  │ ║  │
│  ║  └──────────┘  └───────────┘ ║  │
│  ║                              ║  │
│  ║  Salida                      ║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ 2026-03-15T21:35         │║  │  ← datetime-local input
│  ║  └──────────────────────────┘║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ America/Argentina/BsAs ▼ │║  │  ← Timezone selector
│  ║  └──────────────────────────┘║  │
│  ║                              ║  │
│  ║  Llegada                     ║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ 2026-03-16T14:20         │║  │
│  ║  └──────────────────────────┘║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ Europe/Madrid          ▼ │║  │
│  ║  └──────────────────────────┘║  │
│  ║                              ║  │
│  ║  ▼ Más detalles              ║  │  ← Collapsed toggle (ver Pantalla 4A)
│  ║                              ║  │
│  ║  ┌────────────┐  ┌─────────┐ ║  │
│  ║  │[Cancelar]  │  │[Agregar]│ ║  │  ← Par de botones al pie del inline form
│  ║  └────────────┘  └─────────┘ ║  │
│  ╚══════════════════════════════╝  │
│                                    │
└────────────────────────────────────┘
```

**Detalles del contenedor inline:**
- Background `#1A1A1A`
- Borde izquierdo 2px de color de dirección: `#0A84FF` para IDA, `#A0A0A0` para VUELTA
- Radio `12px`
- Separado del resto del scroll con margin vertical `8px`

**Acciones:**
- `[Cancelar]` → colapsa el inline form sin guardar; si estaba en modo edición, restaura la card colapsada
- `[Agregar tramo]` / `[Actualizar tramo]` → valida campos requeridos (origen, destino, aerolínea, nro vuelo, salida, llegada) → agrega a la lista local y colapsa
- `▼ Más detalles` → expande sección de clase y asiento (Pantalla 4A)

**Validación inline:**
- Si se toca `[Agregar tramo]` con campos vacíos: borde rojo en cada campo faltante + texto de error bajo el campo (`"Campo requerido"`)
- No bloquea el scroll del sheet mientras el inline form está abierto

---

### Pantalla 3B — Formulario inline de tramo / DESKTOP

**Propósito**: Misma captura de tramo, aprovechando el ancho del modal de 560px.
**Diferencia clave**: grid de 2 columnas para origen/destino y para salida/llegada.

```
┌──────────────────────────────────────────────────────────┐
│  [contexto: sección IDA del modal desktop]               │
│                                                          │
│  ╔════════════════════════════════════════════════════╗  │
│  ║  Tramo de ida                                      ║  │
│  ║  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──  ║  │
│  ║                                                    ║  │
│  ║  ┌──────────────────────┐  ┌─────────────────────┐║  │
│  ║  │ Origen (IATA)        │  │ Destino (IATA)      │║  │
│  ║  │ EZE_________________ │  │ MAD________________ │║  │
│  ║  └──────────────────────┘  └─────────────────────┘║  │
│  ║                                                    ║  │
│  ║  ┌──────────────────────┐  ┌─────────────────────┐║  │
│  ║  │ Aerolínea            │  │ Número de vuelo     │║  │
│  ║  │ Iberia______________ │  │ IB6844_____________ │║  │
│  ║  └──────────────────────┘  └─────────────────────┘║  │
│  ║                                                    ║  │
│  ║  ┌──────────────────────┐  ┌─────────────────────┐║  │
│  ║  │ Salida (local)       │  │ Llegada (local)     │║  │
│  ║  │ 2026-03-15T21:35____ │  │ 2026-03-16T14:20__ │║  │
│  ║  └──────────────────────┘  └─────────────────────┘║  │
│  ║                                                    ║  │
│  ║  ┌──────────────────────┐  ┌─────────────────────┐║  │
│  ║  │ TZ salida            │  │ TZ llegada          │║  │
│  ║  │ America/Argentina▼   │  │ Europe/Madrid     ▼ │║  │
│  ║  └──────────────────────┘  └─────────────────────┘║  │
│  ║                                                    ║  │
│  ║  ▼ Más detalles                                    ║  │
│  ║                                                    ║  │
│  ║                  ┌────────────┐  ┌───────────────┐║  │
│  ║                  │[Cancelar]  │  │[Agregar tramo]│║  │
│  ║                  └────────────┘  └───────────────┘║  │
│  ╚════════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────────┘
```

**Diferencias respecto a mobile:**
- Origen + Destino en fila de 2 columnas
- Salida + Llegada en fila de 2 columnas (comparten fila visualmente, refuerza que son un par)
- TZ salida + TZ llegada en fila de 2 columnas
- Botones alineados a la derecha del container
- El `▼ Más detalles` sigue stacked bajo las timezones

---

### Pantalla 4A — Sección "Más detalles" expandida / MOBILE

**Propósito**: Mostrar campos opcionales de clase de cabina y asiento una vez que el usuario expande el toggle.
**Contexto**: Se renderiza dentro del inline form de tramo (Pantalla 3A), reemplazando la línea colapsada.

```
│  ║                              ║  │
│  ║  ▲ Más detalles              ║  │  ← Toggle en estado abierto
│  ║  ── ── ── ── ── ── ── ── ──  ║  │
│  ║                              ║  │
│  ║  Clase de cabina (opcional)  ║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ ○ Economy                │║  │
│  ║  │ ○ Premium Economy        │║  │
│  ║  │ ● Business               │║  │  ← Radio buttons, Business seleccionado
│  ║  │ ○ First                  │║  │
│  ║  └──────────────────────────┘║  │
│  ║                              ║  │
│  ║  Asiento (opcional)          ║  │
│  ║  ┌──────────────────────────┐║  │
│  ║  │ 24A________________      │║  │
│  ║  └──────────────────────────┘║  │
│  ║                              ║  │
│  ║  ┌────────────┐  ┌─────────┐ ║  │
│  ║  │[Cancelar]  │  │[Agregar]│ ║  │
│  ║  └────────────┘  └─────────┘ ║  │
│  ╚══════════════════════════════╝  │
```

**Notas:**
- La clase de cabina es un radio button group de 4 opciones (no un select dropdown) para hacer la selección táctilmente más cómoda en mobile
- En desktop puede ser un `SelectInput` estándar para no ocupar altura
- El asiento es un `TextInput` libre (formato libre: "24A", "2C", "Pasillo", etc.)
- Ambos campos son opcionales; si se dejan vacíos, no se incluyen en el leg guardado
- Colapsar con `▼ Más detalles` resetea visualmente pero no borra valores ya ingresados

### Pantalla 4B — Sección "Más detalles" expandida / DESKTOP

```
│  ║  ▲ Más detalles                                    ║  │
│  ║  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──  ║  │
│  ║                                                    ║  │
│  ║  ┌──────────────────────┐  ┌─────────────────────┐║  │
│  ║  │ Clase (opcional)     │  │ Asiento (opcional)  │║  │
│  ║  │ Business           ▼ │  │ 24A________________ │║  │
│  ║  └──────────────────────┘  └─────────────────────┘║  │
│  ║                                                    ║  │
│  ║                  ┌────────────┐  ┌───────────────┐║  │
│  ║                  │[Cancelar]  │  │[Agregar tramo]│║  │
│  ║                  └────────────┘  └───────────────┘║  │
```

**Diferencia respecto a mobile:**
- Clase de cabina pasa a `SelectInput` (dropdown) para ahorrar altura
- En una sola fila de 2 columnas: Clase + Asiento

---

## Componentes reutilizables

Solo los que no están en `DESIGN_BRIEF.md § 8`:

### `LegCard`
Card colapsada que representa un tramo ya agregado.
```
Props: leg (FlightLeg), direction ("outbound" | "inbound"), onEdit(), onDelete()
Estados: default, deleting (opacity 0.5 durante animación de salida)
```
Contenido: ícono + `IATA → IATA` + número de vuelo + fecha + horario HH:MM→HH:MM + duración + botones `[✎][✕]`.

### `InlineLegForm`
Formulario embebido dentro del sheet para capturar un tramo.
```
Props: direction ("outbound" | "inbound"), initialValues?, onAdd(leg), onCancel()
Estados: idle, validating (micro-shake en campos inválidos), saving
```
El borde de color izquierdo varía según `direction`: `#0A84FF` para outbound, `#A0A0A0` para inbound.

### `SectionHeader`
Header de sección IDA / VUELTA dentro del form.
```
Props: direction, legCount: number
```
Renderiza: ícono + label + badge numérico opcional. El badge aparece solo cuando `legCount > 0`.

---

## Edge cases

### Reserva solo ida
La sección VUELTA existe pero está en empty state durante toda la sesión. El usuario simplemente no toca `+ Agregar tramo vuelta`. Al guardar, el documento Firestore tiene todos los legs con `direction: "outbound"`. La sección VUELTA no se oculta (el usuario puede cambiar de idea y agregar vuelta después de crear la reserva).

### Reserva con 3+ tramos (conexión triple o más)
No hay límite en el número de tramos por sección. Los LegCards se apilan verticalmente y el sheet tiene scroll. El botón `+ Agregar tramo` siempre está disponible bajo las cards existentes. En un itinerario extremo (ej. 4 tramos de ida) las cards ocupan mucho vertical — este caso se acepta y el scroll del sheet lo maneja.

### Edición de tramo cuando otro tramo ya está expandido
Solo puede haber un `InlineLegForm` abierto a la vez. Si el usuario toca `[✎]` en un segundo tramo mientras hay uno expandido, el primero se cancela (si no fue guardado) o se cierra (si estaba en modo edición de un tramo existente) antes de abrir el nuevo. Se puede implementar con un estado `expandedLegIndex: number | null` en el form padre.

### Eliminar el único tramo de una sección
Si se elimina el último tramo de IDA (o VUELTA), la sección vuelve a su empty state. El botón `[ Guardar reserva ]` se deshabilita si tras la eliminación no queda ningún tramo en ninguna de las dos secciones.

### Duración negativa o incoherente
Si `arrival_local_time` < `departure_local_time` y el usuario no cambió las timezones, el inline form muestra un warning inline: `"¿Llegada antes que salida? Verificá las timezones."` (texto naranja `#FF9F0A`, debajo del campo de llegada). No bloquea guardar, porque el vuelo puede ser overnight cruzando medianoche, y la Cloud Function calcula `duration_minutes` a partir de UTC de todas formas.

### Edición post-parse con datos pre-llenados
Cuando el form se abre desde un preview post-parse (Flujo D del Design Brief), todos los campos del tramo ya tienen valores. El `InlineLegForm` arranca en estado expandido para el primer tramo con datos pre-llenados. Los tramos con confidence bajo (naranja/rojo) se abren expandidos para facilitar corrección; los de confidence alto (verde) arrancan colapsados.

### Booking ref vacío
La booking ref es opcional a nivel del formulario (el usuario puede no tenerla al momento de cargar). No bloquea el guardado. Si está vacía, se omite del documento Firestore.

---

## Handoff a Backend

### Datos que cada pantalla necesita de la API

**Pantalla 1 (form vacío):**
- No requiere datos iniciales de Firestore
- Necesita lista de timezones IANA para el selector (ya disponible en `lib/datetime.ts` como `COMMON_TIMEZONES`)
- Necesita lista de aerolíneas para autocompletado (a implementar en v1.1 — en MVP es `TextInput` libre)
- Necesita dataset de aeropuertos para autocompletado IATA: colección global `airports/{iataCode}` (seed estático ~1500 registros)

**Pantalla 2 (form con tramos cargados — edición):**
- Doc completo `users/{userId}/trips/{tripId}/flights/{flightId}` con su array `legs: FlightLeg[]`
- Shape del documento esperado:
```typescript
// FlightItinerary (doc en flights/)
{
  id: string,                          // auto-generado Firestore
  trip_id: string,
  booking_ref?: string,
  price?: number,
  currency?: string,
  price_usd?: number,
  paid_amount?: number,
  legs: FlightLeg[],
  // summary fields (calculados al guardar en Cloud Function o cliente):
  origin_iata: string,                 // primer leg outbound
  destination_iata: string,            // último leg outbound
  departure_local_time: string,        // "2026-03-15T21:35"
  departure_utc: Timestamp,
  arrival_local_time: string,
  arrival_utc: Timestamp,
  duration_minutes: number,
  parse_job_id?: string
}

// FlightLeg (array embebido, no sub-colección)
{
  direction: "outbound" | "inbound",
  airline: string,
  flight_number: string,
  origin_iata: string,
  destination_iata: string,
  departure_local_time: string,        // "2026-03-15T21:35"
  departure_timezone: string,          // "America/Argentina/Buenos_Aires"
  departure_utc: Timestamp,
  arrival_local_time: string,
  arrival_timezone: string,
  arrival_utc: Timestamp,
  duration_minutes: number,
  cabin_class?: "economy" | "premium_economy" | "business" | "first",
  seat?: string
}
```

**Cálculo de summary fields:**
Al guardar (en la Cloud Function `parseWithAI` o en el cliente al hacer submit manual), los summary fields se calculan a partir del array `legs`:
- `origin_iata` = `legs.find(l => l.direction === "outbound")?.origin_iata`
- `destination_iata` = último leg outbound destino
- `departure_local_time` / `departure_utc` = del primer leg outbound
- `arrival_local_time` / `arrival_utc` = del último leg outbound (no del de vuelta)
- `duration_minutes` = suma de `duration_minutes` de todos los legs outbound (incluye escalas — puede ajustarse a suma de vuelo efectivo si se prefiere)

**Nota sobre `duration_minutes` por leg:**
La Cloud Function debe calcular `departure_utc` y `arrival_utc` de cada leg con Luxon (como ya hace para el vuelo mono-tramo), y luego calcular `duration_minutes = Math.round((arrival_utc - departure_utc) / 60000)`. El cliente no debe calcular esto localmente.

---

*UX Spec v1.0 — 2026-04-25*
