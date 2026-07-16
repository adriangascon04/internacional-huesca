# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.1.0] — Auditoría de bugs y endurecimiento

### Seguridad
- **Reglas: `allow write` concedía `delete`.** El patrón `allow write: if puedeEscanear();`
  seguido de `allow delete: if esAdmin();` era engañoso: en Firestore las reglas
  se combinan con OR y `write` incluye `delete`, así que un `control_acceso`
  podía borrar el documento de entradas de una jornada entera. Igual en taquilla
  con `taquillero`. Ahora se usan siempre verbos separados (`create`/`update`/`delete`).
- **El cierre de jornada solo se comprobaba en el cliente.** Bastaba la consola
  del navegador para escribir en una jornada cerrada. Ahora `jornadaAbierta()`
  lo valida en el servidor.
- **Sin validación de contenido.** Un `taquillero` podía escribir `general: 999999`
  y falsear la recaudación. Ahora el contador solo puede moverse ±1 por escritura.
- **Un `control_acceso` podía vaciar los accesos** de una jornada. Ahora solo
  puede añadir: se exige `keys().hasAll(resource.data.keys())`. Borrar un acceso
  queda reservado a admin.
- **El contador de socios podía retroceder.** Si bajaba, se reutilizarían números
  y volverían los "QR zombie". Ahora las reglas exigen que solo crezca.

### Corregido
- **Pérdida de registros por escritura no atómica (crítico).** `procesarAcceso` y
  `venderEntrada` hacían `getDoc` → modificar en memoria → `setDoc`. `setDoc` sin
  merge reemplaza el documento entero: dos porteros escaneando a la vez, o dos
  taquilleros vendiendo, se pisaban y **se perdían accesos y ventas ya cobradas**.
  Ahora: `updateDoc` con notación de punto para entradas, e `increment()` +
  `arrayUnion()` para taquilla (los resuelve el servidor).
- **`parseQr` era inconsistente con las mayúsculas.** Comprobaba el prefijo en
  mayúsculas pero recortaba sobre la cadena original: `"huesca:5"` devolvía
  `"huesca:5"` entero y el socio salía como desconocido. Afectaba a la entrada manual.
- **`orderBy('numerico')` ocultaba socios.** Firestore excluye de los resultados
  los documentos que no tienen el campo del `orderBy`: cualquier socio heredado
  sin `numerico` **desaparecía de la app sin ningún aviso**. Ahora se ordena en cliente.
- **`borrarSocioFisico()` eliminado.** Era código muerto que contradecía la baja
  lógica y que además las reglas siempre habrían rechazado.
- **`deshacerVenta` asumía que el historial estaba ordenado.** Ahora ordena por hora.

### Añadido
- Auditoría `vendidoPor` en cada venta de taquilla.
- Suite de tests (`node --test`, sin dependencias) con stub de Firebase que
  permite ejecutar los services fuera del navegador. 15 tests, en CI.

## [1.0.0] — Migración a arquitectura modular

### Seguridad
- **Reglas de Firestore por rol.** Antes: `allow read, write: if request.auth != null`
  → cualquier usuario logueado podía borrar la base entera desde la consola.
  Ahora: roles `admin` / `taquillero` / `control_acceso` / `lector` leídos de
  `/usuarios/{uid}`. Operaciones destructivas solo para admin.
- **Corregido XSS almacenado.** Los datos de socio se inyectaban con
  `innerHTML` sin escapar (escáner y previsualización de QR). Ahora todo pasa
  por `utils/sanitize.js`.
- **Backups restringidos a admin** y con registro de quién los crea (RGPD).

### Corregido
- **Bug crítico de reutilización de IDs.** `nextNum()` usaba `Math.max(...)+1`:
  al borrar el socio con el número más alto, el siguiente alta reutilizaba ese
  número y el QR antiguo abría la puerta identificando a **otra persona**.
  Ahora: contador monotónico en `/contadores/socios` con transacción.
- **Baja lógica** (`activo: false`) en vez de borrado físico: los números nunca
  se reasignan y se conserva el histórico.
- **`FECHA_LIMITE_FUNDADOR` estaba duplicada** en dos sitios del código.
  Ahora vive solo en `config/app.config.js`.

### Añadido
- **Edición de socios**: `socios.service.js → editarSocio()` está implementada
  y validada, pero ⚠️ **AÚN NO HAY UI QUE LA LLAME**. Sigue sin poderse editar
  un socio desde la app. Pendiente: botón "Editar" en el modal de perfil.
- **Validación real** de DNI/NIE (con letra de control), email y teléfono.
- **Importador de Excel con validación previa**: informe de filas correctas y
  erróneas antes de escribir nada.
- **Auditoría**: campos `creadoPor`, `modificadoPor`, `bajaPor`.
- CI con ESLint y Prettier.

### Cambiado
- De 1 archivo de 1230 líneas a ~30 módulos por responsabilidad.
- Toda la configuración (precios, temporada, tipos de abono) centralizada.
- Eliminado el código muerto `_suscribirSociosOLD`.
- Eliminadas ~50 funciones colgadas de `window` y los `onclick="fn('${id}')"`
  interpolados, sustituidos por delegación de eventos.
