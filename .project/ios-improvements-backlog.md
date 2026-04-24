# iOS Improvements Backlog — 2026-04-24

Owner inicial: product-manager.

Objetivo: ordenar mejoras iOS antes de seguir build, separando MVP, v1.1 y cambios que requieren decision de arquitectura.

## Decisiones de scope

- El foco inmediato sigue siendo iOS Fase 4, branch `feat/ios-app`.
- Se permite avanzar con ajustes iOS aunque el roadmap original marque backend como fase actual, porque ya existe implementacion iOS activa y necesita estabilizacion para TestFlight.
- Light mode queda fuera del MVP por conflicto directo con la regla del proyecto: dark mode only.
- Offline read/cache entra en MVP iOS; offline writes/sync conflict resolution queda v1.1.
- Alquiler de auto entra como item de viaje valido, pero requiere separar tipo de catalogo sin romper `transports`.

## Priorizacion

### P0 — Bloquean uso basico / TestFlight

#### Ticket 1: Permitir eliminar viaje

**Modulo:** A — Viajes  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
Hoy no se puede eliminar un viaje desde iOS. El PRD incluye archivar/eliminar/duplicar viaje.

**Acceptance Criteria**
- [ ] Desde Dashboard o detalle de viaje existe accion visible para eliminar.
- [ ] La accion pide confirmacion antes de borrar.
- [ ] Al confirmar, el viaje desaparece de la lista local.
- [ ] Si Firestore falla, se muestra error y no queda UI inconsistente.
- [ ] No se borran otros viajes.

**Scope explicito**  
Incluye: eliminar viaje.  
No incluye: duplicar viaje, archivar viaje, soft delete.

#### Ticket 2: Editar fechas del viaje y regenerar rango de dias

**Modulo:** A/B — Viajes + Calendario  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
Al editar un viaje y agregar un dia no pasa nada. Tambien se necesita poder sacar dias.

**Acceptance Criteria**
- [ ] Se puede editar fecha inicio y fecha fin.
- [ ] Si se extiende el viaje, aparecen los nuevos dias en el calendario.
- [ ] Si se acorta el viaje, los dias fuera de rango dejan de mostrarse como dias activos.
- [ ] La app advierte si al acortar quedan items fuera de rango.
- [ ] El calendario sigue mostrando 7 columnas Mon->Sun.

**Scope explicito**  
Incluye: editar metadata del viaje y recalcular calendario.  
No incluye: mover automaticamente vuelos/hoteles/transports.

#### Ticket 3: Preparar datos offline de lectura

**Modulo:** A/B/E — Cache iOS  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
El PRD pide SwiftData para cache offline. Ya hay cache parcial; hay que validar que dashboard, detalle y catalogo sigan usables sin conexion despues de sincronizar.

**Acceptance Criteria**
- [ ] Dashboard carga viajes cacheados sin red.
- [ ] Trip Detail carga vuelos/hoteles/transportes cacheados sin red.
- [ ] Catalogo carga items cacheados sin red.
- [ ] Se muestra indicador discreto si Firestore no esta disponible.
- [ ] No se prometen escrituras offline con merge/conflict resolution en MVP.

**Scope explicito**  
Incluye: lectura offline.  
No incluye: crear/editar/borrar offline con sync posterior.

### P1 — Core UX del calendario y datos

#### Ticket 4: Asignar ciudad a varios dias desde calendario

**Modulo:** B/C — Calendario + Ciudades  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
El PRD marca long-press + drag para asignar ciudad a rango como v1.1, pero es una mejora central para cargar viajes multi-ciudad rapido.

**Acceptance Criteria**
- [ ] Long press sobre un dia inicia seleccion de rango.
- [ ] Drag permite seleccionar varios dias consecutivos.
- [ ] Al soltar, aparece selector de ciudad.
- [ ] Al elegir ciudad, se actualizan los dias seleccionados.
- [ ] El calendario mantiene 7 columnas y feedback visual claro.

**Scope explicito**  
Incluye: asignar ciudad a rango.  
No incluye: drag complejo entre semanas con reorder de items.

#### Ticket 5: Reutilizar ciudades sin duplicarlas

**Modulo:** C — Ciudades  
**Fase:** 4 + revision backend  
**Agente responsable:** backend-designer -> frontend-engineer

**Contexto**  
Si se agrega Barcelona, despues debe aparecer como ciudad existente y no duplicarse. Esto ataca un pain point del PRD: repetir la misma ciudad.

**Acceptance Criteria**
- [ ] Al buscar/agregar ciudad, se muestran ciudades ya guardadas antes.
- [ ] La seleccion reutiliza la ciudad existente si coincide nombre/pais.
- [ ] No se crean duplicados triviales como `Barcelona` y `barcelona`.
- [ ] La ciudad conserva lat/lng/timezone/color cuando se reutiliza.

**Scope explicito**  
Incluye: deduplicacion y reutilizacion.  
No incluye: resolver homonimos globales complejos sin confirmacion del usuario.

**Nota PM**  
Requiere decision de arquitectura: hoy el PRD modela `cities` bajo cada trip, pero la necesidad sugiere catalogo reusable por usuario o indice local.

#### Ticket 6: Agregar mas colores de ciudades

**Modulo:** C — Ciudades  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
El Design Brief define 8 colores. Para viajes largos o muchos destinos conviene ampliar la paleta sin perder contraste en dark mode.

**Acceptance Criteria**
- [ ] Hay mas de 8 colores disponibles.
- [ ] Todos mantienen contraste legible en dark mode.
- [ ] La asignacion sigue siendo automatica y estable.
- [ ] No rompe colores ya asignados a ciudades existentes.

**Scope explicito**  
Incluye: ampliar paleta y mapping.  
No incluye: editor manual avanzado de color.

### P2 — UX polish y navegacion

#### Ticket 7: Agregar gesto swipe para volver

**Modulo:** Navegacion iOS  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Acceptance Criteria**
- [ ] Swipe back funciona en pantallas push con NavigationStack.
- [ ] No interfiere con gestos del calendario.
- [ ] Sheets siguen cerrandose con gesto nativo.

#### Ticket 8: Formatear monedas con simbolo correcto

**Modulo:** F — Gastos + FX  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Acceptance Criteria**
- [ ] USD se muestra con `$`.
- [ ] EUR se muestra con `€`.
- [ ] El codigo de moneda se mantiene cuando haya ambiguedad.
- [ ] El formato es consistente en Dashboard, Catalogo, Detail y formularios.

#### Ticket 9: Ver detalle desde Catalogo

**Modulo:** E — Vuelos / Hoteles / Transportes  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Acceptance Criteria**
- [ ] Tap en vuelo abre detalle del vuelo.
- [ ] Tap en hotel abre detalle del hotel.
- [ ] Tap en transporte abre detalle del transporte.
- [ ] El detalle muestra precio, moneda, fechas, horarios, booking ref y notas si existen.

#### Ticket 10: Separar alquiler de auto en Catalogo

**Modulo:** E — Transportes  
**Fase:** 4 + revision backend ligera  
**Agente responsable:** backend-designer -> frontend-engineer

**Contexto**  
Alquiler de auto no deberia mezclarse visualmente con traslados. Puede seguir siendo item de transporte a nivel data si conviene, pero necesita categoria propia en UI.

**Acceptance Criteria**
- [ ] Catalogo muestra seccion/tab propia para alquileres de auto.
- [ ] Los traslados no incluyen autos alquilados.
- [ ] Crear/editar item permite elegir alquiler de auto.
- [ ] No rompe transportes existentes.

### P3 — Dashboard y visual polish

#### Ticket 11: Redisenar inicio como resumen de viajes

**Modulo:** A — Dashboard  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Contexto**  
La home deberia sentirse mas como resumen personal: mapa/planisferio con ciudades visitadas y cards con metricas.

**Acceptance Criteria**
- [ ] Home muestra resumen visual de ciudades visitadas o planificadas.
- [ ] Incluye cards de metricas: ciudades, vuelos, hoteles, dias viajando y gasto si hay datos.
- [ ] Mantiene CTA claro para crear viaje o abrir viaje proximo.
- [ ] No depende de datos externos para renderizar.

**Scope explicito**  
Incluye: resumen local con datos existentes.  
No incluye: mapa interactivo avanzado ni proveedor externo de mapas.

#### Ticket 12: Agregar bandera al icono redondo

**Modulo:** C / UI polish  
**Fase:** 4 — iOS  
**Agente responsable:** frontend-engineer

**Acceptance Criteria**
- [ ] Ciudad/pais muestra bandera cuando hay country code disponible.
- [ ] Fallback limpio cuando no hay pais.
- [ ] No reemplaza el color de ciudad, lo complementa.

### Fuera de MVP

#### Light mode

**Decision PM:** rechazado para MVP.  
**Razon:** contradice `CLAUDE.md`, AGENTS.md y Design Brief: dark mode only, sin excepcion.  
**Puede reabrirse:** post-MVP si el usuario decide cambiar la direccion visual del producto.

## Orden recomendado de implementacion

1. Eliminar viaje.
2. Editar fechas y recalcular dias.
3. Detalle desde Catalogo.
4. Monedas con simbolo correcto.
5. Reutilizar ciudades sin duplicar (requiere backend-designer antes).
6. Asignar ciudad a rango con long-press/drag.
7. Mas colores de ciudades.
8. Alquiler de auto separado.
9. Offline read/cache.
10. Swipe back.
11. Redisenar inicio como resumen.
12. Bandera en icono.

## Handoff inmediato

Siguiente agente: `frontend-engineer`.

Primer ticket recomendado: **Permitir eliminar viaje**. Es chico, esta en PRD, desbloquea uso basico y sirve para validar el flujo de edicion Firestore/iOS antes de cambios mas grandes.
