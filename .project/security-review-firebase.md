# Security Review — Firebase — 2026-04-27

**Revisor:** security-reviewer agent  
**Estado:** RESUELTO — todos los críticos y medios corregidos en el mismo commit.

---

## 1. Vulnerabilidades críticas — RESUELTAS

### CRITICO-1: `attachmentRef` no validado contra userId — IDOR en Storage via Cloud Function
**Archivo:** `firebase/functions/src/index.ts`  
**Vector:** `callGemini` usaba `bucket.file(attachmentRef)` con credenciales de admin, bypaseando Storage Security Rules. Un atacante con token válido podía leer archivos de otro usuario pasando su path.  
**Fix aplicado:** Validación de prefijo `users/${userId}/parse_attachments/` antes de procesar el attachment. Retorna 403 si el path no pertenece al caller.

### CRITICO-2: `isHouseholdMember()` crash + bootstrap imposible de `households/main`
**Archivo:** `firebase/firestore.rules`  
**Vector:** `get()` sobre un doc inexistente + acceso a `.data.memberUids` podía fallar silenciosamente. La regla `allow write: if resource.data.memberUids` bloqueaba la creación inicial del documento.  
**Fix aplicado:** Guard `doc != null` en `isHouseholdMember()`. Separada la regla de `create` (permitida con auth) de `update` (requiere ser miembro).

---

## 2. Vulnerabilidades medias — RESUELTAS

### MEDIA-1: Input sin límite de longitud — potencial abuso de Storage en Firestore
**Fix aplicado:** Límite de 50.000 caracteres en `input` antes de crear el parse_job.

### MEDIA-2: CORS `*` en función autenticada
**Fix aplicado:** Lista de orígenes permitidos (`trip-planner-pro-2.vercel.app` + `localhost:3000`). Actualizar el dominio Vercel cuando esté deployado.

### MEDIA-3: collectionGroup `cities` sin regla explícita en Security Rules
**Fix aplicado:** Regla `match /{path=**}/cities/{cityId}` con `read: isHouseholdMember()` y `write: false`. Los writes siguen por el path `users/{userId}/...`.

---

## 3. Observaciones menores (no bloquean)

- **MENOR-1:** Prompt injection teórico en `buildParsePrompt` desde nombres de ciudad. Riesgo nulo en app personal. Revisar si se agrega multiusuario.
- **MENOR-2:** 9 vulnerabilidades `moderate` en dependencias transitivas de firebase-admin. Monitorear en cada deploy.
- **MENOR-3:** `households/main` legible por cualquier usuario autenticado (expone UIDs de miembros). Aceptable en app personal; restringir si se agrega auth de terceros.
- **MENOR-4:** Storage sin límite de cantidad de archivos por usuario. No aplica en app personal.
- **MENOR-5:** `JSON.parse` sin try/catch propio en `parseAIResponse` — el error sube al handler principal y se loguea correctamente. No es riesgo.

---

## 4. Lo que estaba bien

- Verificación de Firebase ID token correcta en `parseWithAI` (Bearer token, `verifyIdToken`, sin bypass).
- Trip ownership scoped al `userId` del token (no del body) — no hay IDOR en trips.
- API keys en Secret Manager vía `defineSecret`, nunca hardcodeadas ni logueadas.
- `raw_response` no se expone al cliente.
- Colecciones globales (`airports`, `fx_rates`) con `write: false`.
- Catch-all deny en Firestore Rules y Storage Rules.
- Luxon para timezone calculations.

---

## Checklist post-fix

- [x] attachmentRef validado contra userId del caller
- [x] isHouseholdMember() con guard de existencia
- [x] Bootstrap de households/main posible desde cliente
- [x] Límite de longitud en input
- [x] CORS restringido a dominios conocidos
- [x] collectionGroup cities cubierto por Security Rules
- [ ] Actualizar dominio CORS cuando Vercel esté deployado (`ALLOWED_ORIGINS` en index.ts)
