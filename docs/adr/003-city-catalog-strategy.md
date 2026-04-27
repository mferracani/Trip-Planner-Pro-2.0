# ADR 003 — Estrategia de ciudades reutilizables cross-trip

**Estado:** Aceptado  
**Fecha:** 2026-04-27  
**Autor:** Backend Designer

---

## Contexto

El schema actual modela ciudades como subcolección de cada trip (`users/{userId}/trips/{tripId}/cities/{cityId}`). Cada documento de ciudad tiene nombre, país, color (hex), timezone, lat/lng y el array `days[]` de fechas que ocupa en ese viaje.

El problema aparece a partir del segundo viaje: si Mati ya viajó a Barcelona, quiere poder reutilizar esa ciudad — con su color, timezone y coordenadas ya configurados — sin tener que escribirlo de nuevo. Hoy eso no es posible sin buscar manualmente en trips anteriores.

### Opciones evaluadas

**Opción A — Catálogo global por usuario** (`users/{userId}/city_catalog/{cityId}`)  
Cada ciudad creada se denormaliza en un catálogo global. `trips/{tripId}/cities/{cityId}` pasa a ser una referencia + campos específicos del viaje (days, color override). Requiere 2 writes por ciudad y migración de todos los documentos de ciudad existentes. Añade complejidad de consistencia: si el usuario edita el nombre en una instancia, el catálogo queda desincronizado.

**Opción B — Cities por trip + collectionGroup query para sugerencias**  
Schema actual sin tocar. Al abrir "Nueva ciudad", la app hace `collectionGroup("cities").where("trip_id", "in", tripIds)` para traer ciudades de viajes anteriores como sugerencias. El usuario elige una sugerencia y la app crea una copia en el nuevo trip. Pro: cero migración. Contra: necesita un índice `collectionGroup` en `cities` sobre `trip_id`; también necesita que `tripIds` estén disponibles al momento de la query (máx 10 IDs por `in`, suficiente para este proyecto single-user).

**Opción C — LocalFirst: catálogo en SwiftData**  
La app iOS mantiene en SwiftData un índice de ciudades derivado de los trips cacheados. Sin cambios de schema ni reads adicionales a Firestore. Contra: solo disponible en iOS (no en web sin equivalente), y el catálogo está vacío hasta que al menos un trip se haya sincronizado.

---

## Decisión

**Opción B — Cities por trip, collectionGroup query para sugerencias.**

El schema actual no cambia. Al crear una nueva ciudad, la app consulta ciudades de viajes previos y presenta sugerencias. Si el usuario elige una, se crea una copia con los datos de esa ciudad (nombre, country, timezone, lat, lng) en el nuevo trip — con su propio `color` y `days[]` independientes.

### Justificación

- **Cero migración.** Los documentos de ciudad que ya existen en Firestore son válidos tal cual.
- **Single source of truth por viaje.** El color y los días de una ciudad son propiedades del viaje, no de la ciudad abstracta. Barcelona puede ser azul en el viaje de marzo y naranja en el de octubre — eso es correcto y deseable.
- **Escala suficiente.** Para un usuario único con decenas de viajes, un `in` query con hasta 10 trip IDs es barato. No hay necesidad de infraestructura de catálogo.
- **Web parity trivial.** La misma query funciona en el SDK web de Firestore. Opción C requeriría un equivalente en IndexedDB para el cliente web, que es trabajo extra sin beneficio real.
- **Complejidad proporcional al problema.** Para un proyecto personal MVP, un catálogo global (Opción A) es over-engineering. La Opción B resuelve el caso de uso con una query y nada más.

---

## Implementación requerida

### 1. Nuevo índice en `firestore.indexes.json`

Agregar índice collectionGroup sobre `cities` para poder hacer la query de sugerencias:

```json
{
  "collectionGroup": "cities",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "trip_id", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

Este índice ya requiere que el campo `trip_id` exista en todos los documentos de ciudad. El schema en `types.ts` ya lo tiene como `trip_id: string | null`. Al crear ciudades nuevas, siempre escribir `trip_id` con el ID del viaje.

### 2. Lógica de sugerencias en el cliente (iOS y web)

Al abrir el form de nueva ciudad:

1. Obtener los IDs de los trips del usuario (ya en cache local).
2. Hacer `collectionGroup("cities").where("trip_id", "in", tripIds).limit(50)`.
3. Deduplicar por nombre normalizado (lowercase, sin acentos) para no mostrar "Barcelona" tres veces.
4. Presentar lista de sugerencias. Al elegir una, pre-rellenar nombre, country, country_code, timezone, lat, lng — pero NO el color ni los days (esos son propios del nuevo viaje).

### 3. Constraint: tripIds en el query

El operador `in` de Firestore soporta hasta 10 valores. Para un usuario personal con historial largo, tomar los 10 trips más recientes como fuente de sugerencias es suficiente. Si en el futuro se necesitan más, el query se puede paginar con múltiples batches.

---

## Consecuencias

- **Positivas:** Schema estable, sin migración, web y iOS con la misma implementación de datos, independencia de color/días por viaje.
- **Negativas:** La deduplicación de sugerencias es responsabilidad del cliente. Si el nombre de una ciudad cambia en un viaje (ej. "Buenos Aires" vs "Bs As"), aparecerán como sugerencias separadas — aceptable para MVP.
- **No afecta:** Las reglas de seguridad existentes (`request.auth.uid == userId` cubre toda la jerarquía bajo `users/{userId}`). Un collectionGroup query contra `cities` sigue respetando esa regla siempre que el query incluya el `userId` en el path o se haga desde el contexto del usuario autenticado.

---

## Alternativas descartadas

- **Opción A** descartada: migración costosa, complejidad de consistencia en dos sentidos (catalog ↔ trip instance), y denormalización innecesaria para un usuario único.
- **Opción C** descartada: rompe la paridad iOS/web y depende de que el cache local esté hidratado antes de mostrar sugerencias — caso edge frecuente en un dispositivo nuevo o tras reinstalar.
