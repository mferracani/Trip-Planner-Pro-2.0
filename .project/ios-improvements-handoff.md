# iOS Improvements Handoff — 2026-04-24

## Punto de reentrada

Leer primero:

1. `CLAUDE.md`
2. `.project/state.md`
3. `.project/ios-improvements-backlog.md`
4. `.project/qa-checklist-fase4.md`

## Estado actual

- Rama esperada: `feat/ios-app`.
- Foco: estabilizar y mejorar iOS antes de TestFlight.
- No cerrar QA hasta compilar/probar en una Mac con Xcode.
- Esta computadora puede usarse para desarrollo si se instala Xcode/XcodeGen, pero signing, App Groups, Share Extension real y TestFlight deberían cerrarse en la Mac mini principal.

## Backlog activo

Backlog PM completo: `.project/ios-improvements-backlog.md`.

Orden recomendado:

1. Eliminar viaje.
2. Editar fechas y recalcular dias.
3. Ver detalle desde Catalogo.
4. Formatear monedas con `$` y `€`.
5. Ciudades reutilizables sin duplicar.
6. Asignar ciudad a rango con long-press/drag.
7. Mas colores de ciudades.
8. Alquiler de auto separado.
9. Offline read/cache.
10. Swipe back.
11. Redisenar inicio como resumen/mapa.
12. Bandera en icono.

## Proximo agente

`frontend-engineer`

Primer ticket:

**Permitir eliminar viaje**

Archivo fuente del ticket: `.project/ios-improvements-backlog.md`.

## Notas de scope

- Light mode queda fuera del MVP por regla del proyecto: dark mode only.
- Ciudades reutilizables y alquiler de auto separado pueden parecer UI, pero afectan datos/modelo. Validar estrategia antes de implementar.
- Offline en MVP significa lectura/cache offline. Escrituras offline con conflict resolution quedan para v1.1.

## Git / maquinas

Antes de cambiar de computadora:

```bash
git status --short --branch
git add ...
git commit -m "..."
git push
```

En la otra computadora:

```bash
git pull
git status --short --branch
```

Evitar cambios sin commit en dos maquinas al mismo tiempo.
