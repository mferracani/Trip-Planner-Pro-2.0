# Trip Planner Pro — iOS

App nativa iOS 17+ en SwiftUI + Swift 6. El `.xcodeproj` se genera con **XcodeGen** desde `project.yml`.

## Setup (primera vez en una Mac)

1. Instalar Xcode 15+ desde la App Store.
2. Instalar herramientas:
   ```sh
   brew install xcodegen
   ```
3. Poner el `GoogleService-Info.plist` en `TripPlannerPro/Resources/GoogleService-Info.plist`. Se baja desde Firebase Console → Project Settings → App iOS. Está gitignorado a propósito.
4. Generar el proyecto:
   ```sh
   cd ios
   xcodegen
   open TripPlannerPro.xcodeproj
   ```
5. Elegir un simulator y correr (⌘R).

## Después de pull

Si `project.yml` cambió, regenerá el proyecto:

```sh
cd ios && xcodegen
```

No commitees el `.xcodeproj` (está gitignorado).

## Estructura

```
TripPlannerPro/
  App/              Entry point, AppRoot, tab bar
  Core/             Auth, Firestore client, modelos compartidos
  DesignSystem/     Tokens, componentes atómicos
  Features/         Dashboard, TripDetail, AIParse, Settings
  Resources/        Info.plist, Assets.xcassets, entitlements
```

## Convenciones

- Dark mode forzado (no hay modo claro).
- Strings de UI en español, código en inglés.
- `@Observable` en vez de `ObservableObject`.
- `NavigationStack` en vez de `NavigationView`.
- SwiftData para cache local del viaje activo; Firebase SDK para sync.
