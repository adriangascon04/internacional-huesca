# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.3.0] — Empezar de cero, cuotas reales y estadísticas ordenadas

> ⚠️ **Antes de nada:** este cambio toca `firestore.rules` (admin ya puede borrar
> socios). Las reglas **no se despliegan solas**: hay que pegarlas en Firebase
> Console → Firestore → Reglas → Publicar. Sin ese paso, ni el botón de eliminar
> socio ni el de empezar de cero funcionarán.

### Añadido
- **Botón "Borrarlo todo y empezar de cero"** (pestaña Backup, solo admin). Borra
  socios, fichajes y taquilla de una vez, que es lo que hace falta al terminar la
  fase de pruebas. Convive con el reinicio de solo los datos de partido: van
  numerados y con la diferencia escrita, y cada uno pide teclear su propia palabra.
  Los socios se borran los últimos, para que un corte a mitad no deje fichajes
  huérfanos. No toca calendario, precios, usuarios ni copias.
- **Socio Colaborador**, un abono de **aportación libre**: la cuota es la que
  decida quien aporta. El importe es obligatorio en el alta (su tarifa de
  referencia es 0 € y heredarla en silencio registraría todos los donativos como
  gratuitos) y suma en la recaudación de socios por lo que realmente se cobró.
- **El importe del abono se ve y se edita.** Aparece en la lista de socios, en las
  cifras de su ficha y en el detalle, y se corrige desde la edición junto al método
  de pago. La tarifa es un punto de partida, no un precio cerrado.
- **Lista de socios paginada** (25 por página). El buscador sigue filtrando sobre
  todos los socios y el CSV sigue exportando la lista entera.
- **Anular una venta concreta de taquilla**, no solo la última.
- **Estadísticas en cuatro subpestañas** — Resumen, Socios, Taquilla y Asistencia —
  con datos nuevos: cómo se cobra (para cuadrar la caja), precio medio por tipo de
  entrada, cuota media por tipo de abono y cuánta recaudación viene de socios que
  no van al campo.
- **Modo demostración de las estadísticas** (👁 Ver con datos de ejemplo): rellena
  la pantalla con una temporada inventada para poder enseñar cómo se leerán las
  estadísticas cuando todavía no hay datos. No escribe absolutamente nada —los
  datos se generan en el navegador—, avisa con un rótulo visible mientras está
  activo y se apaga solo al recargar la página, para que nadie se quede leyendo
  cifras inventadas creyendo que son del club. Las cifras son siempre las mismas
  (generador con semilla fija): un demo que cambia de números en cada pulsación
  parece roto.

- **La ficha del socio cuenta su historia**, no solo sus datos: temporadas en el
  club, aportación temporada a temporada con su total y su media, puesto en el
  ranking de asistencia, mejor racha (y la viva, que solo cuenta si vino al último
  partido), lo que le sale cada partido, hora media de llegada y desglose por
  competición. Con un botón para **apuntar la cuota de una temporada nueva**.
- **Cuotas por temporada** (`cuotas` en la ficha del socio). A los socios
  anteriores no se les migra ni se les inventa historial: se les muestra la cuota
  de la temporada de su alta con el importe que ya tenían, así que la ficha dice
  algo cierto desde el primer día sin tocar un solo documento.
- **Más métricas en estadísticas**: tendencia de asistencia y de taquilla
  (aparecen a partir del cuarto partido, antes es ruido), proyección de taquilla a
  fin de temporada, ingreso por socio y por asistente, concentración de las cuotas
  en el 10 % que más aporta, quién más aporta, antigüedad de los socios, núcleo
  duro y ocasionales, cuántos socios distintos han venido alguna vez, peso de las
  invitaciones y una tabla de taquilla partido a partido.

### Corregido
- **La descripción del abono se montaba encima del importe** en el recuadro
  amarillo de tarifas. Se veía en el Socio Colaborador, el único que junta la
  descripción más larga con el importe más largo: los tres eran hermanos del mismo
  flex y el importe, con `nowrap`, no cedía. La descripción pasa a ir dentro del
  nombre, en su propia línea.
- **Una entrada de taquilla borrada seguía contando.** Al anular la última venta
  que quedaba, el historial se quedaba vacío y el cálculo lo confundía con "documento
  antiguo sin historial", cayendo a los contadores heredados: la venta recién
  anulada reaparecía en la recaudación. Ahora, si el documento tiene historial, el
  historial manda aunque esté vacío.
- **Anular una venta podía llevarse dos.** `arrayRemove` compara por valor exacto y
  dos ventas del mismo tipo, precio y método cobradas en el mismo milisegundo eran
  objetos idénticos. Cada venta lleva ya un identificador propio.
- **El nombre de los abonos no coincidía** entre el desplegable ("Abono Familiar") y
  la tabla de tarifas de al lado ("Pack Familiar (2 adultos + hasta 3 hijos)"):
  parecían dos abonos distintos. Ahora la etiqueta es la misma en toda la aplicación
  y el texto descriptivo va detrás, como apoyo.
- **Dos censos de socios distintos** según la tarjeta de estadísticas que miraras:
  unas contaban todas las fichas y otras solo las activas.

### Cambiado
- **Se acaban las bajas de socio.** El borrado lógico (`activo:false`) dejaba la
  ficha guardada para siempre; el club no quiere ese rastro, porque un socio que se
  quita es casi siempre un alta equivocada. Ahora se borra de verdad. No reabre el
  bug del "QR zombie": el nº de carnet se reutiliza, pero el QR lleva además el
  token del socio, que es distinto para cada uno, y el id interno lo reparte un
  contador que solo sabe subir.
- **Taquilla ya no vende "socio con entrada incluida".** Un abonado entra con su QR
  y ya se cuenta como asistente ahí; cobrarle además una entrada de 0 € lo contaba
  dos veces. Las ventas históricas de ese tipo se conservan tal cual.
- **El Abono Internacional se cuenta aparte, no se esconde.** Sigue fuera del % de
  asistencia —es el sentido de ese abono, apoyar al club sin venir al campo— y su
  dinero sigue entrando entero en la recaudación; pero si uno de ellos viene y
  ficha, su entrada se enseña aparte en el detalle por jornada en vez de
  desaparecer.

### Seguridad
- `firestore.rules`: `socios` pasa de `allow delete: if false` a `if esAdmin()`.
  Es lo que habilita eliminar un socio y el borrón y cuenta nueva. Publícalas.
- **Las reglas de Firestore ya se prueban** (`npm run test:reglas`): 26 casos que
  las ejecutan contra el emulador con un usuario de cada rol, en vez de leerlas y
  confiar. Cubren quién puede borrar un socio y quién no, que un lote no sirva
  para saltarse el rol, que un taquillero pueda anular una venta pero no colar
  tres de golpe, que una jornada cerrada no admita nada, y que el contador de
  números de socio siga sin poder bajar ni con el borrón y cuenta nueva. La CI lo
  pasa en cada PR; `npm test` sigue sin necesitar instalar ni descargar nada.

## [1.2.0] — Calendario configurable, dinero real y escáner que lee

### Añadido
- **Competiciones y partidos configurables.** Desaparece el calendario fijo de 17
  jornadas: se crean competiciones (Liga, Copa, torneos…) con sus partidos, y se
  pueden renombrar, reordenar y eliminar sin tocar código. Eliminar un partido no
  borra su asistencia ni su taquilla: se conservan como histórico.
- **Precios por partido y por venta.** Cada partido guarda su tarifa, y en cada
  venta se puede cobrar un importe distinto (invitación, descuento, suplemento).
  Los tipos de entrada nuevos (`vip`, `peña`…) aparecen solos en taquilla y en las
  estadísticas.
- **Método de pago** (Bizum / TPV / Efectivo) en la venta de entradas y en el alta
  de socios.
- **Recuadros de tarifas** en el alta de socios y en taquilla, pintados desde la
  configuración real. Antes eran texto fijo en el HTML y mentían en cuanto alguien
  cambiaba un precio.
- **Estadísticas económicas completas:** recaudación por partido y tipo, por
  competición, y un apartado **independiente** para la recaudación por altas de
  socios (nuevos socios, ingresos, desglose por abono, evolución mensual).
- **Dos gráficos apilados** por partido: uno de dinero y otro de personas. El de
  personas incluye a los abonados que entran con QR, que en el de dinero no se ven
  porque aportan 0 €.
- **Botón "Leer ahora"** en el escáner: un intento a fondo sobre el fotograma
  completo a resolución nativa, para el QR que se resiste.
- **Indicador de ritmo de lectura** ("N lecturas/s") bajo la cámara: distingue "no
  entra este QR" de "el lector está parado", que desde fuera se veían igual.

### Corregido
- **El escáner no leía en Android.** `BarcodeDetector` se usaba como camino rápido
  y solo se descartaba si lanzaba excepción; hay navegadores que lo exponen sin
  tenerlo operativo (depende de un módulo de Google Play Services) y entonces
  resuelve vacío en cada fotograma. En iOS funcionaba porque no existe esa API. Se
  elimina el camino nativo.
- **El bucle de lectura moría en silencio** si fallaba el fichaje: la excepción se
  comía el `requestAnimationFrame` y la cámara seguía viéndose sin leer.
- **Una jornada con fichajes Y ventas salía duplicada** en todos los selectores y
  en las estadísticas: las claves históricas de `entradas` y `taquilla` se
  concatenaban sin deduplicar.
- **El rol "Main" no tenía permisos en el servidor.** El cliente normalizaba el rol
  (trim + minúsculas) y las reglas comparaban con `==`, así que la interfaz dejaba
  pulsar y la escritura se rechazaba. Ahora hay una única normalización, gemela en
  `core/roles.js` y en `firestore.rules`.
- **La recaudación se recalculaba con las tarifas vigentes**, reescribiendo hacia
  atrás lo facturado en partidos ya jugados. Cada venta guarda su importe.
- **Un importe en blanco se cobraba como 0 €** (`Number('')`) en el alta y en la
  venta. Ahora cae a la tarifa; el 0 explícito sigue valiendo.
- **El tope de una venta por escritura** se expresaba sobre los contadores
  `general`/`menor`, así que los tipos nuevos quedaban sin límite. Ahora se acota
  el tamaño del historial.
- **Eliminar un partido no pedía confirmación**, con el botón pegado a las flechas
  de reordenar.
- **El gráfico de asistentes crecía sin tope** en pantallas estrechas.

### Cambiado
- **Email y teléfono dejan de ser obligatorios** en el alta de socios.
- La documentación decía que Pages sirve `/public`; sirve la raíz.

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
