# ✈️ Trip Planner Pro 2

> v2 de TripLog. Misma calidad visual del calendario, carga de datos radicalmente mejor via parse con IA.

**One-liner**: App de planificación de viajes multi-ciudad con calendario visual Mon→Sun, donde la carga de vuelos, hoteles y transportes se hace pegando el email de la confirmación, subiendo el PDF del boarding pass, o escribiendo en lenguaje natural. Claude parsea texto y Gemini parsea documentos.

---

## 🎯 Propuesta de valor

*"Organizá tus viajes pegando el email del booking. La IA arma el resto."*

Un viaje a Europa con 4 ciudades, 3 vuelos y 5 hoteles: TripLog v1 tomaba ~45 minutos de carga manual. Trip Planner Pro 2: menos de 10 minutos con parse por IA.

---

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| **iOS** | Swift 6 · SwiftUI · iOS 17+ · SwiftData |
| **Web** | Next.js 15 · React 19 · Tailwind 4 · PWA |
| **Backend** | Firebase (Firestore + Auth + Storage + Cloud Functions) |
| **Auth** | Sign in with Apple (Firebase Auth provider) |
| **IA — chat natural** | Claude API (Sonnet 4.5) |
| **IA — parse multimodal** | Gemini 2.5 Flash (PDF/imagen) |
| **Deploy web** | Vercel |

---

## 📁 Estructura del repo

```
trip-planner-pro-2/
├── docs/
│   ├── PRD.md                  ← Especificación completa de producto
│   ├── DESIGN_BRIEF.md         ← Sistema visual + todas las pantallas
│   ├── ROADMAP.md              ← Roadmap por fases con checklist
│   └── adr/                    ← Architecture Decision Records
├── ios/
│   └── TripPlannerPro/         ← Xcode project (Fase 4)
├── web/
│   └── next/                   ← Next.js 15 project (Fase 2)
├── firebase/
│   ├── functions/src/          ← Cloud Functions Node.js 20
│   ├── firestore.rules
│   ├── storage.rules
│   └── seed/
│       └── airports.json       ← ~1500 aeropuertos OpenFlights
├── design/
│   └── wireframes/             ← Exports de Claude Design
├── .gitignore
├── README.md                   ← Este archivo
└── CLAUDE.md                   ← Contexto para Claude Code agents
```

---

## 📋 Documentación

- **[PRD](docs/PRD.md)** — Problema, módulos, stack, arquitectura de datos, roadmap
- **[Design Brief](docs/DESIGN_BRIEF.md)** — Sistema visual + specs de todas las pantallas + prompt para Claude Design
- **[Roadmap](docs/ROADMAP.md)** — Fases con checklist ejecutable

---

## 🗺️ Módulos MVP

| Módulo | Descripción |
|--------|-------------|
| **A — Viajes** | Lista, creación, detalle con 3 tabs + delight moments (saludo + countdown + Unsplash) |
| **B — Calendario visual** | Grid Mon→Sun con colores de ciudad y badges de items ★ |
| **C — Ciudades** | Autocompletado Nominatim, colores automáticos |
| **D — Carga IA** | Chat natural (Claude) + Upload PDF/imagen (Gemini) + form manual ★ |
| **E — Vuelos/Hoteles/Transportes** | CRUD completo, timezone-aware, autocompletado IATA |
| **F — Gastos + FX** | Totales en USD, FX fijo para viajes pasados, dinámico para futuros |
| **G — Settings** | AI Provider default, API keys, export de data |

---

## 📅 Timeline

- **Fase 0 (lunes)**: docs + wireframes
- **Fase 1 (semana 1)**: Firebase setup + Cloud Functions
- **Fase 2 (semana 2)**: Web UI + CRUD + calendar grid
- **Fase 3 (semana 3)**: Módulo IA (parse text + multimodal)
- **Fase 4 (semanas 4-5)**: iOS app SwiftUI
- **Fase 5 (semana 6)**: TestFlight build + testing personal
- **v1.1 (post-MVP)**: Flight Tracking + Push notifications + Widget iOS + Modo offline

---

## 🔑 Decisiones clave

1. **Firebase sobre Supabase**: Supabase free tier limita a 2 proyectos (ya ocupados). Firebase Spark sin límite.
2. **Gemini para multimodal**: ~5× más barato que Claude para PDF/imagen.
3. **Seed estático de aeropuertos**: ~150KB, zero dependencias en runtime.
4. **Parse server-side**: no exponer API keys al cliente.
5. **Tres valores por punto temporal** (local/tz/utc): simplifica UI y cálculos de duración cross-TZ.
6. **Dos codebases (iOS + Next.js)**: Share Sheet nativo es el diferencial del flujo de parse.

---

*README v1.0 — generado desde Notion el 2026-04-19.*
