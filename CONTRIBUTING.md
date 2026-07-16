# Cómo contribuir

## Antes de tocar nada

1. Lee `README.md` (estructura) y `DESARROLLO.md` (ramas y entorno).
2. Levanta el proyecto en local: `cd public && python3 -m http.server 8080`.

## Reglas de la arquitectura

1. **La UI no habla con Firestore.** Solo los `repositories/` importan
   `firebase-firestore.js`. Si una página necesita datos → service → repository.
2. **Todo dato de usuario que vaya a `innerHTML` se escapa** con `esc()` o
   la plantilla `safe`. Sin excepciones.
3. **Nada de configuración hardcodeada.** Precios, fechas, tipos de abono y
   nombres de colección van en `config/app.config.js`.
4. **Nada de `onclick="fn('${id}')"`.** Usa `data-*` + delegación de eventos.
5. **Un archivo, una responsabilidad.** Si un módulo pasa de ~200 líneas,
   probablemente hay que partirlo.

## Pull Requests

- Rama desde `develop`, nombre `feature/lo-que-sea`.
- Commits en español con prefijo (`feat:`, `fix:`, `refactor:`, `docs:`).
- Que pase `npx eslint "public/src/**/*.js"`.
- Describe **qué** cambia y **por qué**, no solo el cómo.

## Cambios en las reglas de Firestore

Nunca publiques reglas sin probarlas antes en el **Playground** (ver
`DEPLOYMENT.md`). Y ten localizado el botón de *Restaurar* del historial.
