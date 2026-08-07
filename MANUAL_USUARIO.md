# Manual de uso · Gestión de Abonados

**Internacional Huesca** · Guía para el día a día del club.

Esta guía explica **todo lo que la aplicación puede hacer** y cómo hacerlo. No
hace falta saber nada de programación ni de informática: si sabes usar el
correo y una hoja de cálculo, puedes usar esto.

Lo único que se hace **fuera** de la aplicación es dar de alta a las personas
del club que van a usarla, y también se explica paso a paso (apartado 12).

> **¿Primera vez?** Lee los apartados 1, 2 y 3. Con eso ya entiendes de qué va
> todo. El resto búscalo cuando lo necesites.

---

## Índice

1. [Entrar en la aplicación](#1-entrar-en-la-aplicación)
2. [Vocabulario: qué significa cada palabra](#2-vocabulario-qué-significa-cada-palabra)
3. [Qué puede hacer cada persona](#3-qué-puede-hacer-cada-persona)
4. [Competiciones: el calendario y los precios](#4-competiciones-el-calendario-y-los-precios)
5. [Socios](#5-socios) · [renumerar temporada](#59-renumerar-los-carnets-en-una-temporada-nueva)
6. [Importar socios desde Excel](#6-importar-socios-desde-excel)
7. [Carnets y códigos QR](#7-carnets-y-códigos-qr)
8. [El día del partido: el escáner](#8-el-día-del-partido-el-escáner)
9. [Taquilla](#9-taquilla)
10. [Estadísticas](#10-estadísticas)
11. [Copias de seguridad](#11-copias-de-seguridad) · [empezar de cero](#111-zona-peligrosa-los-dos-reinicios)
12. [Dar acceso a la gente del club](#12-dar-acceso-a-la-gente-del-club)
13. [Protección de datos](#13-protección-de-datos)
14. [Preguntas frecuentes](#14-preguntas-frecuentes)
15. [Firebase: lo mínimo que hay que saber](#15-firebase-lo-mínimo-que-hay-que-saber)

---

## 1. Entrar en la aplicación

Abre la dirección de la aplicación en el navegador (Chrome, Safari, Edge…),
desde ordenador o desde el móvil. Verás una pantalla de acceso: introduce **tu
correo y tu contraseña** y pulsa **Entrar**.

Arriba a la derecha aparecerá tu correo y tu tipo de acceso, por ejemplo
`portero@club.es · control_acceso`. Al lado tienes el botón **Salir**.

> **Si pone "sin rol":** tienes usuario pero nadie te ha asignado permisos.
> Quien administre la aplicación debe completar el paso del apartado 12.

**En el móvil:** puedes añadir la aplicación a la pantalla de inicio (en Chrome,
menú ⋮ → *Añadir a pantalla de inicio*) y se abrirá como una app normal, a
pantalla completa. Es la forma recomendada para quien esté en la puerta del
campo: los botones y los avisos están pensados para leerse bien en un móvil.

---

## 2. Vocabulario: qué significa cada palabra

Cinco minutos aquí te ahorran muchas dudas después.

| Palabra | Qué es |
|---------|--------|
| **Socio / abonado** | Persona con abono de temporada. Tiene ficha, número de carnet y QR. |
| **Abono** | El tipo de cuota que paga el socio (Familiar, Normal, Jubilado…). Cada uno tiene su precio. |
| **Competición** | Una agrupación de partidos: Liga, Copa, Playoff, un torneo de verano… Las creas tú. |
| **Partido / jornada** | Cada encuentro concreto dentro de una competición. Es la unidad con la que trabaja todo: los fichajes de la puerta y las ventas de taquilla se guardan **por partido**. |
| **Jornada actual** | Cuál es "el partido de hoy". La fija un admin antes de abrir puertas, y es lo que hace que el personal de la puerta no tenga que elegir nada. |
| **Jornada cerrada** | Un partido dado por definitivo. No admite más fichajes ni más ventas. Es el "cierre de acta". |
| **Carnet / QR** | El código que lleva el socio. Dentro va su número, un código de seguridad único suyo y la temporada en que se emitió. |
| **Entrada de taquilla** | La que se vende en la puerta a quien no es socio. Tiene tipo (general, infantil…) y precio. |
| **Rol** | El tipo de acceso de cada persona del club: decide qué puede ver y tocar. |
| **Alta** | Meter a un socio nuevo. Para quitarlo, se **elimina** su ficha: no hay "baja", se borra de verdad. |
| **⭐ Socio Fundador** | Distintivo automático de quien se dio de alta antes del 30 de mayo de 2027, el final de la primera temporada. |

**La diferencia que más se confunde**, porque suenan parecido:

- **Fijar la jornada actual** = "hoy jugamos este partido". Sirve para que el
  personal de la puerta no se equivoque de partido.
- **Cerrar la jornada** = "este partido ya está terminado y sus datos son
  definitivos". Bloquea cualquier cambio.

---

## 3. Qué puede hacer cada persona

Cada usuario tiene un **rol**. El rol decide qué puede tocar; lo que no le
corresponde, ni le aparece. Cómo se asigna se explica en el apartado 12.

| Rol | Socios | Competiciones y precios | Escáner | Taquilla | Estadísticas | Cerrar jornada | Fijar jornada actual | Importar | Copias |
|-----|--------|------------------------|---------|----------|--------------|----------------|----------------------|----------|--------|
| **admin** | Todo: alta, editar, eliminar, pagos | Sí | Sí, en cualquier partido | Sí | Sí | Sí | Sí | Sí | Sí |
| **taquillero** | Solo consultar | Solo consultar | No | Vender | Sí | No | No | No | No |
| **control_acceso** | Solo consultar | Solo consultar | Sí, solo en la jornada actual | No | Sí | No | No | No | No |
| **lector** | Solo consultar | Solo consultar | No | No | Sí | No | No | No | No |

Los cuatro nombres se escriben **exactamente así, en minúsculas**: `admin`,
`taquillero`, `control_acceso`, `lector`.

> ⚠️ **Importante para protección de datos:** cualquier persona que entre en la
> aplicación, sea del rol que sea, puede **consultar la ficha completa de los
> socios**, incluidos DNI, teléfono y email. No se puede ocultar solo ese dato a
> unos roles y a otros no. Tenlo en cuenta al decidir a quién das acceso.

---

## 4. Competiciones: el calendario y los precios

Pestaña **Competiciones** (crear y modificar, solo admin).

Aquí construyes **el calendario del club**. Es lo primero que hay que montar,
porque todo lo demás cuelga de esto: el escáner, la taquilla y las estadísticas
trabajan siempre "por partido", y los partidos son los que crees aquí.

No hay ningún número fijo de jornadas ni ninguna lista cerrada: **tú creas las
competiciones que quieras, con los partidos que quieras, y los cambias cuando
quieras**.

### 4.1. Crear una competición

Escribe el nombre en la casilla (por ejemplo `Liga Territorial`, `Copa`,
`Amistosos de pretemporada`) y pulsa **Crear competición**.

Puedes tener todas las que necesites a la vez.

### 4.2. Añadir partidos

Elige la competición en el desplegable, escribe el nombre del partido (por
ejemplo `Jornada 1 vs. Rival`) y pulsa **Añadir partido**.

Ese nombre es el que verá todo el mundo en los desplegables del escáner, la
taquilla y las estadísticas, así que ponle algo reconocible.

### 4.3. Ordenar, renombrar y eliminar

Debajo aparece la lista de cada competición con sus partidos numerados. En cada
partido tienes:

| Botón | Qué hace |
|-------|----------|
| **↑ / ↓** | Sube o baja el partido en el orden. Cambia el orden en todos los desplegables. |
| **Editar** | Le cambia el nombre. |
| **Eliminar** | Lo quita del calendario. Pide confirmación. |

> **Eliminar un partido NO borra sus datos.** Los fichajes de la puerta y las
> ventas de taquilla que ya tuviera siguen guardados y siguen apareciendo en las
> estadísticas como histórico. Lo único que desaparece es el partido del
> calendario editable.

Para la competición entera tienes **Editar** (renombrar) y **Eliminar**, arriba
del todo de su bloque. Igual que antes: eliminarla no borra la asistencia ni la
recaudación ya registradas.

### 4.4. Los precios de cada partido

Debajo de cada partido hay una fila de casillas con **el precio de cada tipo de
entrada para ese partido concreto**. Cámbialos y pulsa **Guardar precios**.

Esto es lo que permite que un derbi no cueste lo mismo que un amistoso:

| | General | Infantil |
|---|---|---|
| **Jornada 1** | 10 € | 5 € |
| **Jornada 2** | 12 € | 6 € |

Cada partido guarda **los suyos** y no afecta a los demás. Los precios de
partida, mientras no toques nada, son:

| Tipo de entrada | Precio |
|-----------------|--------|
| Entrada general | 10 € (incluye sorteo) |
| Entrada infantil | 5 € |
| Invitación | 0 € |

> **En taquilla no hay "entrada de socio".** Un abonado entra con su QR por la
> puerta y ahí ya queda contado como asistente. Si además se le cobrara una
> entrada de 0 €, aparecería **dos veces** en las estadísticas. Si ves ese tipo en
> algún partido antiguo es un precio guardado de antes: ya no se puede vender.

### 4.5. Crear un tipo de entrada nuevo

Con **+ Tipo de entrada** puedes inventarte los que necesites (`vip`,
`peña`, `jubilado`…): te pide un identificador corto y un precio, y a partir de
ese momento **aparece solo** como opción de venta en la taquilla de ese partido
y como una franja más en las estadísticas. No hay que tocar nada más.

### 4.6. "Todavía no hay calendario"

Si el club venía de la versión anterior, que tenía 17 jornadas fijas, verás
arriba un aviso con el botón **Adoptar el calendario anterior**. Al pulsarlo se
crea una competición «Liga» con esas 17 jornadas, **conservando todo lo ya
registrado**. A partir de ahí las renombras, reordenas o borras a tu gusto.

Ese botón desaparece en cuanto existe un calendario, para que nadie lo pulse dos
veces y duplique los partidos.

---

## 5. Socios

Pestaña **Socios**. Es el corazón de la aplicación.

### 5.1. Dar de alta a un socio

Rellena el formulario **Alta de socio** y pulsa **Añadir socio**.

**Obligatorios:** nombre, primer apellido, documento, fecha de nacimiento y tipo
de abono.

**Opcionales:** segundo apellido, teléfono y email. Aparecen marcados como
*opcional* en el propio formulario. Hay socios (críos de la escuela, gente
mayor, extranjeros con un solo apellido) que sencillamente no tienen esos datos,
y es mejor dejarlo vacío que inventárselo.

**Tipo de documento.** Elige entre **DNI / NIE**, **Pasaporte** u **Otro**:

- Con **DNI / NIE** se comprueba la letra de control, así que una errata como
  `12345678A` se detecta al momento.
- Con **Pasaporte** u **Otro** no hay letra que comprobar: se acepta lo que
  escribas mientras tenga forma razonable. **Revísalo bien**, porque aquí la
  aplicación no te va a salvar de un dedazo.

Si algo está mal te lo dice en rojo debajo del botón y no guarda nada:

- El **email**, si lo pones, debe tener forma de email.
- El **teléfono**, si lo pones, debe tener 9 dígitos (admite el `+34` delante).
- La **fecha de nacimiento** no puede ser futura ni imposible.
- **No puede haber dos socios activos con el mismo documento.**

**El número de carnet se asigna solo**, a continuación del último. No lo eliges
tú. Los huecos que van quedando se recuperan al renumerar (apartado 5.9).

### 5.2. El dinero del abono: importe y método de pago

En el mismo formulario tienes dos casillas más:

- **Método de pago:** Bizum, TPV o Efectivo.
- **Importe cobrado (€):** lo que le has cobrado **de verdad** a esa persona.

**Si dejas el importe en blanco, se cobra la tarifa de su abono.** Es lo normal.
Solo lo cambias cuando cobras algo distinto: un descuento familiar, un pago
parcial, un acuerdo especial. Un **0** escrito a mano sí vale y significa gratis.

Justo debajo del formulario tienes siempre a la vista el recuadro **Precios de
los abonos**, con los mismos nombres que ves en el desplegable:

| Abono | Precio |
|-------|--------|
| Abono Familiar | 170 € — pack familiar: 2 adultos + hasta 3 hijos |
| Abono General | 95 € — abono normal de temporada |
| Abono Internacional | 80 € — apoyo desde fuera |
| Abono Jubilado | 75 € |
| Abono -16 años | 50 € |
| Abono Academia | Gratis — jugadores de la escuela |
| Socio Colaborador | **Lo que aporte** |

Cuatro detalles de estos abonos:

- El **Abono Academia** es gratuito, así que al darlo de alta se marca **pagado**
  automáticamente.
- El **Abono Internacional** es para quien apoya al club sin ir al campo. **Su
  dinero cuenta entero** en la recaudación; lo que no cuenta es su asistencia, así
  que no hunde los porcentajes de las estadísticas. Si alguno viene y ficha, su
  entrada aparece aparte en el detalle por jornada.
- El **Socio Colaborador** no tiene tarifa: aporta lo que quiera. Por eso el
  importe es **obligatorio** al darlo de alta — la casilla sale vacía y no te deja
  guardar hasta que escribas la cantidad. Eso es lo que sumará en la recaudación.
- El precio de **cualquier** abono se puede cambiar en el alta, y también después
  desde la ficha del socio (apartado 5.6). La tarifa es un punto de partida.

> ⚠️ **Muy importante:** dar de alta a alguien **no lo marca como pagado**. El
> importe queda anotado, pero hasta que no marques su casilla **Pagado** en la
> tabla (apartado 5.3), ese dinero cuenta como **pendiente de cobro**, no como
> ingresado. Es a propósito: se apunta primero y se confirma el cobro después.

### 5.3. Marcar quién ha pagado

En la columna **Pagado** de la tabla, marca o desmarca la casilla. Se guarda al
instante. Solo el admin puede cambiarla.

### 5.4. Buscar un socio y moverte por la lista

El buscador filtra por **nombre, apellidos o DNI** según escribes. A la derecha
tienes el total de socios.

La lista se muestra **de 25 en 25**, con los botones **← Anterior** y
**Siguiente →** debajo de la tabla. Con cientos de socios, pintarlos todos hacía
la página interminable y en el móvil era inmanejable.

> **El buscador busca en TODOS los socios, no solo en la página que estás
> viendo.** Y el botón **⬇ CSV** sigue exportando la lista completa.

### 5.5. Ver la ficha de un socio

Pulsa **👤 Perfil**. Se abre una ficha con:

- **Partidos asistidos** (sobre los que se han jugado, no sobre el calendario
  entero) y su **porcentaje de asistencia**
- **Lo que ha pagado por su abono** y su estado de pago
- Todos sus datos, el método de pago y desde cuándo es socio
- La **⭐ de Socio Fundador** si le corresponde
- **Partido a partido**: a qué jornadas fue y a qué hora entró

El importe aparece arriba, entre las cifras grandes, y también en el detalle. Si
lo que se cobró no es la tarifa de su abono, se indica cuál era la tarifa entre
paréntesis. En un **Socio Colaborador** ese número es *el* dato: no hay tarifa de
la que deducirlo.

### 5.6. Editar los datos de un socio

Dentro de la ficha, **✏️ Editar** → cambia lo que necesites → **Guardar
cambios**. Se aplican las mismas comprobaciones que en el alta. Solo admin.

Además de sus datos personales puedes cambiar el **tipo de abono**, el **método
de pago** y el **importe del abono**. Ese importe es el que suma en la
recaudación de socios, así que si te equivocaste al darlo de alta —o el socio
colaborador cambia su aportación— se corrige aquí, sin volver a darlo de alta.

El número de socio **no se puede cambiar**.

### 5.7. Observaciones

Al final de la ficha hay un campo libre para lo que quieras anotar (alergias,
notas de contacto, incidencias…). Escribe y pulsa **Guardar**.

### 5.8. Eliminar a un socio

Pulsa **Eliminar** en su fila y confirma. A partir de ese momento:

- Desaparece de la lista, de los recuentos y de las estadísticas
- **Su carnet deja de funcionar** en el escáner
- **Su ficha se borra de verdad**: datos, cuota y carnet
- **Su número queda libre** y lo heredará el siguiente socio que des de alta

> ### ⚠️ Esto no se puede deshacer
>
> No hay papelera ni botón de recuperar. Está pensado sobre todo para **corregir
> un alta equivocada**; si dudas, haz antes una copia de seguridad (apartado 11).
>
> Si lo vuelves a dar de alta, recibirá un **número nuevo** y habrá que
> reimprimirle el carnet.

> **¿Y el carnet del que se fue, con el número que ahora tiene otro?** No sirve.
> El QR no lleva solo el número: lleva también un código de seguridad único de
> cada socio. El carnet viejo del nº 3 no abre la puerta del nuevo nº 3.

### 5.9. Renumerar los carnets en una temporada nueva

Durante la temporada, los socios que se van dejan huecos: si se elimina el socio
3, nadie tiene el 3 y los carnets llegan más alto que el número de socios que
tienes. Al empezar temporada nueva, **Renumerar** tapa esos huecos: los socios
pasan a estar numerados del **1 al N** sin saltos, respetando su antigüedad.

En la pestaña **Socios**, abajo del todo, la tarjeta **Nueva temporada ·
renumerar carnets** te dice cuántos huecos hay.

> ### ⚠️ Léelo antes de pulsar
>
> - **Todos los carnets actuales dejan de funcionar en ese mismo instante.** Es
>   así a propósito: si el carnet viejo del nº 3 siguiera valiendo, abriría la
>   puerta identificando al nuevo nº 3, que es otra persona.
> - **Hay que reimprimir y repartir todos los carnets**: pestaña **QRs → 📦
>   Descargar todos (ZIP)**. Hasta que la gente tenga el suyo, en la puerta habrá
>   que tirar de validación manual.
> - **No se puede deshacer.**
> - Hazlo **solo entre temporadas**, nunca a mitad, y **antes** de imprimir nada.
>
> Lo que **sí** se conserva: el historial completo de cada socio. Aunque le cambie
> el número, sus partidos y sus estadísticas siguen siendo suyos.

### 5.10. Exportar la lista a Excel

Pulsa **⬇ CSV**. Se descarga un archivo con todos los socios activos, que se abre
directamente en Excel.

---

## 6. Importar socios desde Excel

Pestaña **Importar** (solo admin). Para cargar muchos socios de golpe.

### Cómo preparar el archivo

Un `.xlsx` normal, con los nombres de las columnas en la **primera fila**:

| Nombre | Apellido 1 | Apellido 2 | Tipo documento | DNI | Fecha nac. | Teléfono | Email | Tipo |
|--------|-----------|-----------|----------------|-----|-----------|----------|-------|------|
| Ana | García | López | DNI / NIE | 12345678Z | 14/03/1990 | 600112233 | ana@correo.es | Abono General |
| John | Smith |  | Pasaporte | AB1234567 | 02/11/1985 |  |  | Abono General |

- El **Tipo** debe escribirse **exactamente** como aparece en la aplicación
  (`Abono General`, `Abono Familiar`, `Abono −16 años`…).
- La **fecha** puede ser una fecha de Excel o estar escrita como `14/03/1990`.
- **Apellido 2**, **Teléfono** y **Email** pueden ir vacíos.
- **Tipo documento** es opcional. Si no pones la columna, se asume **DNI / NIE**
  y se comprueba la letra.

### Cómo importar

1. Pulsa en **Archivo .xlsx** y elige el archivo.
2. La aplicación lo analiza y te muestra un **informe**: cuántas filas están
   listas y cuántas tienen problemas, con el número de fila y el motivo de cada
   una.
3. Pulsa **Importar filas válidas**.

> **Las filas con errores no se importan nunca.** Corrígelas en el Excel y vuelve
> a subir el archivo: las que ya entraron se detectarán como DNI repetido y no se
> duplicarán.

---

## 7. Carnets y códigos QR

Pestaña **QRs**.

Cada socio tiene un QR que es su carnet. Lleva dentro su número, **un código de
seguridad secreto y único** distinto para cada socio, y **la temporada en la que
se emitió**. Por eso no se puede fabricar un carnet desde fuera (no basta con
saber el número de socio) y por eso un QR de una temporada anterior deja de
funcionar.

**Un socio:** elígelo en el desplegable. El QR aparece al momento con su nombre,
número y tipo de abono. **⬇ Descargar PNG** para guardar la imagen e imprimirla.

**Todos de golpe:** **📦 Descargar todos (ZIP)**. Verás el progreso y al terminar
se descarga un ZIP con un PNG por socio activo. Si tienes muchos socios tarda un
rato: no cierres la pestaña hasta que termine.

---

## 8. El día del partido: el escáner

Pestaña **Escáner**. Es lo que usa el personal de la puerta. Solo existe
**ENTRADA**: la aplicación no controla salidas.

### 8.1. Antes de abrir puertas (solo admin): fija la jornada actual

En la pestaña **Escáner**, tarjeta **Jornada actual del club**: elige el partido
de hoy y pulsa **Fijar como jornada actual**.

A partir de ahí:

- El personal de **control de acceso** ya **no elige partido**: le aparece
  bloqueado con el de hoy puesto. Es imposible que fiche por error en el partido
  de la semana pasada.
- El **admin** sigue pudiendo elegir cualquier otro (para revisar o corregir un
  partido pasado), pero le sale un aviso en ámbar recordándoselo.

**Si el personal de la puerta ve "El admin aún no ha fijado la jornada actual"**,
es que falta este paso: avisa a un admin antes de abrir.

### 8.2. Validar con la cámara

Pulsa el botón grande **📷 Escanear QR** y acepta el permiso del navegador.
Apunta al QR del socio: **se lee solo, no hay que pulsar nada**. Al terminar,
**⏹ Parar cámara**.

Sobre la imagen verás un **recuadro discontinuo**. Es una **guía**, no un límite:
centrar ahí el carnet hace que entre antes, pero también lee fuera de él.

Debajo del vídeo aparece **«🔎 Buscando QR · N lecturas/s»**. Ese número te dice
que el lector está funcionando y a qué ritmo. Sirve para distinguir dos cosas que
desde fuera se ven igual:

- **Sale un número y se mueve** → el lector está bien; si un carnet no entra, es
  cosa de esa imagen (luz, enfoque, carnet estropeado).
- **Se queda en "Esperando imagen"** → la cámara no está dando imagen. Ciérrala y
  vuelve a abrirla.

**🔍 Leer ahora** es el botón de rescate: hace **un** intento a fondo sobre la
imagen completa y a máxima calidad, para el QR que se resiste. No hace falta
pulsarlo para escanear normalmente; solo cuando un carnet concreto no entra.
Sujeta el carnet quieto y púlsalo.

> La cámara solo funciona si la aplicación se abre con una dirección segura
> (`https://`), que es el caso de la dirección normal del club.

### 8.3. Validar a mano cuando el QR no se lee

Debajo tienes **Validación manual · ¿el QR no se lee?**.

Si el carnet está roto, borroso, o la cámara no enfoca, escribe **el número de
carnet o su DNI/NIE** y pulsa **Validar**. Funciona igual y queda registrado
igual. El nº de carnet puede cambiar de una temporada a otra; el DNI no cambia
nunca, así que es el dato más fiable si dudas.

> Esta vía **no comprueba el código de seguridad del carnet**, porque no hay QR
> que comprobar: la persona de la puerta está viendo al socio. Es a propósito,
> para que nunca te quedes bloqueado en la puerta.

### 8.4. Qué te dice la pantalla

Cada resultado se muestra en un **aviso grande a pantalla completa**, con sonido
y vibración, para que se note con ruido y con cola esperando.

**El lector no se para.** Puedes seguir pasando carnets con el aviso abierto: se
va actualizando con cada uno. El botón **Cerrar** es solo para quitarlo de en
medio cuando quieras.

| Aviso | Color | Qué significa | Qué hacer |
|-------|-------|---------------|-----------|
| ✅ **ACCESO VÁLIDO** | Verde | Todo correcto. Sale su nombre, abono y hora. | Que pase. |
| ⛔ **YA HA ENTRADO** | Rojo | Ese socio **ya entró** en este partido; te dice a qué hora. | No puede volver a entrar. Puede ser un carnet duplicado. |
| ❌ **No reconocido** | Rojo | Ese número o documento no es de ningún socio activo. | Que pase por taquilla. |
| 🚫 **CARNET NO VÁLIDO** | Rojo | El QR no es auténtico, o es de una temporada anterior. | Si reconoces a la persona como socia, valídala a mano (8.3) y dile que recoja su carnet nuevo. |

Cada socio **solo puede entrar una vez por partido**: se lo impide el propio
escáner.

### 8.5. Entradas registradas

Debajo tienes la lista de todo el que ha entrado, con número, nombre y hora, de
la más reciente a la más antigua. Se actualiza sola y la ven a la vez todas las
personas conectadas: **puede haber varias puertas escaneando al mismo tiempo**.

Si te equivocas, **Borrar** elimina ese registro y ese socio vuelve a poder
entrar.

> Esta lista es también la forma de **revisar un partido pasado**: un admin
> cambia el partido en el desplegable de arriba y ve (o corrige) sus fichajes.

### 8.6. Cerrar la jornada

Solo admin. Cuando el partido ha terminado y los datos son definitivos, pulsa
**🔒 Cerrar jornada**. A partir de ahí, en ese partido **no se pueden registrar
ni borrar entradas ni vender en taquilla**.

Se puede volver a abrir con **🔓 Desbloquear jornada**.

---

## 9. Taquilla

Pestaña **Taquilla**. Para las entradas sueltas del día del partido.

### 9.1. Cobrar una entrada

1. **Elige el partido** arriba.
2. Elige el **tipo de entrada**. La lista sale sola de los tipos que tenga ese
   partido (apartado 4.5).
3. El **precio cobrado** se rellena solo con la tarifa de ese partido. **Puedes
   cambiarlo** para esa venta concreta.
4. Elige el **método de pago**: Bizum, TPV o Efectivo.
5. Pulsa **Cobrar entrada**.

Debajo tienes siempre a la vista el recuadro **Precios de este partido**, que
muestra las tarifas **del partido seleccionado** — si a la jornada 2 le pusiste el
general a 12 €, ahí pone 12 €. No hay que acordarse de nada.

### 9.2. Cambiar el precio de una venta suelta

La casilla del precio es editable en cada venta. Sirve para:

- una **invitación** (pon 0)
- un **descuento** puntual
- un **suplemento**

**Las estadísticas registran lo que se cobró de verdad**, no la tarifa. Si cobras
una entrada a 7 €, en la recaudación aparecen 7 €.

### 9.3. Deshacer y anular ventas

Tienes dos formas de quitar una venta:

- **↩ Deshacer última venta**, para el error que acabas de cometer. El botón solo
  aparece si hay algo que deshacer.
- La tabla **Ventas de este partido**, debajo del resumen, con la hora, el tipo,
  el importe y el método de pago de cada una, y un botón **Anular** en cada fila.
  Es lo que necesitas cuando la entrada equivocada ya no es la última porque has
  cobrado tres más después.

**Al anular, esa venta deja de contar al momento**: desaparece del número de
entradas y de la recaudación, en la taquilla y en las estadísticas.

Igual que en el escáner, todo se comparte en tiempo real entre las personas
conectadas, y un **partido cerrado** no admite ventas ni anulaciones.

> Lo mismo vale para la puerta: si fichas a alguien por error, **Borrar** en
> *Entradas registradas* (apartado 8.5) lo quita de las estadísticas y su QR
> vuelve a estar disponible en esa jornada.

---

## 10. Estadísticas

Pestaña **Estadísticas**. Se calcula todo solo, no hay que introducir nada. Todo
sale de lo que ya has hecho: las altas, los fichajes de la puerta y las ventas.

Está dividida en **cuatro subpestañas**, arriba del todo. Cada una responde a una
pregunta, para no tener que bajar por una lista interminable buscando un dato:

| Subpestaña | Responde a |
|------------|-----------|
| **Resumen** | ¿Cómo va la temporada y de dónde sale el dinero? |
| **Socios** | ¿Quiénes son y cuánto han pagado? |
| **Taquilla** | ¿Qué se vende en la puerta? |
| **Asistencia** | ¿Quién viene al campo? |

### 10.0. Ver cómo quedan las estadísticas antes de tener datos

Al empezar la temporada las estadísticas están casi vacías y no se entiende para
qué sirven. Debajo de las subpestañas tienes **👁 Ver con datos de ejemplo**:
rellena toda la pantalla con una temporada inventada —128 socios, 8 partidos
jugados, taquilla y asistencia— para que veas cómo se leerá cuando tengas datos
de verdad.

Mientras está encendido aparece un **aviso amarillo bien visible** recordándote
que esas cifras no son del club. Se apaga con **✕ Quitar datos de ejemplo**, y
también **se apaga solo al recargar la página**.

> **No ensucia nada.** Los datos de ejemplo se inventan en tu navegador y no se
> guardan en ningún sitio: ni socios, ni fichajes, ni ventas, ni copias. La otra
> gente conectada no ve nada distinto, y en cuanto lo apagas vuelven tus datos
> exactamente como estaban.

### 10.1. Resumen

- **Las cifras de cabecera**: socios, partidos con datos, asistentes totales,
  ingreso total de la temporada y socios pendientes de pago.
- **De dónde sale el dinero**: cuánto han aportado las cuotas de socio y cuánto la
  taquilla, con su porcentaje. Son **dos negocios distintos** y por eso van
  separados; mezclarlos no dice nada útil.
- **Resumen por competición** y **detalle por jornada**, partido a partido.

El **% de asistencia** se colorea solo: 🟢 verde por encima del 70 %, 🟡 ámbar
entre 30 % y 70 %, 🔴 rojo por debajo. Se calcula solo sobre los abonos que
asisten al campo: el **Abono Internacional queda fuera de la base** a propósito.
Si uno de ellos viene y ficha, su entrada aparece **en gris al lado** del número
de socios de esa jornada, para que no parezca que se ha perdido un fichaje.

### 10.2. Socios

- **Cuotas de socio**: dados de alta, cobrado, pendiente y **cuota media**.
- **Desglose por tipo de abono**, con su cuota media. Es lo que hay que mirar para
  el **Socio Colaborador**: como no tiene tarifa, la media es la única forma de
  saber cuánto está aportando la gente.
- **Socios por tipo de abono**, con el porcentaje y una columna que dice si ese
  abono **cuenta para la asistencia**.
- **Cómo pagan la cuota**: Bizum, TPV o efectivo.
- **Perfil de los socios**: edades, tipos de documento, cuántos tienen email y
  teléfono, morosidad, fundadores y cuántos no cuentan para la asistencia.
- **Evolución de las altas**: cuántas y cuánto dinero, mes a mes.

Recuerda que una cuota cuenta como cobrada solo si el socio está marcado como
**Pagado** (apartado 5.3).

### 10.3. Taquilla

- **Recaudación por entradas**, entradas vendidas, **ticket medio**, media por
  partido jugado y mejor y peor taquilla.
- **Gráfico de recaudación por partido y tipo**: cada barra es un partido, cada
  color un tipo de entrada, y la altura es **dinero**.
- **Recaudación por tipo de entrada**, con su precio medio.
- **Cómo se cobra en la puerta**: para **cuadrar la caja** al terminar el partido,
  porque el efectivo es lo único que hay que contar a mano.

### 10.4. Asistencia

- **Media por jornada**, ocupación, socios con asistencia perfecta, absentistas,
  hora punta y mejor y peor partido.
- **Gráfico de asistentes por partido y tipo**: el mismo desglose que el de
  taquilla pero contando **personas**. Aquí sí aparecen los abonados que entran
  con su QR, que no pagan en la puerta pero son la mayoría de la gente que hay en
  el campo. Es normal que los dos gráficos no se parezcan: **quien llena el campo
  y quien lo paga no son los mismos**.
- **Fidelidad** (cuántos socios van a cuántos partidos) y **franjas horarias** de
  entrada, útil para saber a qué hora llega la gente y cuánta puerta hacen falta.
- **Asistencia por tipo de abono** y **ranking de socios**.

---

## 11. Copias de seguridad

Pestaña **Backup** (solo admin).

Pulsa **Crear copia ahora** y en unos segundos tendrás una copia con todos los
socios, entradas y ventas del momento. En la lista ves la fecha, cuánto incluye y
**quién la hizo**.

**⬇ Descargar JSON** la guarda en tu ordenador. Es, en la práctica, la forma de
exportar todos los datos de una vez.

Se guardan las **7 copias más recientes**: al crear la octava, la más antigua se
borra sola.

> **Recomendación:** una copia **después de cada partido** y otra al terminar las
> altas de pretemporada. Es un botón y tarda segundos.

> ⚠️ **Dos avisos:**
> - Las copias contienen **datos personales**. Guárdalas en sitio seguro y
>   bórralas cuando no las necesites.
> - **No hay botón de "restaurar".** La copia sirve para que no se pierda la
>   información, pero volcarla de vuelta hay que hacerlo a mano en Firebase. Si
>   crees que la necesitas, **no toques nada más** y pide ayuda antes de seguir
>   usando la aplicación, para no sobrescribir lo que habría que recuperar.

### 11.1. Zona peligrosa: los dos reinicios

Abajo del todo de la misma pestaña, en un recuadro rojo, hay **dos botones**
(solo admin). Se parecen y hacen cosas muy distintas, así que van numerados:

| | Botón | Qué borra | Cuándo se usa |
|-|-------|-----------|---------------|
| **1** | Reiniciar todas las jornadas | Fichajes y ventas. **Los socios se quedan.** | Empieza una temporada nueva |
| **2** | 🧨 Borrarlo todo y empezar de cero | Lo anterior **y todos los socios** | Se acaban las pruebas |

**Qué NO toca ninguno de los dos:** el calendario de competiciones, los precios,
los usuarios de la aplicación y las copias de seguridad. Todo eso se queda.

**Cómo funcionan los dos:**

1. Te enseñan **exactamente lo que van a borrar**, contado: cuántos socios,
   cuántas entradas, cuántas ventas y cuántas jornadas cerradas.
2. Te piden escribir una palabra — **BORRAR** el primero, **EMPEZAR DE CERO** el
   segundo. Es a propósito: un "¿estás seguro?" normal se acepta sin leerlo.
3. **Guardan una copia de seguridad automáticamente** antes de tocar nada, y si
   esa copia falla no borran nada.

#### Cuál quieres

- **Reiniciar todas las jornadas** es el de cada verano: se van los datos del año
  pasado y los socios siguen ahí para renovar.
- **Borrarlo todo y empezar de cero** es el de una sola vez: cuando has terminado
  de probar la aplicación con socios y partidos inventados y quieres arrancar en
  limpio. Después de pulsarlo hay que **dar de alta a los socios de verdad** y
  **reimprimir todos los carnets**, porque los de prueba ya no existen.

> ⚠️ **Ninguno de los dos se puede deshacer.** La copia previa queda en la lista
> de arriba y puedes descargarla, pero volver a meterla en la aplicación no es un
> botón (ver el aviso de arriba).

> **Los números de carnet vuelven a empezar en el 1** después de borrarlo todo.
> Por dentro, el identificador de cada socio sigue avanzando y nunca se repite:
> es lo que impide que un carnet viejo abra la puerta de un socio nuevo.

---

## 12. Dar acceso a la gente del club

Esto es lo único que **no se hace desde la aplicación**, sino desde la consola de
Firebase, que es donde viven los datos.

Ve a **[console.firebase.google.com](https://console.firebase.google.com)**,
entra con la cuenta de Google del club y selecciona el proyecto.

### 12.1. Dar de alta a una persona (dos pasos)

**Paso 1 — crearle el usuario**

**Authentication** → pestaña **Users** → **Añadir usuario**.

- **Correo:** el suyo
- **Contraseña:** una provisional, mínimo 6 caracteres

Pulsa **Añadir usuario**. En la lista aparecerá su **UID**: una cadena larga tipo
`k3Jd8sLpQ2XyZ...`. **Cópiala.**

**Paso 2 — darle su rol** ← *sin esto entra pero no puede hacer nada*

**Firestore Database** → colección **`usuarios`** → **Añadir documento**.

- **ID del documento:** pega el **UID** (⚠️ **no** pulses "ID automático")
- Añade tres campos de tipo **string**:

| Campo | Valor |
|-------|-------|
| `rol` | `admin`, `taquillero`, `control_acceso` o `lector` |
| `email` | su correo |
| `nombre` | su nombre y apellidos |

Pulsa **Guardar**. Ya puede entrar.

> **Los tres errores que se cometen siempre:**
> 1. Dejar "ID automático" en vez de pegar el UID → entrará como "sin rol".
> 2. Escribir el rol con mayúsculas o con un espacio de más.
> 3. Copiar el UID con un espacio delante o detrás.

### 12.2. Cambiar el rol de una persona

**Firestore** → `usuarios` → su documento → pulsa sobre el valor de `rol` y
escribe el nuevo. Se aplica **la próxima vez que entre** (si está dentro, que
salga y vuelva).

### 12.3. Quitarle el acceso a alguien

Haz las dos cosas:

1. **Authentication → Users** → menú ⋮ → **Inhabilitar cuenta** (o **Eliminar**).
2. **Firestore → `usuarios`** → borra su documento.

### 12.4. Alguien ha olvidado su contraseña

**Authentication → Users** → menú ⋮ → **Restablecer contraseña** (le llega un
correo) o **Editar usuario** para ponerle una nueva a mano.

---

## 13. Protección de datos

La aplicación guarda datos personales de los socios, así que el club es
responsable de ellos ante el RGPD. En la práctica:

- **Da acceso solo a quien lo necesite.** Recuerda que **cualquier rol puede ver
  los datos completos de todos los socios**, incluido el DNI.
- **Un usuario por persona.** Nada de una cuenta compartida "del club": si pasa
  algo, hay que saber quién hizo qué. La aplicación ya registra quién dio de
  alta, quién modificó y quién cobró.
- **Quítale el acceso** a quien deje el club (12.3).
- **Cuida los archivos que descargues** (CSV, JSON de copia, ZIP de carnets):
  salen del control de la aplicación y llevan datos personales.
- Los socios tienen derecho a **acceder, rectificar y suprimir** sus datos. El
  derecho de supresión se atiende con **Eliminar** en su fila (5.8), que borra la
  ficha de verdad. Ojo: **las copias de seguridad anteriores siguen conteniéndola**
  hasta que rotan, así que si alguien ejerce ese derecho, revísalas.

---

## 14. Preguntas frecuentes

**¿Necesito instalar algo?**
No. Solo un navegador. En el móvil puedes añadirla a la pantalla de inicio.

**¿Varias personas a la vez?**
Sí. Todo se sincroniza al instante: varias puertas, taquilla y oficina a la vez.

**¿Y si no hay cobertura en la puerta del campo?**
La aplicación necesita conexión. Sin datos, el escáner no valida. Si el campo
tiene mala cobertura, pruébalo antes del partido y ten a mano una lista impresa
como plan B.

**¿Puedo cambiar los precios?**
Sí, y sin ayuda de nadie. Los de las **entradas**, partido a partido, en
Competiciones (4.4), y también en cada venta suelta (9.2). Los de los **abonos**
son la tarifa de referencia del club: puedes cobrar un importe distinto en cada
alta (5.2), y para cambiar la tarifa general pídeselo a quien lleva el
mantenimiento técnico.

**¿Puedo añadir más partidos a mitad de temporada?**
Sí, cuando quieras. Competiciones → añadir partido (4.2). También puedes crear
competiciones nuevas (una copa, un torneo de verano) sin tocar nada más.

**Me equivoqué al validar a alguien, ¿puedo deshacerlo?**
Sí: en **Entradas registradas**, botón **Borrar** en su fila.

**Un socio ha perdido el carnet.**
Ve a **QRs**, selecciónalo y descarga su PNG otra vez. Es el mismo carnet: el
anterior sigue siendo válido.

**Un socio viene con el carnet del año pasado y le sale CARNET NO VÁLIDO.**
Normal: los carnets llevan la temporada en la que se emitieron. Valídale a mano
(8.3) y dale su carnet nuevo.

**Un socio extranjero no tiene DNI ni dos apellidos.**
Sin problema: elige **Pasaporte** u **Otro** y deja el segundo apellido vacío.

**No tengo el email ni el teléfono de un socio.**
Déjalos vacíos, son opcionales.

**Alguien intenta entrar con el carnet de otro.**
El escáner avisa con ⛔ **YA HA ENTRADO** en cuanto el titular real haya pasado.
Los carnets no llevan foto: la identidad la comprueba el personal de la puerta.

**La cámara se abre pero no lee.**
Mira el número de **lecturas/s** debajo del vídeo (8.2). Si se mueve, el lector
va bien y es cosa de la imagen: más luz, acerca el carnet, o usa **🔍 Leer
ahora**. Si no, cierra y vuelve a abrir la cámara. Y siempre te queda la
validación manual (8.3).

**No me deja hacer algo y me habla de permisos.**
Tu rol no lo permite. Mira la tabla del apartado 3 y pide a un admin que te lo
cambie si de verdad lo necesitas.

**Como personal de la puerta, no puedo elegir el partido.**
Es a propósito (8.1): solo puedes fichar en el que el admin haya fijado como
jornada actual. Si es el equivocado, avisa a un admin.

**Hemos estado probando y quiero dejarlo todo limpio para empezar de verdad.**
Pestaña **Backup** → **Reiniciar todas las jornadas** (apartado 11.1). Borra los
fichajes y las ventas de prueba y deja intactos los socios y el calendario.

**Veo un partido repetido en las listas.**
No debería pasar. Si ocurre, avisa al mantenimiento técnico.

**La pantalla se ve rara o no carga.**
Recarga con **Ctrl + F5** (en el móvil, cierra la app del todo y vuelve a
abrirla). Si sigue igual, prueba en otro navegador antes de dar la alarma.

---

## 15. Firebase: lo mínimo que hay que saber

Casi todo se hace desde la propia aplicación, pero **dar de alta usuarios**
(apartado 12) y, en una emergencia, **corregir un dato a mano**, se hacen desde
la consola de Firebase. No hace falta programar: son formularios y tablas, como
una hoja de cálculo online.

### Entrar

**[console.firebase.google.com](https://console.firebase.google.com)** con la
cuenta de Google del club, y selecciona el proyecto.

> ⚠️ Si ves **más de un proyecto** con nombre parecido, asegúrate de entrar en el
> correcto: el nombre visible se puede cambiar, pero el **ID del proyecto** no.
> Lo tienes en ⚙️ → **Configuración del proyecto** → *ID del proyecto*, y quien
> lleva el mantenimiento técnico te dirá cuál es el bueno. Trabajar en el
> proyecto equivocado es el error que más tiempo hace perder.

### Encontrar los datos: Firestore Database

Muestra las "colecciones" (como pestañas de una hoja de cálculo): `socios`,
`entradas`, `taquilla`, `competiciones`, `usuarios`, `backups`,
`jornadas_bloqueadas`, `config`, `contadores`. Cada colección tiene "documentos"
(cada fila) con "campos" (cada columna).

### Editar un documento a mano: con cuidado

> ⚠️ **No toques estos campos** de `socios` salvo que sepas lo que haces, porque
> rompen el historial o la auditoría: `numerico`, `creadoPor`, `creadoEn`,
> `alta`, `tokenQR`.
>
> Los que sí es razonable tocar: `nombre`, `ap1`, `ap2`, `dni`, `tel`, `email`,
> `tipo`, `pagado`, `observaciones`. Aun así, **edítalos desde la aplicación**
> siempre que puedas (5.6): así queda registrado quién lo cambió y cuándo.

### Republicar las reglas de seguridad

La aplicación tiene un fichero de "reglas" que decide quién puede leer o escribir
cada dato. Vive en el código (`firestore.rules`) pero **no se aplica solo**: si el
mantenimiento técnico te pide "republicar las reglas", es en **Firestore Database
→ pestaña Reglas → pegar el contenido → Publicar**.

Si algo falla justo después de una actualización y el mensaje habla de permisos,
esto es lo primero que hay que mirar.

### Cuándo NO tocar nada y avisar

Si algo parece corrupto, si borraste algo importante, o si dudas de si un cambio
es seguro: **no sigas tocando**, haz una copia de seguridad si puedes (apartado
11) y avisa al mantenimiento técnico. Es mucho más fácil arreglar un problema
pequeño que uno grande.
