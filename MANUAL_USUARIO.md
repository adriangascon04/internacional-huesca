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
3. [Socios](#3-socios)
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

| Rol | Socios | Carnets QR | Escáner | Taquilla | Estadísticas | Cerrar jornada | Importar | Copias |
|-----|--------|-----------|---------|----------|--------------|----------------|----------|--------|
| **admin** | Todo: alta, editar, baja, pagos | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| **taquillero** | Solo consultar | Sí | No | Vender | Sí | No | No | No |
| **control_acceso** | Solo consultar | Sí | Sí | No | Sí | No | No | No |
| **lector** | Solo consultar | Sí | No | No | Sí | No | No | No |

> ⚠️ **Importante para protección de datos:** cualquier persona que entre en la
> aplicación, sea del rol que sea, puede **consultar la ficha completa de los
> socios**, incluidos DNI, teléfono y email. No se puede ocultar solo ese dato a
> unos roles y a otros no. Tenlo en cuenta al decidir a quién das acceso.

---

## 3. Socios

Pestaña **Socios**. Es el corazón de la aplicación.

### 3.1. Dar de alta a un socio

Rellena el formulario **Alta de socio** y pulsa **Añadir socio**.

**Todos los campos son obligatorios:** nombre, primer apellido, segundo apellido,
DNI/NIE, fecha de nacimiento, teléfono, email y tipo de abono.

La aplicación comprueba los datos antes de guardar y, si algo está mal, te lo dice
en rojo debajo del botón sin guardar nada:

- El **DNI o NIE** debe ser real: se comprueba la letra. Un `12345678A` inventado
  se rechaza.
- El **email** debe tener forma de email.
- El **teléfono** debe tener 9 dígitos (admite el `+34` delante).
- La **fecha de nacimiento** no puede ser futura ni imposible.
- **No puede haber dos socios activos con el mismo DNI.**

**El número de socio se asigna solo.** No lo eliges tú y **nunca se repite**,
aunque des de baja al último socio. Esto es intencionado: si un número se
reutilizara, un carnet antiguo abriría la puerta identificando a otra persona.

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

- **Partidos asistidos** y su **porcentaje de asistencia**
- **Estado de pago**
- Todos sus datos: nombre completo, DNI, fecha de nacimiento, teléfono, email,
  tipo de abono y desde cuándo es socio
- La **⭐ de Socio Fundador**, que aparece sola en quienes se dieron de alta antes
  del 30 de mayo de 2027

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
- **Su número no se reutiliza jamás**
- Su ficha no se borra: sigue guardada por si hay que consultarla

> **No hay botón para reactivar a un socio dado de baja.** Si te equivocas,
> avisa a quien administre la aplicación. Si lo das de alta otra vez desde el
> formulario, recibirá un **número nuevo** y habrá que reimprimirle el carnet.

### 3.8. Exportar la lista a Excel

Pulsa **⬇ CSV**. Se descarga un archivo con todos los socios activos y sus datos,
que se abre directamente en Excel.

---

## 4. Importar socios desde Excel

Pestaña **Importar** (solo admin). Sirve para cargar muchos socios de golpe.

### Cómo preparar el archivo

Un `.xlsx` normal, con los nombres de las columnas en la **primera fila**:

| Nombre | Apellido 1 | Apellido 2 | DNI | Fecha nac. | Teléfono | Email | Tipo |
|--------|-----------|-----------|-----|-----------|----------|-------|------|
| Ana | García | López | 12345678Z | 14/03/1990 | 600112233 | ana@correo.es | Abono General |

- El **Tipo** debe escribirse **exactamente** como aparece en la aplicación
  (`Abono General`, `Abono Familiar`, `Abono −16 años`…).
- La **fecha** puede ser una fecha de Excel o estar escrita como `14/03/1990`.

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

### 6.2. Validar con la cámara

Pulsa **📷 Activar cámara** y acepta el permiso que pide el navegador. Apunta al QR
del socio: se lee solo, no hay que pulsar nada. Al terminar, **⏹ Parar cámara**.

La cámara solo funciona si la aplicación se abre con una dirección segura
(`https://`), que es el caso de la dirección normal del club.

### 6.3. Validar a mano cuando el QR no se lee

Debajo tienes **Validación manual · ¿el QR no se lee?**.

Si el carnet está roto, borroso, la pantalla del móvil del socio no da luz o la
cámara no enfoca, **escribe el número de socio y pulsa Validar**. Funciona igual
que el escaneo y queda registrado igual.

> Esta vía **no comprueba el código de seguridad del carnet**, porque no hay QR que
> comprobar: la persona de la puerta está viendo al socio. Es a propósito, para que
> nunca te quedes bloqueado en la puerta. Úsala cuando reconozcas al socio o cuando
> haya podido identificarse de otra forma.

### 6.4. Qué te dice la pantalla

| Mensaje | Qué significa | Qué hacer |
|---------|---------------|-----------|
| ✅ **ACCESO VÁLIDO** (verde, con pitido) | Todo correcto. Sale su nombre, tipo de abono y hora. | Que pase. |
| ⚠️ **QR ya utilizado** | Ese socio **ya entró** en esta jornada, y te dice a qué hora. | No puede volver a entrar. Alguien está usando un carnet duplicado, o ya pasó él mismo. |
| ❌ **QR no reconocido** | Ese número de socio no existe o está dado de baja. | No es socio en activo. Que pase por taquilla. |
| 🚫 **CARNET NO VÁLIDO** | El QR no es auténtico o es un carnet viejo ya sustituido. | Si reconoces a la persona como socia, valídala a mano con su número (apartado 6.3). |
| 🔒 **Jornada cerrada** | La jornada está bloqueada. | Un admin tiene que desbloquearla. |

Cada socio **solo puede entrar una vez por jornada**.

### 6.5. Entradas registradas

Debajo tienes la lista de todo el que ha entrado en esa jornada, con su número,
nombre y hora, de la más reciente a la más antigua. Se actualiza sola y la ven a la
vez todas las personas conectadas: **puede haber varios porteros en varias puertas
al mismo tiempo** sin pisarse.

Si te equivocas, **Borrar** elimina ese registro y ese socio vuelve a poder entrar.

### 6.6. Cerrar la jornada

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
- **Detalle por jornada:** socios que entraron, % de asistencia, entradas de
  taquilla, total de asistentes y recaudación de cada jornada
- **Recaudación total** de la temporada, arriba de la tabla
- **Socios por tipo de abono**

El **% de asistencia** se colorea solo: 🟢 verde por encima del 70 %, 🟡 ámbar entre
el 30 % y el 70 %, 🔴 rojo por debajo. Se calcula solo sobre los abonos que asisten
al campo (el Abono Internacional queda fuera).

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
socios, entradas y ventas del momento. En la lista de abajo ves la fecha, cuántos
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
