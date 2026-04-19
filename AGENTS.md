# Agent Kit — Trip Planner Pro 2

> **Cómo usar:** Los agentes viven en `.claude/agents/`. Claude Code los detecta automáticamente. Invocalos con `@nombre-del-agente` o pidiendo "actuá como el PM / arquitecto / etc."
>
> **Contexto del proyecto:** Leé siempre `CLAUDE.md` (raíz) antes de actuar. Contiene stack, convenciones y scope MVP.

---

## Framework: 3 Gates, 6 Agentes

Todo feature o fase pasa por 3 gates. **No se puede saltar un gate sin aprobación explícita del usuario.**

```
┌─────────────────────────────────────────────────────────────┐
│ GATE 1 — Problema definido                    ✅ APROBADO   │
│   Owner: Product Manager                                     │
│   Output: docs/PRD.md                                        │
│   Estado: PRD v1.0 completo (2026-04-19)                     │
├─────────────────────────────────────────────────────────────┤
│ GATE 2 — Solución + Diseño                    ✅ APROBADO   │
│   Owner: UX Designer                                         │
│   Output: docs/DESIGN_BRIEF.md                               │
│   Estado: Design Brief v1.0 completo (2026-04-19)            │
│   Wireframes: pendientes (Claude Design)                     │
├─────────────────────────────────────────────────────────────┤
│ GATE 3 — Build                                ⏳ EN CURSO   │
│   Secuencia: Backend → Frontend → Security → QA              │
│   Fase actual: Backend — Firebase setup (Semana 1)           │
└─────────────────────────────────────────────────────────────┘
```

### Los 6 agentes

| # | Agente | Cuándo entra | Output principal |
|---|--------|-------------|------------------|
| 1 | **product-manager** | Validar scope, escribir tickets | docs/PRD.md (ya hecho) |
| 2 | **ux-designer** | Revisar flows, generar UX spec | docs/ux-spec.md |
| 3 | **backend-designer** | Firebase schema, Cloud Functions, security rules | docs/backend-spec.md |
| 4 | **frontend-engineer** | Next.js web + iOS SwiftUI | componentes + páginas |
| 5 | **security-reviewer** | Auditoría pre-build y pre-merge | .project/security-review.md |
| 6 | **qa-engineer** | Tests por fase | .project/qa-checklist.md |

### Stack del proyecto (NO negociable)

| Capa | Tecnología |
|------|------------|
| iOS | Swift 6, SwiftUI, iOS 17+, SwiftData |
| Web | Next.js 15 App Router, React 19, Tailwind 4, shadcn/ui, TanStack Query |
| Backend | **Firebase** (Firestore + Auth + Storage + Cloud Functions v2 Node.js 20) |
| Auth | Sign in with Apple → Firebase Auth |
| IA texto | Claude Sonnet 4.5 (server-side en Cloud Function) |
| IA multimodal | Gemini 2.5 Flash (server-side en Cloud Function) |
| Deploy web | Vercel |

> ⚠️ Este proyecto usa **Firebase, no Supabase**. Ver `CLAUDE.md` para el contexto completo.

### State file compartido

Todos los agentes leen y actualizan `.project/state.md` en cada turno.

---

## Reglas del sistema (válidas para todos los agentes)

- **`CLAUDE.md` y `.project/state.md` son la fuente de verdad.** Leelos siempre primero.
- **Gates no se saltan.** Ningún agente avanza sin aprobación del usuario.
- **Handoffs explícitos.** Cada agente termina su turno diciendo a quién invocar después.
- **Sin drift de rol.** El PM no escribe código. El frontend no inventa endpoints. Etc.
- **Scope MVP fijo.** Vuelos + hoteles + transportes. Nada más. Consultá al PM antes de agregar.
- **Dark mode only.** En toda la app (iOS y web). Sin excepción.
- **Preguntá cuando falta contexto.** Mejor pausar y preguntar que inventar.

---

## Cómo arrancar cada fase

```bash
# Validar scope de un feature nuevo:
# "Actuá como @product-manager y validá si [feature] entra en el MVP"

# Diseñar un flow nuevo:
# "Actuá como @ux-designer y definí el flow de [pantalla]"

# Implementar Firebase:
# "Actuá como @backend-designer y arrancá con Firebase setup (Fase 1 del ROADMAP)"

# Implementar web UI:
# "Actuá como @frontend-engineer y arrancá con el Dashboard (Fase 2 del ROADMAP)"

# Revisar seguridad:
# "Actuá como @security-reviewer y auditá el backend-spec antes de implementar"

# Cerrar fase con tests:
# "Actuá como @qa-engineer y generá el checklist de la Fase 2"
```
