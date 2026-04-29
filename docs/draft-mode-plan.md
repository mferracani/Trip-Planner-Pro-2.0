# Plan: Modo Borrador (Draft Mode)

> Documento de producto. Generado por PM agent — 2026-04-25. Actualizado con decisiones del usuario — 2026-04-25.
> Source of truth: `docs/PRD.md`. Estado del proyecto: `.project/state.md`.

## Decisiones cerradas del usuario (2026-04-25)

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Borrador puede tener cero fechas? | **No.** Requiere al menos una fecha de inicio, pero editable con +/- días y cambio de mes fácil (no free text) |
| 2 | ¿Tab "Todos" excluye borradores? | **Sí.** Borradores solo en tab "Borradores" |
| 3 | ¿"Confirmar viaje" solo en detalle? | **En ambos:** card del Dashboard de borradores Y en TripDetailPage |
| 4 | Flujo de creación | **Al crear un viaje nuevo, preguntar primero:** "¿Es un viaje confirmado o borrador?" — dos paths separados en el modal |

---

## 1. Decisión de scope

**El Modo Borrador entra en el MVP.**

Justificación:
- El PRD §4.1 ya define los estados del viaje como "Planeado / En curso / Pasado". El estado `draft` es un predecesor natural de "Planeado" que no estaba explicitado, pero el PRD no lo excluye y no contradice ninguna regla de scope.
- El usuario (Mati) lo necesita para planificar viajes antes de tener fechas o bookings confirmados, que es exactamente el flujo de uso real para un viaje en preparación.
- No agrega dependencias externas, no requiere nueva infra, no abre la puerta a multi-usuario ni a ninguna de las exclusiones listadas en CLAUDE.md.
- La complejidad es acotada: un campo `status` en Firestore + una sección nueva en el Dashboard + un formulario de creación simplificado + un botón de confirmación.

**Decisión**: aprobado para MVP. Se implementa en Fase 2 (Web UI) y Fase 4 (iOS) como parte del módulo A — Viajes.

---

## 2. Análisis de impacto

### 2.1 Problema que resuelve

Hoy no hay forma de crear un viaje cuando las fechas, vuelos y hoteles todavía no están cerrados. El formulario actual (`CreateTripModal`) requiere `start_date` y `end_date`. Un viaje "Japón 2027" que Mati está considerando pero aún sin fechas no tiene dónde vivir en el sistema.

El modo borrador permite:
1. Crear un viaje con fechas tentativas o sin fechas.
2. Ir agregando vuelos, hoteles y transportes de referencia mientras se investiga.
3. Promoverlo a "viaje confirmado" cuando está listo, con un tap.

### 2.2 Schema de Firestore

**Campo nuevo en `trips/{tripId}`**:

```
status: "draft" | "planned" | "active" | "past"
```

Notas sobre el campo:
- El PRD ya tenía "Planeado / En curso / Pasado" pero no los tenía como valores explícitos en el schema documentado (§6.1). Este ticket los formaliza.
- `draft` es el único estado nuevo. Los otros tres son renombrado de los estados conceptuales del PRD.
- Un viaje con `status: "draft"` puede tener `start_date` y `end_date` como strings vacíos (`""`) o como fechas tentativas. Esto requiere que los componentes que leen esas fechas sean defensivos.
- Todos los viajes creados antes de este cambio se consideran `planned` (migration implícita: si no tiene campo `status`, classifyTrip lo trata como no-draft y aplica la lógica de fechas existente).

**Campos opcionales nuevos en `trips/{tripId}`** (solo para borradores):

```
is_tentative_dates: boolean           // true cuando el viaje es un borrador con fechas estimadas
```

Decisión: las fechas de los borradores son **fechas reales en formato ISO** (`"2027-06-15"`), no texto libre. El usuario las ingresa y ajusta con un picker que permite:
- Sumar/restar días con botones `+` / `-`
- Cambiar mes con selector de mes
- NO es un calendar-day picker completo — es un control liviano de ajuste rápido

Esto simplifica el schema: `start_date` y `end_date` son siempre strings ISO válidos o `""` (solo si el usuario no ingresó fecha aún, que no debería ocurrir dado que la fecha es requerida). Los campos `tentative_start_date` y `tentative_end_date` se eliminan del plan.

### 2.3 Impacto en `classifyTrip()` — Dashboard.tsx

La función actual en `/web/next/components/Dashboard.tsx`:

```typescript
function classifyTrip(trip: Trip): "active" | "future" | "past" {
  const today = new Date().toISOString().split("T")[0];
  if (trip.end_date < today) return "past";
  if (trip.start_date > today) return "future";
  return "active";
}
```

Problemas con borradores:
1. Si `start_date` es `""`, la comparación `"" < today` es `true`, lo clasifica como "past" — incorrecto.
2. Si `start_date` es `""`, aparece en el Hero del Dashboard (lógica `heroTrip = activeTrip ?? nextTrip`), lo que no tiene sentido.

**Nueva lógica requerida**:

```typescript
function classifyTrip(trip: Trip): "draft" | "active" | "future" | "past" {
  if (trip.status === "draft") return "draft";
  const today = new Date().toISOString().split("T")[0];
  if (!trip.end_date || trip.end_date < today) return "past";
  if (!trip.start_date || trip.start_date > today) return "future";
  return "active";
}
```

Cambios derivados en Dashboard.tsx:
- `heroTrip`: excluir borradores del cálculo (`trips.filter(t => classifyTrip(t) !== "draft")`).
- Filtros de la lista ("Todos / Futuros / En curso / Pasados"): agregar tab "Borradores" o excluir borradores del "Todos" y moverlos a sección separada. Ver decisión en §3.
- `TripCard` y `HeroTripCard`: deben manejar `status === "draft"` sin crashear cuando `start_date === ""`.

### 2.4 Impacto en TripDetailPage.tsx

Líneas críticas que calculan `totalDays` y `dateRange` usando `start_date`/`end_date`:

```typescript
// Línea 111-116 — totalDays
const totalDays = Math.ceil(
  (new Date(trip.end_date + "T00:00:00").getTime() -
    new Date(trip.start_date + "T00:00:00").getTime()) /
    86400000
) + 1;
```

Si `start_date = ""`, `new Date("T00:00:00")` produce `Invalid Date` → el cálculo explota.

**Defensa requerida**:

```typescript
const hasDates = !!trip.start_date && !!trip.end_date;
const totalDays = hasDates
  ? Math.ceil(...) + 1
  : null;
```

El calendario (`CalendarView`) debe mostrar un estado vacío amigable cuando no hay rango de fechas definido en un borrador, en lugar de intentar renderizar un grid vacío.

### 2.5 Impacto en tipos TypeScript — types.ts

Cambio en `Trip`:

```typescript
export interface Trip {
  id: string;
  name: string;
  status: "draft" | "planned" | "active" | "past"; // NUEVO — antes implícito
  start_date: string;   // puede ser "" en borradores
  end_date: string;     // puede ser "" en borradores
  tentative_start_date?: string | null;  // NUEVO — texto libre
  tentative_end_date?: string | null;    // NUEVO — texto libre
  is_tentative_dates?: boolean;          // NUEVO
  cover_url?: string;
  total_usd: number;
  cities_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### 2.6 Impacto en Security Rules

Las reglas actuales no necesitan cambio. La regla `match /users/{userId}/{document=**}` cubre cualquier campo nuevo dentro del documento `trip`. No hay nueva colección ni subcolección.

Lo que sí hay que considerar: si en el futuro se quisiera listar borradores separadamente desde el servidor (query `where("status", "==", "draft")`), no hay implicación de seguridad porque el usuario solo accede a sus propios datos.

### 2.7 Sección "Borradores" en el Dashboard — decisión de UX

**Opción A**: tab adicional "Borradores" en el filtro de lista (junto a Todos / Futuros / En curso / Pasados).
- Pro: simple, un solo lugar para ver todo.
- Con: el tab "Todos" incluiría borradores y podría confundir.

**Opción B**: sección separada encima de "Mis viajes", con header "Borradores" colapsable.
- Pro: claridad — los borradores son un concepto diferente, no son viajes confirmados.
- Con: más componentes a mantener.

**Decisión**: Opción A, con ajuste: el tab "Todos" NO incluye borradores. Los borradores solo aparecen en el tab "Borradores". Racionalmente: un borrador no es todavía "un viaje", es una intención. El usuario tiene que ir explícitamente a verlos.

El filtro queda: `["Todos", "Futuros", "En curso", "Pasados", "Borradores"]` — en ese orden, con "Borradores" al final.

### 2.8 Formulario de creación — flujo bifurcado

**Decisión del usuario**: al crear un viaje nuevo, el modal pregunta primero si es un viaje confirmado o borrador.

Flujo:

```
CreateTripModal abre
    │
    ├─ Paso 1: ¿Confirmado o Borrador?
    │   [Confirmado]          [Borrador]
    │       │                     │
    │   Paso 2A: form actual   Paso 2B: form simplificado
    │   - Nombre               - Nombre
    │   - start_date (ISO)     - start_date (fecha estimada, requerida)
    │   - end_date (ISO)       - end_date (fecha estimada, requerida)
    │   - Portada              - Portada (opcional)
    │   Crea con               - Picker liviano: +/- días, cambio de mes
    │   status: "planned"      Crea con status: "draft"
    │                          is_tentative_dates: true
```

El picker de fechas tentativas (Paso 2B) es diferente al date picker del Paso 2A:
- Muestra: `Junio 2027` con flechas `◀ ▶` para cambiar mes
- Dentro del mes muestra el día con `−` y `+` buttons
- No hay grilla de calendario — solo el control compacto
- Es lo suficientemente sencillo para una fecha "por ahí junio, empezamos el 15"

El modal existente (`CreateTripModal.tsx`) se extiende con un step inicial — no se crea un modal nuevo.

### 2.9 Botón "Confirmar viaje"

Aparece en **dos lugares** (decisión del usuario):
1. En la **TripCard** del tab "Borradores" del Dashboard — acción secundaria visible directamente en la card
2. En el **banner de TripDetailPage** de un borrador

Diseño del banner en TripDetailPage:
```
[Banner] Este viaje está en borrador · las fechas son tentativas
[Botón] Confirmar viaje →
```

Al tocar "Confirmar viaje" (desde cualquier punto de entrada):
1. `start_date` y `end_date` ya son fechas ISO válidas (por decisión del flujo de creación).
2. Se actualiza `status` de `"draft"` a `"planned"` en Firestore. `is_tentative_dates` → `false`.
3. Post-confirmación: el viaje desaparece de "Borradores" y aparece en "Futuros" (o "En curso").

En iOS: mismo flujo, botón en card y banner en TripDetailView.

---

## 3. Componentes afectados

| Componente | Cambio requerido | Prioridad |
|---|---|---|
| `web/next/lib/types.ts` | Agregar `status`, `tentative_start_date`, `tentative_end_date`, `is_tentative_dates` a `Trip` | Alta |
| `web/next/components/Dashboard.tsx` | Actualizar `classifyTrip()`, filtros, excluir borradores del hero | Alta |
| `web/next/components/CreateTripModal.tsx` | Toggle "fechas exactas / tentativas", campo texto libre, `status: "draft"` al crear | Alta |
| `web/next/components/TripCard.tsx` | Manejar `status === "draft"`, mostrar fechas tentativas si las tiene | Alta |
| `web/next/components/TripDetail/TripDetailPage.tsx` | Defensa en `totalDays`/`dateRange`, banner de borrador, botón Confirmar | Alta |
| `web/next/lib/firestore.ts` | `createTrip()` acepta `status` opcional, `updateTripStatus()` nueva función | Alta |
| `ios/.../TripDetailView.swift` | Banner + botón "Confirmar viaje" en borradores | Media |
| `ios/.../Dashboard*.swift` | Sección/tab Borradores, excluir del hero | Media |
| `ios/.../CreateTripSheet.swift` | Toggle fechas tentativas | Media |

---

## 4. Ticket ejecutable

```markdown
## Ticket: Implementar Modo Borrador en Web (Dashboard + TripDetail + Firestore)

**Módulo:** A — Viajes
**Fase:** 2
**Agente responsable:** @frontend-engineer

### Contexto
El usuario necesita poder crear un viaje antes de tener fechas y bookings confirmados.
Hoy `CreateTripModal` requiere fechas obligatorias y `classifyTrip()` asume que
`start_date`/`end_date` son siempre strings ISO válidos. Este ticket agrega el
estado `draft` al schema de Firestore y actualiza todos los puntos de consumo en
la web.

### Acceptance Criteria

**Schema y tipos**
- [ ] `Trip` en `types.ts` incluye `status: "draft" | "planned" | "active" | "past"` (campo requerido con default `"planned"` para retrocompatibilidad)
- [ ] `Trip` incluye `tentative_start_date?: string | null`, `tentative_end_date?: string | null`, `is_tentative_dates?: boolean`
- [ ] `start_date` y `end_date` pueden ser `""` sin crashear ningún componente

**Firestore**
- [ ] `createTrip()` en `firestore.ts` acepta `status` como parámetro opcional (default `"planned"`)
- [ ] Nueva función `updateTripStatus(userId, tripId, newStatus: "draft" | "planned")` en `firestore.ts`
- [ ] Los trips existentes sin campo `status` se leen correctamente (classifyTrip los trata como non-draft)

**Dashboard**
- [ ] `classifyTrip()` retorna `"draft"` cuando `trip.status === "draft"`, sin tocar la lógica de fechas para los demás
- [ ] Los borradores NO aparecen en el Hero (ni como activeTrip ni como nextTrip)
- [ ] El filtro de lista tiene un tab "Borradores" al final: `["Todos", "Futuros", "En curso", "Pasados", "Borradores"]`
- [ ] El tab "Todos" NO incluye borradores
- [ ] Los borradores se muestran en `TripCard` con badge "Borrador" en lugar de "En curso" / "Futuro" / "Pasado", usando color neutro (no el amarillo de "En curso")
- [ ] Si el borrador tiene `tentative_start_date`, se muestra ese texto en lugar del rango de fechas. Si no tiene ninguna fecha, se muestra "Fechas por definir"

**CreateTripModal — flujo bifurcado**
- [ ] Paso 1 nuevo: pantalla inicial del modal muestra dos opciones: "Confirmado" / "Borrador" (antes de mostrar el form de datos)
- [ ] Path "Confirmado": form actual sin cambios, crea con `status: "planned"`
- [ ] Path "Borrador": form simplificado con nombre (requerido) + picker de fecha de inicio tentativa (requerido) + picker de fecha de fin tentativa (requerido) + portada (opcional)
- [ ] El picker de fechas tentativas es un control liviano: muestra mes/año con flechas `◀ ▶`, día con botones `−` / `+`. No es un calendar grid completo
- [ ] Borrador crea con `status: "draft"`, `is_tentative_dates: true`, fechas ISO válidas
- [ ] Nombre requerido en ambos paths

**TripCard (borradores en Dashboard)**
- [ ] La TripCard de un borrador muestra badge "Borrador" con color neutro (gris, no amarillo)
- [ ] Muestra las fechas tentativas con label "Fechas tentativas" o icono de calendario con `~` prefix
- [ ] Tiene un botón "Confirmar" visible en la card (no requiere abrir el detalle)
- [ ] Al tocar "Confirmar" en la card: llama a `updateTripStatus(uid, tripId, "planned")` y refresca

**TripDetailPage (borrador)**
- [ ] Si `trip.status === "draft"`, mostrar banner en la parte superior con texto: "Este viaje está en borrador · las fechas son tentativas"
- [ ] El banner tiene botón "Confirmar viaje" que llama a `updateTripStatus(uid, tripId, "planned")` y refresca
- [ ] `is_tentative_dates` se setea a `false` al confirmar
- [ ] El `totalDays` y `dateRange` funcionan correctamente para fechas ISO de borradores (no tienen caso vacío — las fechas son siempre válidas en borradores bien formados)
- [ ] El `CalendarView` muestra el calendario normalmente (las fechas son ISO válidas). Banner de "borrador" en la parte superior del detail es suficiente contexto

### Scope explícito
**Incluye:**
- Cambios en tipos TypeScript
- Cambios en Dashboard, CreateTripModal, TripCard, TripDetailPage
- Nueva función `updateTripStatus` en firestore.ts
- Defensa defensiva en todo componente que lea `start_date`/`end_date`

**NO incluye:**
- iOS (ticket separado en Fase 4)
- Migración automática de viajes existentes en Firestore (se maneja con retrocompatibilidad en código)
- Borrador con múltiples versiones / histórico de cambios
- Compartir borradores

### Referencias
- PRD §4.1 — Módulo A, estados del viaje
- `web/next/components/Dashboard.tsx` — `classifyTrip()` línea 27-32
- `web/next/components/TripDetail/TripDetailPage.tsx` — `totalDays` línea 111-116
- `web/next/lib/types.ts` — interface `Trip`
- `web/next/lib/firestore.ts` — `createTrip()`, agregar `updateTripStatus()`
```

---

## 5. Ticket iOS (Fase 4)

```markdown
## Ticket: Modo Borrador en iOS (Dashboard + TripDetailView + CreateTripSheet)

**Módulo:** A — Viajes
**Fase:** 4
**Agente responsable:** @ios-dev
**Dependencia:** Ticket web de Modo Borrador debe estar mergeado primero (el campo `status` en Firestore ya existirá)

### Contexto
Paridad con la web: el iOS debe leer el campo `status` de Firestore, mostrar
borradores en sección separada del Dashboard y permitir confirmar el viaje desde
el TripDetailView.

### Acceptance Criteria

- [ ] El modelo `Trip` en Swift incluye `status: String` (con default `"planned"` para docs sin el campo) y `tentativeStartDate: String?`
- [ ] `FirestoreClient` deserializa `status` correctamente. Trips sin campo `status` se decodifican con `"planned"` por defecto
- [ ] En el Dashboard iOS, los borradores no aparecen en el hero ni en las secciones "Próximos" / "En curso"
- [ ] Dashboard muestra sección "Borradores" separada debajo de las listas de viajes activos, colapsable
- [ ] `TripCard` de borrador muestra badge "Borrador" con color gris/neutro
- [ ] Si el trip tiene `tentativeStartDate`, lo muestra en lugar del rango de fechas
- [ ] `CreateTripSheet`: toggle "Fechas exactas / Tentativas". Modo tentativo guarda `status: "draft"`, `start_date: ""`, `end_date: ""`, `tentative_start_date: <texto>`
- [ ] En TripDetailView de un borrador: banner en la parte superior "Este viaje está en borrador"
- [ ] Banner tiene botón "Confirmar viaje" que abre un sheet para ingresar fechas exactas y luego escribe `status: "planned"` en Firestore
- [ ] CalendarView en borrador sin fechas muestra empty state descriptivo, no crashea
- [ ] Build Debug iOS Simulator compila sin errores

### Scope explícito
**Incluye:** Dashboard iOS, CreateTripSheet, TripDetailView, modelo Trip Swift, FirestoreClient
**NO incluye:** Web (ya cubierto en ticket anterior), widget iOS, notificaciones

### Referencias
- PRD §4.1 — estados del viaje
- `ios/TripPlannerPro/` — estructura existente
- Ticket web de Modo Borrador (este documento §4)
```

---

## 6. Decisiones cerradas — todas resueltas (2026-04-25)

| Pregunta | Decisión |
|---|---|
| ¿Borrador sin fechas? | No. Requiere fecha de inicio y fin (ISO), picker liviano +/- días |
| ¿Tab "Todos" excluye borradores? | Sí |
| ¿Límite de borradores? | Sin límite (uso personal) |
| ¿Botón "Confirmar" dónde? | En la card del Dashboard de borradores Y en el banner de TripDetailPage |
| ¿Flujo de creación? | Modal pregunta primero: "¿Confirmado o Borrador?" — dos paths |

**Listo para implementar.** No hay preguntas abiertas.

---

*Plan generado por PM agent — 2026-04-25. Decisión de scope registrada en `.project/state.md`.*
