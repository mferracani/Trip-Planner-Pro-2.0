# 🤖 Clipy — Instrucciones para el agente

Este repo está conectado con mi vault de Obsidian a través del symlink `./clipy/`.

## Al arrancar una sesión

Leé **siempre** estos archivos antes de hacer cualquier otra cosa:

1. `./clipy/Clipy agent/Clipy Agent.md` — índice del sistema de contexto.
2. `./clipy/Clipy agent/Context.md` — foco actual y estado de trabajo.
3. `./clipy/Clipy agent/Projects.md` — mapa ejecutivo de proyectos.
4. `./clipy/Clipy agent/Memory.md` — hechos estables sobre Mati.
5. `./clipy/Clipy agent/Preferences.md` — preferencias de colaboración.
6. `./clipy/Clipy agent/Proyectos/Trip Planner Pro 2.md` — contexto local de este proyecto, si existe.
7. `./clipy/Clipy agent/Proyectos/Trip Planner Pro 2/` — subnotas locales del proyecto, si existe la carpeta.
8. `./clipy/Project framework/Project-bootstrap.md` — framework multi-agente de 7 roles y 8 etapas.

Importante: no busques `Clipy Agent.md`, `Context.md` o `Projects.md` en la raíz del repo. La fuente de verdad es el symlink `./clipy/`.

Después de leer, devolvé un resumen en 8 bullets, riesgos actuales y plan concreto para la sesión. Si el proyecto tiene subnotas locales, usalas antes de inferir desde el código.

## Dónde escribir los artefactos

Este proyecto se llama **Trip Planner Pro 2**.

Los artefactos del framework (brief, discovery, scope, architecture, design, build plan, launch, post-launch) van en:

```
./clipy/Projects/Trip Planner Pro 2/
```

Escribilos directamente ahí a medida que cerramos cada gate. Confirmame cada escritura.

## Al cerrar el proyecto

Cuando lleguemos a Stage 8 (Post-launch):

1. Actualizá `./clipy/Clipy agent/Projects.md` con el estado final.
2. Generá el resumen para `./clipy/Projects archive/Trip Planner Pro 2.md` usando el template en `./clipy/Projects archive/_template.md`.
3. Agregá una entrada en `./clipy/Clipy agent/Changelog.md`.

## Contexto histórico

Si necesitás referencia de proyectos pasados, mirá `./clipy/Projects archive/`. No inventes detalles de mis proyectos — si no hay archivo, admitilo.
