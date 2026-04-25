# QA Checklist — Fase 4 iOS — 2026-04-24

## Estado

Resultado: bloqueado para cierre, listo para preparar prueba en Mac con Xcode.

Esta maquina no tiene Xcode completo. `xcodebuild -version` falla porque el developer directory activo es CommandLineTools. Tampoco esta instalado `xcodegen`. Por eso no se pudo compilar, abrir simulador, ejecutar XCTest ni validar provisioning/App Group localmente.

## Cobertura revisada en esta maquina

- Repo/branch: `feat/ios-app`, sincronizada con `origin/feat/ios-app`.
- Firebase Functions: `npm run build` paso correctamente en `firebase/functions`.
- Web: no verificable aca porque `web/next/node_modules` no esta instalado; `npm run lint` y `npm run build` fallan por comandos faltantes (`eslint`, `next`).
- iOS: revision estatica de estructura, roadmap, PRD, Design Brief y archivos Swift.

## Hallazgos de orden antes de commit

- [x] `firebase/functions/lib/*.d.ts` es output generado y debe quedar ignorado junto con `*.js` y `*.js.map`.
- [ ] Revisar si `CLIPY.md` debe entrar al repo. Parece documentacion util para el workflow local con Obsidian.
- [ ] Revisar si `.claude/settings.local.json` debe commitearse; contiene permisos locales de Claude y puede ser preferible dejarlo fuera del cambio funcional.
- [ ] Separar commit de hygiene/docs del commit iOS funcional si queres un historial limpio.

## Resultados por modulo iOS

### Setup / Proyecto
- [x] Existe `ios/project.yml` con app principal y Share Extension.
- [x] Deployment target iOS 17 y Swift 6 configurados.
- [x] Dependencias declaradas: Firebase Auth, Firestore, Storage, Functions y SwiftKeychainWrapper.
- [ ] Generar proyecto con `xcodegen` en Mac con Xcode.
- [ ] Confirmar que `GoogleService-Info.plist` real existe en `ios/TripPlannerPro/Resources/`.
- [ ] Confirmar signing team, Bundle IDs y provisioning profiles.

### Auth
- [x] Existe Sign in with Apple nativo.
- [ ] Probar login real contra Firebase Auth.
- [ ] Probar sign out.
- [ ] Probar estado no autenticado y reentrada.

### Dashboard
- [x] Existe Dashboard SwiftUI con viajes y creacion de viaje.
- [ ] Probar empty state sin viajes.
- [ ] Probar crear viaje y verlo en Firestore.
- [ ] Probar cache offline despues de cargar viajes.

### Trip Detail / Calendar
- [x] Existe Calendar view Mon->Sun.
- [ ] Validar visualmente que mantiene 7 columnas en iPhone chico y iPad.
- [ ] Probar tap en dia abre Day Detail sheet.
- [ ] Probar vuelo que cruza medianoche en celda de salida y llegada.
- [ ] Probar hotel visible en todos los dias check-in -> check-out.

### Carga IA
- [x] Existe AIParseModal con chat, preview, confidence badges y formularios manuales.
- [ ] Reemplazar `REPLACE_WITH_PROJECT_ID` en `AIParseClient.swift` por URL real de Cloud Function.
- [ ] Probar parse de texto real con token Firebase valido.
- [ ] Probar error de IA sin pantalla en blanco.
- [ ] Probar guardar items confirmados en Firestore.

### Formularios Manuales
- [x] Existen formularios de vuelo, hotel y transporte.
- [ ] Probar validaciones de campos requeridos.
- [ ] Probar guardado manual de vuelo/hotel/transporte.
- [ ] Probar que fechas locales se muestran como locales, no UTC.

### Catalogo
- [x] Existe CatalogView cross-trip con busqueda, filtros y skeleton.
- [ ] Probar catalogo con varios viajes.
- [ ] Probar busqueda por aerolinea, hotel, proveedor, ciudad y codigo.
- [ ] Probar estado sin resultados.

### Share Extension
- [x] Existe target Share Extension y App Group hardcodeado.
- [ ] Registrar App Group `group.com.mferracani.tripplannerpro` en Apple Developer Console.
- [ ] Probar share desde Mail/Safari con texto.
- [ ] Probar que el texto llega a AIParseModal al abrir la app.

### Settings
- [x] Existe SettingsView.
- [ ] Validar que cumple Modulo G del PRD: perfil, AI provider default, API keys/Keychain, moneda, export JSON y sign out.

## Bugs / Riesgos

- [ ] Compilacion iOS no verificada — severity: alta — owner: frontend-engineer.
- [ ] URL real de `parseWithAI` pendiente — severity: alta — owner: backend-designer/frontend-engineer.
- [ ] `GoogleService-Info.plist` pendiente — severity: alta — owner: frontend-engineer.
- [ ] App Group/provisioning pendiente — severity: alta — owner: frontend-engineer.
- [ ] Tests automatizados iOS no existen todavia — severity: media — owner: qa-engineer/frontend-engineer.
- [ ] Web no verificable en esta maquina sin instalar dependencias — severity: baja para el foco iOS — owner: frontend-engineer.

## Checklist en la otra Mac

```bash
cd "/path/to/Trip Planner Pro 2.0"
git status --short --branch
cd ios
brew install xcodegen
xcodegen
open TripPlannerPro.xcodeproj
```

En Xcode:

- Seleccionar Team `Q2TG5FA7M7`.
- Agregar `GoogleService-Info.plist` real.
- Confirmar App Group en app y extension.
- Build app principal en simulador iPhone 15/16.
- Build Share Extension.
- Ejecutar smoke test: login -> crear viaje -> agregar vuelo manual -> ver calendario -> abrir Day Detail -> abrir Catalogo -> abrir Settings.

## Recomendacion

- [ ] Listo para release
- [ ] Listo con observaciones menores
- [x] Bloqueado por validacion iOS en Xcode

Siguiente agente recomendado: `frontend-engineer` para resolver placeholders/configuracion iOS y generar el proyecto en la Mac con Xcode. Luego volver a `qa-engineer` para cerrar smoke test y checklist TestFlight.
