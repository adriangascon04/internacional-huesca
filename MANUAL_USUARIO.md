# Manual de uso · Gestión de Abonados

**Internacional Huesca** · Guía para el día a día del club.

Esta guía explica **todo lo que la aplicación puede hacer** y cómo hacerlo.
No hace falta saber nada de programación. Lo único que se hace fuera de la
aplicación es **dar de alta a las personas del club que van a usarla**, y eso se
explica paso a paso en el apartado 9.

---

## Índice

1. [Entrar en la aplicación](#1-entrar-en-la-aplicación)
2. [Qué puede hacer cada persona](#2-qué-puede-hacer-cada-persona)
3. [Socios](#3-socios) · [renumerar temporada](#39-renumerar-los-carnets-en-una-temporada-nueva)
4. [Importar socios desde Excel](#4-importar-socios-desde-excel)
5. [Carnets y códigos QR](#5-carnets-y-códigos-qr)
6. [Escáner: control de acceso el día del partido](#6-escáner-control-de-acceso-el-día-del-partido)
7. [Taquilla](#7-taquilla)
8. [Estadísticas](#8-estadísticas)
9. [Usuarios del club: dar acceso a la aplicación](#9-usuarios-del-club-dar-acceso-a-la-aplicación)
10. [Copias de seguridad](#10-copias-de-seguridad)
11. [Protección de datos](#11-protección-de-datos)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Entrar en la aplicación

Abre la dirección de la aplicación en el navegador (Chrome, Safari, Edge…), desde
ordenador o desde el móvil. Verás una pantalla de acceso: introduce **tu correo y
tu contraseña** y pulsa **Entrar**.

Arriba a la derecha aparecerá tu correo y tu tipo de acceso, por ejemplo
`portero@club.es · control_acceso`. Al lado tienes el botón **Salir**.

> **Si pone "sin rol":** tienes usuario pero nadie te ha asignado permisos.
> Quien administre la aplicación debe completar el paso del apartado 9.

**En el móvil:** puedes añadir la aplicación a la pantalla de inicio (en Chrome,
menú ⋮ → *Añadir a pantalla de inicio*) y se abrirá como una app normal. Va bien
para el portero en la puerta del campo.

---

## 2. Qué puede hacer cada persona

Cada usuario tiene un **rol**. El rol decide qué pestañas ve y qué puede tocar.
Las pestañas que no le corresponden ni siquiera le aparecen.

| Rol | Socios | Carnets QR | Escáner | Taquilla | Estadísticas | Cerrar jornada | Renumerar | Importar | Copias |
|-----|--------|-----------|---------|----------|--------------|----------------|-----------|----------|--------|
| **admin** | Todo: alta, editar, baja, pagos | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| **taquillero** | Solo consultar | Sí | No | Vender | Sí | No | No | No | No |
| **control_acceso** | Solo consultar | Sí | Sí (entradas y salidas, sin borrar) | No | Sí | No | No | No | No |
| **lector** | Solo consultar | Sí | No | No | Sí | No | No | No | No |

> ⚠️ **Importante para protección de datos:** cualquier persona que entre en la
> aplicación, sea del rol que sea, puede **consultar la ficha completa de los
> socios**, incluidos DNI, teléfono y email. No se puede ocultar solo ese dato a
> unos roles y a otros no. Tenlo en cuenta al decidir a quién das acceso.

---

## 3. Socios

Pestaña **Socios**. Es el corazón de la aplicación.

### 3.1. Dar de alta a un socio

Rellena el formulario **Alta de socio** y pulsa **Añadir socio**.

Son obligatorios el nombre, el primer apellido, el documento, la fecha de
nacimiento, el teléfono, el email y el tipo de abono. **El segundo apellido es
opcional**: quien no tenga (extranjeros, o españoles con un solo apellido
registral) deja la casilla vacía y ya está.

**Tipo de documento.** Elige entre **DNI / NIE**, **Pasaporte** u **Otro**
(documento extranjero, permiso de residencia…). La diferencia importa:

- Con **DNI / NIE** se comprueba la letra de control, así que una errata como
  `12345678A` se detecta al momento.
- Con **Pasaporte** u **Otro** no hay letra que comprobar: se acepta lo que
  escribas mientras tenga forma razonable. **Revísalo bien**, porque aquí la
  aplicación no te va a salvar de un dedazo.

El resto de comprobaciones se hacen siempre, y si algo está mal te lo dice en rojo
debajo del botón sin guardar nada:

- El **email** debe tener forma de email.
- El **teléfono** debe tener 9 dígitos (admite el `+34` delante).
- La **fecha de nacimiento** no puede ser futura ni imposible.
- **No puede haber dos socios activos con el mismo documento.**

**El número de carnet se asigna solo**, a continuación del último. No lo eliges
tú. Los huecos que dejan las bajas se recuperan al renumerar la temporada
(apartado 3.9).

**Tipos de abono disponibles:** Familiar, General, Internacional, Academia,
Jubilado y −16 años.

- El **Abono Academia** es gratuito, así que al darlo de alta se marca **pagado**
  automáticamente.
- El **Abono Internacional** no asiste al campo, así que **no cuenta** en los
  porcentajes de asistencia de las estadísticas.

### 3.2. Buscar un socio

El buscador filtra por **nombre, apellidos o DNI** según escribes. A la derecha
tienes el **total de socios** dados de alta.

### 3.3. Marcar quién ha pagado

En la columna **Pagado** de la tabla, marca o desmarca la casilla. Se guarda al
instante, no hay que pulsar nada más. Solo el admin puede cambiarla.

### 3.4. Ver la ficha de un socio

Pulsa **👤 Perfil**. Se abre una ficha con:

- **Partidos asistidos** (sobre los que se han jugado, no sobre los 17 de la
  temporada) y su **porcentaje de asistencia**
- **Tiempo medio que pasa en el campo**, si se le han fichado salidas
- **Estado de pago**
- Todos sus datos: nombre completo, documento, fecha de nacimiento, teléfono,
  email, tipo de abono y desde cuándo es socio
- La **⭐ de Socio Fundador**, que aparece sola en quienes se dieron de alta antes
  del 30 de mayo de 2027
- **Partido a partido**: a qué jornadas fue, a qué hora entró, a qué hora salió y
  cuánto tiempo estuvo dentro

En la tabla de partido a partido, **"sin fichar"** significa que entró pero nadie
registró su salida. No significa que se quedara dentro: solo que no se le fichó.

### 3.5. Editar los datos de un socio

Dentro de la ficha (👤 Perfil), pulsa **✏️ Editar**, cambia lo que necesites y pulsa
**Guardar cambios**. Se aplican las mismas comprobaciones que en el alta.
Solo el admin ve este botón.

El número de socio **no se puede cambiar**.

### 3.6. Observaciones

Al final de la ficha hay un campo libre de **Observaciones** para lo que quieras
anotar (alergias, notas de contacto, incidencias…). Escribe y pulsa **Guardar**.

### 3.7. Dar de baja a un socio

Pulsa **Dar de baja** en su fila y confirma. A partir de ese momento:

- Desaparece de la lista y de los recuentos
- **Su carnet deja de funcionar** en el escáner
- Su ficha no se borra: sigue guardada por si hay que consultarla
- **Su número queda libre**, pero no se le da a nadie hasta que renumeres la
  temporada (apartado 3.9). A mitad de temporada nunca se mueve nada.

> **No hay botón para reactivar a un socio dado de baja.** Si te equivocas,
> avisa a quien administre la aplicación. Si lo das de alta otra vez desde el
> formulario, recibirá un **número nuevo** y habrá que reimprimirle el carnet.

### 3.8. Exportar la lista a Excel

Pulsa **⬇ CSV**. Se descarga un archivo con todos los socios activos y sus datos,
que se abre directamente en Excel.

### 3.9. Renumerar los carnets en una temporada nueva

Durante la temporada, las bajas van dejando huecos: si se va el socio 3, nadie
tiene el 3 y los carnets llegan más alto que el número de socios que tienes. Al
empezar temporada nueva, **Renumerar** tapa esos huecos: los socios pasan a estar
numerados del **1 al N** sin saltos, respetando su antigüedad (el más veterano se
queda con el número más bajo).

En la pestaña **Socios**, abajo del todo, la tarjeta **Nueva temporada ·
renumerar carnets** te dice cuántos huecos hay. Pulsa **🔄 Renumerar para la nueva
temporada** y confirma.

> ### ⚠️ Léelo antes de pulsar
>
> - **Todos los carnets actuales dejan de funcionar en ese mismo instante.** Es
>   así a propósito: si el carnet viejo del nº 3 siguiera valiendo, abriría la
>   puerta identificando al nuevo nº 3, que es otra persona.
> - **Hay que reimprimir y repartir todos los carnets**: pestaña **QRs → 📦
>   Descargar todos (ZIP)**. Hasta que la gente tenga el carnet nuevo, en la
>   puerta habrá que tirar de validación manual.
> - **No se puede deshacer.**
> - Hazlo **solo entre temporadas**, nunca a mitad, y **antes** de imprimir nada.
>
> Lo que **sí** se conserva: el historial completo de cada socio. Aunque le cambie
> el número, sus partidos, sus horas de entrada y sus estadísticas siguen siendo
> suyos.

---

## 4. Importar socios desde Excel

Pestaña **Importar** (solo admin). Sirve para cargar muchos socios de golpe.

### Cómo preparar el archivo

Un `.xlsx` normal, con los nombres de las columnas en la **primera fila**:

| Nombre | Apellido 1 | Apellido 2 | Tipo documento | DNI | Fecha nac. | Teléfono | Email | Tipo |
|--------|-----------|-----------|----------------|-----|-----------|----------|-------|------|
| Ana | García | López | DNI / NIE | 12345678Z | 14/03/1990 | 600112233 | ana@correo.es | Abono General |
| John | Smith |  | Pasaporte | AB1234567 | 02/11/1985 | 600998877 | john@correo.es | Abono General |

- El **Tipo** debe escribirse **exactamente** como aparece en la aplicación
  (`Abono General`, `Abono Familiar`, `Abono −16 años`…).
- La **fecha** puede ser una fecha de Excel o estar escrita como `14/03/1990`.
- **Apellido 2** puede ir vacío.
- **Tipo documento** es opcional (`DNI / NIE`, `Pasaporte` u `Otro`). Si no pones
  la columna o la dejas vacía, se asume **DNI / NIE** y se comprueba la letra.

### Cómo importar

1. Pulsa en **Archivo .xlsx** y elige el archivo.
2. La aplicación lo analiza y te muestra un **informe**: cuántas filas están listas
   y cuántas tienen problemas, con el número de fila y el motivo exacto de cada una.
3. Pulsa **Importar filas válidas**.

> **Las filas con errores no se importan nunca.** Corrígelas en el Excel y vuelve
> a subir el archivo: las que ya entraron se detectarán como DNI repetido y no se
> duplicarán.

También se avisa de los DNI que ya existen en la base de datos o que están
repetidos dentro del propio archivo.

---

## 5. Carnets y códigos QR

Pestaña **QRs**.

Cada socio tiene un QR que es su carnet. Lleva dentro su número **y un código de
seguridad secreto y único**, distinto para cada socio. Por eso **no se puede
fabricar un carnet desde fuera**: no basta con saber el número de socio.

### Generar el carnet de un socio

Elige el socio en el desplegable. El QR aparece al momento junto a su nombre,
número y tipo de abono. Pulsa **⬇ Descargar PNG** para guardar la imagen e
imprimirla.

### Generar todos los carnets de golpe

Pulsa **📦 Descargar todos (ZIP)**. Verás el progreso y al terminar se descarga un
ZIP con un PNG por cada socio activo, con su nombre en el archivo.

Si tienes muchos socios tarda un rato: no cierres la pestaña hasta que termine.

> **Los carnets no caducan** y no hace falta reemitirlos cada temporada. Solo hay
> que generar el de los socios nuevos.

---

## 6. Escáner: control de acceso el día del partido

Pestaña **Escáner**. Es lo que usa el portero en la puerta.

### 6.1. Antes de empezar

**Elige la jornada** en el desplegable. Mientras no lo hagas no se puede validar a
nadie. Es el error más habitual del día de partido: comprueba siempre que arriba
pone la jornada correcta.

### 6.2. Elige el modo: ENTRADA o SALIDA

Debajo de la jornada hay dos botones grandes. **El modo decide qué se graba con
cada escaneo**, así que míralo antes de empezar a fichar:

- **⬅️ ENTRADA** (verde) — lo normal. La gente que llega al campo.
- **SALIDA ➡️** (ámbar) — la gente que se va. En cuanto lo activas, **el panel
  entero se tiñe de ámbar** y sale un aviso arriba, para que no se te pase.

El modo se queda como lo dejes hasta que lo cambies. Si te vas a otra pestaña y
vuelves, sigue en el modo que tenía.

**Fichar salidas es opcional.** Si no las fichas, todo lo demás funciona igual: lo
único que pierdes son las estadísticas de a qué hora se va la gente y el tiempo
que pasa en el campo. Cuantas más salidas fiches, más fiables son (apartado 8).

### 6.3. Validar con la cámara

Pulsa **📷 Activar cámara** y acepta el permiso que pide el navegador. Apunta al QR
del socio: se lee solo, no hay que pulsar nada. Al terminar, **⏹ Parar cámara**.

La cámara solo funciona si la aplicación se abre con una dirección segura
(`https://`), que es el caso de la dirección normal del club.

### 6.4. Validar a mano cuando el QR no se lee

Debajo tienes **Validación manual · ¿el QR no se lee?**.

Si el carnet está roto, borroso, la pantalla del móvil del socio no da luz o la
cámara no enfoca, **escribe el número de carnet y pulsa Validar**. Funciona igual
que el escaneo, respeta el modo que tengas puesto y queda registrado igual.

> Esta vía **no comprueba el código de seguridad del carnet**, porque no hay QR que
> comprobar: la persona de la puerta está viendo al socio. Es a propósito, para que
> nunca te quedes bloqueado en la puerta. Úsala cuando reconozcas al socio o cuando
> haya podido identificarse de otra forma.

### 6.5. Qué te dice la pantalla

**En modo ENTRADA:**

| Mensaje | Qué significa | Qué hacer |
|---------|---------------|-----------|
| ✅ **ACCESO VÁLIDO** (verde, con pitido) | Todo correcto. Sale su nombre, tipo de abono y hora. | Que pase. |
| ⚠️ **QR ya utilizado** | Ese socio **ya entró** en esta jornada, y te dice a qué hora. | No puede volver a entrar. Alguien está usando un carnet duplicado, o ya pasó él mismo. |
| ❌ **QR no reconocido** | Ese número de carnet no existe o está dado de baja. | No es socio en activo. Que pase por taquilla. |
| 🚫 **CARNET NO VÁLIDO** | El QR no es auténtico, o es un carnet **de una temporada anterior** que ya se renumeró. | Si reconoces a la persona como socia, valídala a mano con su número (apartado 6.4) y dile que recoja su carnet nuevo. |
| 🔒 **Jornada cerrada** | La jornada está bloqueada. | Un admin tiene que desbloquearla. |

**En modo SALIDA:**

| Mensaje | Qué significa | Qué hacer |
|---------|---------------|-----------|
| 🚪 **SALIDA REGISTRADA** (ámbar) | Correcto. Te dice cuánto tiempo ha estado dentro. | Nada más. |
| ❌ **NO CONSTA SU ENTRADA** | Esa persona no tiene entrada fichada en esta jornada. | Casi siempre es que **tienes el modo equivocado**: mira si querías fichar una entrada. Si no, es que entró sin fichar. |
| ⚠️ **SALIDA YA FICHADA** | Ya se le fichó la salida antes. | Nada. |

Cada socio **solo puede entrar una vez por jornada**, y solo se le ficha una salida.

### 6.6. Entradas registradas

Debajo tienes la lista de todo el que ha entrado en esa jornada, con su número,
nombre, hora de entrada, hora de salida y tiempo dentro, de la más reciente a la
más antigua. Arriba de la tabla, un resumen: **cuántos han entrado, cuántos siguen
dentro y cuántos se han ido**.

Se actualiza sola y la ven a la vez todas las personas conectadas: **puede haber
varios porteros en varias puertas al mismo tiempo** sin pisarse.

Si te equivocas, **Borrar** elimina ese registro (su entrada **y** su salida) y ese
socio vuelve a poder entrar.

### 6.7. Cerrar la jornada

Solo admin. Cuando el partido ha terminado y los datos son definitivos, pulsa
**🔒 Cerrar jornada**. A partir de ahí, en esa jornada **no se pueden registrar ni
borrar entradas ni vender en taquilla**. Es el "cierre de acta".

Se puede volver a abrir con **🔓 Desbloquear jornada**.

---

## 7. Taquilla

Pestaña **Taquilla**. Para las entradas sueltas del día del partido.

1. **Elige la jornada.**
2. Pulsa **+1 General** (10 €) o **+1 Menor** (5 €) por cada entrada que vendas.
   El contador sube al momento.
3. Debajo ves el **total de entradas vendidas** y la **recaudación** de esa jornada.

Si te equivocas, **↩ Deshacer última venta** quita la última. El botón solo aparece
si hay algo que deshacer.

Igual que en el escáner, los contadores se comparten en tiempo real entre todas las
personas conectadas, y una **jornada cerrada** no admite ventas.

---

## 8. Estadísticas

Pestaña **Estadísticas**. Se calcula todo solo, no hay que introducir nada.

- **Resumen general** en tarjetas
- **Gráfico de asistencia por jornada**
- **Afluencia por horas** (ver abajo)
- **Detalle por jornada:** socios que entraron, % de asistencia, entradas de
  taquilla, total de asistentes y recaudación de cada jornada
- **Recaudación total** de la temporada, arriba de la tabla
- **Socios por tipo de abono**

El **% de asistencia** se colorea solo: 🟢 verde por encima del 70 %, 🟡 ámbar entre
el 30 % y el 70 %, 🔴 rojo por debajo. Se calcula solo sobre los abonos que asisten
al campo (el Abono Internacional queda fuera).

### Afluencia · a qué hora entra y sale la gente

Esta tarjeta responde a "¿cuándo llega la gente?" y "¿cuándo hay más gente en el
campo?". Elige una jornada concreta o déjalo en **Todas las jornadas jugadas** para
ver el patrón general.

Los fichajes se agrupan en **franjas de 15 minutos**. El gráfico enseña tres cosas:

- **barras verdes** — cuánta gente entra en cada franja
- **barras rojas** — cuánta gente sale
- **línea azul** — cuánta gente hay **dentro** en ese momento (los que han entrado
  menos los que han salido)

Arriba tienes en tarjetas la **franja con más gente**, cuánta había en ese momento,
y el total de entradas y salidas fichadas.

> **Cómo de fiable es esto.** Depende de que se fichen las salidas. Quien entra y
> se va sin que nadie le fiche cuenta como que sigue dentro hasta el final, así que
> la línea azul se queda alta al terminar. La propia tarjeta te avisa de cuántas
> personas están en ese caso.
>
> **La hora del pico y la curva de llegadas sí son fiables** aunque no fiches
> ninguna salida: sólo dependen de las entradas.

---

## 9. Usuarios del club: dar acceso a la aplicación

Esto es lo único que **no se hace desde la aplicación**, sino desde la consola de
Firebase, que es donde viven los datos del club.

Ve a **[console.firebase.google.com](https://console.firebase.google.com)** y entra
con la cuenta de Google del club. Selecciona el proyecto del club.

### 9.1. Dar de alta a una persona (dos pasos)

**Paso 1 — crearle el usuario**

En el menú de la izquierda: **Authentication** → pestaña **Users** →
**Añadir usuario**.

- **Correo:** el suyo
- **Contraseña:** una provisional, mínimo 6 caracteres

Pulsa **Añadir usuario**. En la lista aparecerá su **UID de usuario**: una cadena
larga tipo `k3Jd8sLpQ2XyZ...`. **Cópiala**, la necesitas ahora.

**Paso 2 — darle su rol** ← *sin esto entra pero no puede hacer nada*

En el menú de la izquierda: **Firestore Database** → busca la colección
**`usuarios`** → **Añadir documento**.

- **ID del documento:** pega el **UID** que acabas de copiar
  (⚠️ **no** pulses "ID automático")
- Añade estos tres campos, todos de tipo **string**:

| Campo | Valor |
|-------|-------|
| `rol` | `admin`, `taquillero`, `control_acceso` o `lector` |
| `email` | su correo |
| `nombre` | su nombre y apellidos |

Pulsa **Guardar**. Ya puede entrar.

> **Los tres errores que se cometen siempre:**
> 1. Dejar "ID automático" en vez de pegar el UID → entrará como "sin rol".
> 2. Escribir `Admin` o `ADMIN` → **tiene que ir en minúsculas**: `admin`.
> 3. Copiar el UID con un espacio delante o detrás.

### 9.2. Cambiar el rol de una persona

**Firestore Database** → colección `usuarios` → su documento → pulsa sobre el valor
del campo `rol` y escribe el nuevo. El cambio se aplica **la próxima vez que entre**
(si está dentro, que salga y vuelva a entrar).

### 9.3. Quitarle el acceso a alguien

Lo más seguro es hacer las dos cosas:

1. **Authentication → Users** → menú ⋮ de su fila → **Inhabilitar cuenta**
   (o **Eliminar cuenta** si ya no vuelve).
2. **Firestore → `usuarios`** → borra su documento.

### 9.4. Alguien ha olvidado su contraseña

**Authentication → Users** → menú ⋮ de su fila → **Restablecer contraseña**
(le llega un correo) o **Editar usuario** para ponerle una nueva a mano.

---

## 10. Copias de seguridad

Pestaña **Backup** (solo admin).

Pulsa **Crear copia ahora** y en unos segundos tendrás una copia con todos los
socios, entradas, salidas y ventas del momento. En la lista de abajo ves la fecha, cuántos
socios y jornadas incluye y **quién la hizo**.

**⬇ Descargar JSON** guarda esa copia en tu ordenador.

Se guardan las **7 copias más recientes**: al crear la octava, la más antigua se
borra sola.

> **Recomendación:** crea una copia **después de cada partido** y otra al terminar
> las altas de la pretemporada. Es un botón y tarda segundos.

> ⚠️ **Dos avisos importantes:**
> - Las copias descargadas contienen **datos personales** (DNI, teléfono, email).
>   Guárdalas en un sitio seguro y bórralas cuando no las necesites.
> - **No hay botón de "restaurar"**. La copia sirve para que no se pierda la
>   información y para poder recuperarla, pero volcarla de vuelta tiene que hacerlo
>   quien lleva el mantenimiento técnico. Si necesitas restaurar, no toques nada y
>   avisa.

---

## 11. Protección de datos

La aplicación guarda datos personales de los socios (nombre, DNI, fecha de
nacimiento, teléfono, email), así que el club es responsable de ellos ante el RGPD.
En la práctica:

- **Da acceso solo a quien lo necesite.** Recuerda que **cualquier rol puede ver
  los datos completos de todos los socios**, incluido el DNI.
- **Un usuario por persona.** Nada de una cuenta compartida "del club": si pasa
  algo, hay que saber quién hizo qué. La aplicación ya registra quién dio de alta,
  quién modificó y quién dio de baja a cada socio.
- **Da de baja el acceso** de quien deje el club (apartado 9.3).
- **Cuida los archivos que descargues** (el CSV de socios, los JSON de copia, el ZIP
  de carnets): salen del control de la aplicación y llevan datos personales.
- Los socios tienen derecho a **acceder, rectificar y suprimir** sus datos: el
  perfil te deja consultarlos y editarlos, y "Dar de baja" los saca de la operativa.

---

## 12. Preguntas frecuentes

**¿Necesito instalar algo?**
No. Solo un navegador. En el móvil puedes añadirla a la pantalla de inicio.

**¿Varias personas a la vez?**
Sí. Todo se sincroniza al instante: dos porteros en dos puertas, taquilla y oficina
a la vez, sin problema.

**¿Y si no hay cobertura en la puerta del campo?**
La aplicación necesita conexión. Sin datos, el escáner no valida. Si el campo tiene
mala cobertura, prueba antes del partido y ten a mano una lista impresa de socios
como plan B.

**Me equivoqué al validar a alguien, ¿puedo deshacerlo?**
Sí: en **Entradas registradas**, botón **Borrar** en su fila. Vuelve a poder entrar.

**¿Puedo cambiar los precios de taquilla, la temporada o el número de jornadas?**
No desde la aplicación. Están fijados (10 € / 5 €, temporada 2026/27, 17 jornadas).
Cambiarlos es un ajuste rápido de configuración: pídeselo a quien lleva el
mantenimiento técnico.

**Un socio ha perdido el carnet.**
Ve a **QRs**, selecciónalo y descarga su PNG otra vez. Es el mismo carnet: el
anterior sigue siendo válido, así que si sospechas que alguien lo está usando,
consulta antes con el mantenimiento técnico.

**Un socio viene con el carnet del año pasado y le sale CARNET NO VÁLIDO.**
Normal si ya has renumerado la temporada (apartado 3.9): los carnets viejos dejan
de valer a propósito. Valídale a mano con su número nuevo y dale su carnet nuevo.

**¿Tengo que fichar las salidas?**
No. Es opcional y todo lo demás funciona igual sin ellas. Solo afecta a las
estadísticas de horas (apartado 8). Si el club no controla la salida, deja el
escáner siempre en modo **ENTRADA** y olvídate.

**Un socio extranjero no tiene DNI ni dos apellidos.**
Sin problema: en el alta elige **Pasaporte** u **Otro** como tipo de documento y
deja el segundo apellido vacío.

**Alguien intenta entrar con el carnet de otro.**
El escáner te avisa con ⚠️ **QR ya utilizado** en cuanto el titular real haya pasado
(o cuando pase después). Los carnets no llevan foto: la comprobación de identidad la
hace el portero.

**No me deja hacer algo y me habla de permisos.**
Tu rol no lo permite. Mira la tabla del apartado 2 y pide a un admin que te cambie
el rol si de verdad lo necesitas.

**La pantalla se ve rara o no carga.**
Recarga con **Ctrl + F5** (o desliza hacia abajo en el móvil). Si sigue igual,
prueba en otro navegador antes de dar la alarma.
