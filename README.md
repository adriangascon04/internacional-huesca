# Internacional Huesca · Gestión de Abonados

Aplicación web para gestionar los socios del **Internacional Huesca**: altas,
carnets con QR, control de acceso en la puerta, venta en taquilla, estadísticas
y copias de seguridad.

> **Esta guía es para usarla, no para programarla.** Está pensada para quien
> solo va a entrar por la **página web** y, como mucho, tocar **Firebase** para
> dar de alta usuarios. No necesitas saber nada de código.
>
> ¿Eres desarrollador/a? Salta a [Para desarrolladores](#para-desarrolladores).

---

## Índice

1. [Qué hace la aplicación](#1-qué-hace-la-aplicación)
2. [Entrar en la aplicación](#2-entrar-en-la-aplicación)
3. [Roles: quién puede hacer qué](#3-roles-quién-puede-hacer-qué)
4. [Dar de alta usuarios y asignar roles (en Firebase)](#4-dar-de-alta-usuarios-y-asignar-roles-en-firebase)
5. [Socios](#5-socios)
6. [Carnets con QR](#6-carnets-con-qr)
7. [Escáner · control de acceso en la puerta](#7-escáner--control-de-acceso-en-la-puerta)
8. [Taquilla](#8-taquilla)
9. [Estadísticas](#9-estadísticas)
10. [Importar socios desde Excel](#10-importar-socios-desde-excel)
11. [Copias de seguridad (backups)](#11-copias-de-seguridad-backups)
12. [Nueva temporada · renumerar carnets](#12-nueva-temporada--renumerar-carnets)
13. [Usar el móvil como lector en la puerta](#13-usar-el-móvil-como-lector-en-la-puerta)
14. [Problemas frecuentes](#14-problemas-frecuentes)

---

## 1. Qué hace la aplicación

La aplicación tiene **pestañas** en la parte de arriba. Según tu rol verás unas
u otras:

| Pestaña | Para qué sirve |
|---|---|
| **Socios** | Dar de alta, buscar, editar y eliminar socios. |
| **QRs** | Generar e imprimir el carnet con código QR de cada socio. |
| **Escáner** | Leer el QR en la puerta y registrar la entrada. |
| **Taquilla** | Vender entradas sueltas el día del partido, con su precio y método de pago. |
| **Competiciones** | Crear el calendario (competiciones y partidos) y fijar el precio de cada partido. |
| **Estadísticas** | Ver asistencia, recaudación de taquilla, recaudación por altas de socios y datos de los socios. |
| **Importar** | Cargar muchos socios de golpe desde un Excel. |
| **Backup** | Guardar copias de seguridad y reiniciar los datos para empezar de cero. |

---

## 2. Entrar en la aplicación

1. Abre la dirección web de la aplicación (te la habrá dado el club).
2. Escribe tu **correo electrónico** y tu **contraseña**.
3. Pulsa **Entrar**.

Si no tienes usuario todavía, alguien con rol **admin** tiene que crearte uno
(ver [punto 4](#4-dar-de-alta-usuarios-y-asignar-roles-en-firebase)).

> 💡 **Consejo:** puedes "instalar" la web en el móvil como si fuera una app.
> En el navegador del teléfono, menú **⋮ → «Añadir a pantalla de inicio»**.
> Así se abre a pantalla completa y va más cómoda en la puerta.

---

## 3. Roles: quién puede hacer qué

Cada usuario tiene **un rol**. El rol decide qué puede hacer. La columna
*Gestionar socios* incluye añadir, editar y eliminar:

| Rol | Ver socios y QRs | Gestionar socios | Escáner | Taquilla | Estadísticas | Importar / Backups |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **taquillero** | ✅ | — | — | ✅ | ✅ | — |
| **control_acceso** | ✅ | — | ✅ | — | ✅ | — |
| **lector** | ✅ | — | — | — | ✅ | — |

- **admin** — control total. Es quien gestiona socios, crea usuarios, importa y
  hace copias de seguridad. Normalmente son una o dos personas de confianza.
- **taquillero** — la persona de la taquilla el día del partido.
- **control_acceso** — el portero/a que escanea los QR en la entrada. Solo
  puede fichar en la **jornada de hoy** que haya fijado el admin (así no se
  ficha por error en el partido equivocado).
- **lector** — solo consulta, no modifica nada.

> Todos los roles pueden **ver** la lista de socios, sus carnets QR y las
> estadísticas. Lo que cambia es qué pueden **modificar**: dar de alta o editar
> socios, importar y hacer backups es exclusivo del **admin**.

---

## 4. Dar de alta usuarios y asignar roles (en Firebase)

Crear un usuario nuevo (por ejemplo, un portero) tiene **dos pasos** y **ambos
se hacen en Firebase**, no en la aplicación. Necesitas ser administrador del
proyecto de Firebase.

### Paso 1 · Crear el acceso (correo y contraseña)

1. Entra en <https://console.firebase.google.com> y elige el proyecto del club.
2. Menú de la izquierda → **Compilación (Build) → Authentication**.
3. Pestaña **Users (Usuarios)** → botón **Add user (Agregar usuario)**.
4. Escribe el **correo** y una **contraseña** para esa persona → **Add user**.
5. Verás una fila nueva con una columna **User UID**: es un texto largo tipo
   `a1B2c3D4...`. **Cópialo**, lo necesitas en el paso 2.

### Paso 2 · Asignar el rol

1. Menú de la izquierda → **Compilación (Build) → Firestore Database**.
2. Busca la colección llamada **`usuarios`** (si no existe, pulsa
   **Start collection / Iniciar colección** y escribe `usuarios`).
3. Pulsa **Add document (Agregar documento)**.
4. En **Document ID (ID del documento)** pega el **User UID** que copiaste antes.
   ⚠️ Tiene que ser exactamente ese UID, no el correo.
5. Añade un campo:
   - **Field (Campo):** `rol`
   - **Type (Tipo):** `string`
   - **Value (Valor):** uno de estos, escrito **igual** (todo en minúscula):
     `admin`, `taquillero`, `control_acceso` o `lector`.
6. Pulsa **Save (Guardar)**.

Listo. La próxima vez que esa persona entre con su correo y contraseña, la
aplicación le dará los permisos de ese rol.

### Cambiar el rol de alguien

Entra en **Firestore Database → `usuarios`**, abre el documento de esa persona
(su UID) y cambia el valor del campo `rol`. El cambio tiene efecto la próxima
vez que inicie sesión.

### Quitarle el acceso a alguien

En **Authentication → Users**, busca su fila y usa el menú **⋮ → Disable
account (Deshabilitar)** o **Delete account (Eliminar)**.

---

## 5. Socios

Pestaña **Socios** (solo **admin**).

### Añadir un socio

1. Rellena el formulario **Alta de socio**:
   - **Nombre** y **Primer apellido** son obligatorios. **Segundo apellido** es
     opcional.
   - **Tipo de documento**: DNI/NIE, Pasaporte u Otro. Para DNI/NIE se comprueba
     que la letra sea correcta.
   - **Nº de documento** y **fecha de nacimiento**, obligatorios.
   - **Teléfono** y **email**, opcionales: hay socios que no tienen, y
     inventárselos es peor que dejarlos vacíos.
   - **Tipo de abono** (Familiar, General, Internacional, Academia, Jubilado,
     -16 años y **Socio Colaborador**).
   - **Método de pago** e **importe cobrado**. El importe en blanco significa
     "la tarifa de su abono"; un 0 escrito a mano sí es gratis. Queda anotado en
     la ficha, así que cambiar tarifas después no reescribe lo ya facturado —
     pero se puede corregir a mano desde la ficha del socio.
2. Pulsa **Añadir socio**.

El programa asigna automáticamente el **número de carnet**. Si el abono es
gratuito (Academia), queda marcado como pagado; el resto nace **pendiente de
cobro** hasta que se marque la casilla *Pagado*.

> **Socio Colaborador**: abono de aportación libre, sin tarifa. El importe es
> **obligatorio** al darlo de alta, porque su precio de referencia es 0 € y
> dejarlo en blanco registraría el donativo como gratuito. Lo que se teclee es lo
> que suma en la recaudación de socios.

> **Abono Internacional**: su dinero cuenta entero en la recaudación, pero sus
> socios **no entran en la base del % de asistencia** — es un abono de apoyo al
> club desde fuera y prácticamente nunca vienen al campo.

### Buscar, ver y editar

- Usa el **buscador** para filtrar por nombre, apellidos o documento. Busca sobre
  **todos** los socios, no solo sobre la página visible.
- La lista se pagina de **25 en 25**, con *Anterior* / *Siguiente* bajo la tabla.
- Pulsa **👤 Perfil** para abrir la **ficha del socio**: ahí ves sus datos, lo que
  pagó por su abono y su historial de asistencia partido a partido, y puedes:
  - **✏️ Editar** sus datos, su tipo de abono, su método de pago y **el importe
    del abono**.
  - Marcar/desmarcar si ha **pagado**.
  - Escribir **observaciones**.

### Marcar como pagado

En la tabla de socios o en la ficha, marca la casilla **Pagado** cuando el socio
haya abonado su cuota. Esto alimenta las estadísticas de facturación.

### Eliminar un socio

**Eliminar** borra la ficha de verdad: no hay baja lógica ni papelera. Está
pensado sobre todo para corregir un alta equivocada.

Su número de carnet queda libre y lo hereda el siguiente socio, pero el carnet
antiguo **no** abre la puerta del nuevo: el QR lleva además un código de
seguridad propio de cada socio. El identificador interno tampoco se reutiliza
nunca — lo reparte un contador que solo sabe subir.

### Exportar a CSV

Botón **⬇ CSV** para descargar la lista **completa** de socios (con importe,
método de pago y estado de cobro) y abrirla en Excel.

---

## 6. Carnets con QR

Pestaña **QRs** (solo **admin**).

1. Elige un **socio** en el desplegable: se genera su QR.
2. **⬇ Descargar PNG** para guardar la imagen de ese carnet.
3. **📦 Descargar todos (ZIP)** para bajar de golpe los QR de todos los socios
   (útil al empezar temporada, para imprimirlos todos).

> El QR lleva un código de seguridad y la temporada, así que **no se puede
> falsificar** ni reutilizar un carnet de una temporada anterior.

---

## 7. Escáner · control de acceso en la puerta

Pestaña **Escáner** (**admin** y **control_acceso**).

### Antes del partido (lo hace el admin)

En el bloque **Jornada actual del club**, el admin elige cuál es **la jornada de
hoy** y pulsa **Fijar como jornada actual**. A partir de ahí, los porteros solo
pueden fichar en esa jornada. **Solo se puede fichar en la jornada vigente**: no
en una pasada ni en una futura.

> Si eres admin y te cambias a otra jornada que no es la de hoy, la aplicación
> te avisa con un mensaje ⚠️ para que no fiches por error en el partido
> equivocado.

### Escanear un carnet

1. Pulsa **📷 Escanear QR** (la primera vez el móvil pedirá permiso para usar
   la cámara: acepta).
2. Apunta al QR del carnet del socio.
3. Cuando lo lee, aparece un **pop-up grande** y el móvil **vibra y suena**:

   - 🟢 **Verde = ACCESO VÁLIDO.** Muestra el nombre del socio, su tipo de
     abono, su número de carnet, su documento y la hora. La persona puede pasar.
   - 🔴 **Rojo = NO PUEDE ENTRAR.** El sonido es de error. El mensaje explica el
     motivo, por ejemplo **«YA HA ENTRADO»** (ese carnet ya fichó su entrada en
     esta jornada) o que el carnet no es válido.

4. Pulsa **Cerrar** (o toca fuera del recuadro) para leer el siguiente.

> **No hay «salida».** Solo se registra la entrada. Un socio que ya ha entrado
> no puede volver a entrar en la misma jornada.
>
> 💡 **La cámara se para sola mientras el pop-up está abierto.** Así sabes que
> ya lo ha leído y no te quedas apuntando sin saber si funcionó. Al cerrar el
> pop-up, vuelve a leer.

### Si el QR no se lee (validación manual)

Si el carnet está roto, borroso o la cámara no enfoca:

1. En **Validación manual**, escribe el **número de carnet** o el **DNI/NIE** de
   la persona.
2. Pulsa **Validar**.

Comprueba antes que la persona es quien dice ser.

### Entradas registradas y bloquear la jornada

- Abajo ves la lista de **quién ha entrado** y a qué hora. Puedes **Borrar** una
  entrada si te has equivocado (su QR vuelve a estar disponible).
- Con el botón de **bloqueo** puedes **cerrar la jornada**: una vez cerrada, no
  se registran más entradas.

---

## 8. Taquilla

Pestaña **Taquilla** (**admin** y **taquillero**).

1. Elige el **partido**.
2. Elige el **tipo de entrada**: la lista sale de las tarifas de ese partido.
3. El **precio** se rellena con la tarifa y **puedes cambiarlo** para esa venta
   (invitación, descuento, suplemento). Las estadísticas registran lo cobrado.
4. Elige el **método de pago** y pulsa **Cobrar entrada**.
5. Puedes **cerrar el partido** con el botón de bloqueo cuando termine la venta.

Abajo tienes el **resumen** de lo vendido y lo recaudado, y la tabla **Ventas de
este partido** con un botón **Anular** en cada fila. Al anular, esa venta deja de
contar al momento en la recaudación y en el número de entradas. Para el error que
acabas de cometer sigue estando **↩ Deshacer última venta**.

> En taquilla **no** se vende "entrada de socio": un abonado entra con su QR y ya
> queda contado como asistente ahí. Cobrarle además una entrada de 0 € lo contaría
> dos veces.

---

## 9. Estadísticas

Pestaña **Estadísticas** (todos los roles), dividida en **cuatro subpestañas**:

**Resumen** — ¿cómo va la temporada y de dónde sale el dinero?
- Socios, partidos con datos, asistentes totales, **ingreso total** y pendientes
  de pago.
- **De dónde sale el dinero**: cuotas frente a taquilla, con su porcentaje.
- Resumen por **competición** y **detalle por jornada**.

**Socios** — ¿quiénes son y cuánto han pagado?
- **Cuotas**: cobrado, pendiente y **cuota media** (el dato que importa en el
  Socio Colaborador, que no tiene tarifa).
- Desglose **por tipo de abono**, con cuál cuenta para la asistencia.
- **Cómo pagan** su cuota.
- **Perfil**: edad media y distribución por edades, fundadores, morosidad,
  cobertura de email y teléfono, tipos de documento.
- **Evolución de las altas**, mes a mes.

**Taquilla** — ¿qué se vende en la puerta?
- Recaudación, entradas vendidas, **ticket medio**, media por partido jugado y
  mejor y peor taquilla.
- Gráfico de **recaudación por partido y tipo** (la altura es dinero).
- Recaudación **por tipo de entrada** con su precio medio.
- **Cómo se cobra en la puerta**, para cuadrar la caja al acabar el partido.

**Asistencia** — ¿quién viene al campo?
- **Ocupación media**, **asistencia perfecta**, **absentistas**, fichajes totales
  y **hora punta**.
- Gráfico de **asistentes por partido y tipo** (la altura son personas: aquí sí
  salen los abonados, que aportan 0 € en la puerta).
- Gráficos de **fidelidad** y **franjas horarias**.
- Asistencia media por tipo de abono y **ranking** de socios.

---

## 10. Importar socios desde Excel

Pestaña **Importar** (solo **admin**).

1. Prepara un Excel (`.xlsx`) con estas columnas en la primera fila:
   **Nombre, Apellido 1, Apellido 2, Tipo documento, DNI, Fecha nac., Teléfono,
   Email, Tipo**.
   - *Apellido 2* puede ir vacío.
   - *Tipo documento* es opcional (si falta, se asume DNI/NIE).
2. Pulsa en el selector de archivo y elige tu Excel.
3. La aplicación revisa las filas y te muestra un **informe**: las que tienen
   errores se marcan y **no** se importan.
4. Pulsa **Importar filas válidas**.

---

## 11. Copias de seguridad (backups)

Pestaña **Backup** (solo **admin**).

- **Crear copia ahora** guarda una foto completa de todos los datos.
- Se conservan las **7 copias** más recientes (las viejas se borran solas).

Hazlo de vez en cuando, sobre todo antes de cambios grandes como renumerar la
temporada.

---

## 12. Nueva temporada · renumerar carnets

En la pestaña **Socios** (solo **admin**), al final, está la opción **Renumerar
carnets** para empezar una temporada nueva.

- Compacta los números de carnet (tapa los huecos que quedan) y **genera
  carnets nuevos**.
- ⚠️ **Todos los carnets antiguos dejan de funcionar de golpe.** Hazlo solo al
  empezar la temporada y después **reimprime** los carnets con **QRs → 📦
  Descargar todos**.
- El historial de asistencia de cada socio **se conserva**.

Haz una **copia de seguridad** antes.

---

## 13. Usar el móvil como lector en la puerta

- Funciona con la **cámara** de cualquier móvil moderno, sin aparatos extra.
- Requiere que la web se abra por **`https://`** (así lo está el enlace del
  club); si no, el navegador no deja usar la cámara.
- La **primera vez** el navegador pide permiso para la cámara: pulsa **Permitir**.
- Deja el brillo alto y sujeta el móvil a unos 15–20 cm del carnet.
- El **pop-up + vibración + sonido** te confirman cada lectura sin tener que
  mirar fijamente la pantalla.

---

## 14. Problemas frecuentes

| Problema | Solución |
|---|---|
| **No me deja entrar** | Revisa correo y contraseña. Si sigue fallando, que un admin compruebe que tu usuario existe en Firebase y tiene un `rol`. |
| **Entro pero no veo ninguna pestaña / faltan pestañas** | Te falta el rol o es incorrecto. El admin debe revisar tu documento en Firestore → `usuarios` (campo `rol` bien escrito, en minúscula). |
| **La cámara no se abre** | Comprueba que abriste el enlace con `https://` y que diste permiso a la cámara. Cierra y vuelve a abrir la pestaña del navegador. |
| **El QR no lee** | Sube el brillo, limpia la cámara, acerca/aleja un poco. Si el carnet está dañado, usa la **validación manual**. |
| **Sale «YA HA ENTRADO»** | Ese socio ya fichó su entrada en esta jornada; es correcto que no pueda volver a entrar. |
| **No puedo fichar / «Jornada cerrada»** | La jornada está bloqueada o no es la jornada actual. El admin debe fijar la jornada de hoy o desbloquearla. |
| **No suena ni vibra** | Algunos iPhone no vibran desde el navegador. El pop-up de color siempre aparece. Sube el volumen del móvil. |

---

## Para desarrolladores

La aplicación es una **PWA** con **módulos ES nativos**, sin paso de build,
desplegable en GitHub Pages.

### Arranque rápido

```bash
# 1. Configurar Firebase: pega tus credenciales en src/config/firebase.js
#    (Firebase Console → Configuración del proyecto → Tus apps → Config)

# 2. Levantar en local (los módulos ES exigen un servidor: file:// NO vale)
npm run dev            # → http://localhost:8080

# 3. Tests y estilo de código
npm test
npm run lint
```

> ⚠️ **No se puede abrir con doble clic.** Los módulos ES nativos requieren
> protocolo `http://`.

### Estructura

```
.                           Raíz del repo = lo que publica GitHub Pages
├── index.html              Shell de la app (HTML + CSS)
├── manifest.json           Manifiesto PWA
└── src/
    ├── main.js             Punto de entrada: orquesta todo
    ├── config/
    │   ├── firebase.js     Inicialización de Firebase (auth + db)
    │   └── app.config.js   ⭐ TODA la configuración: precios, temporada, abonos
    ├── core/               auth, session, state
    ├── repositories/       ⭐ ÚNICA capa que habla con Firestore
    ├── services/           Lógica de negocio (socios, acceso, stats, roles…)
    ├── utils/              sanitize (anti-XSS), validators, format, dom
    └── ui/                 login, layout, camara, sonidos y pages/ (una por pestaña)
```

### Regla de oro

```
UI  →  services  →  repositories  →  Firestore
```

Ninguna página importa Firestore directamente.

### ¿Dónde toco para…?

| Quiero… | Archivo |
|---|---|
| Cambiar el precio de las entradas | **Desde la app** (Competiciones → precios de cada partido). En código solo viven los valores de partida: `config/app.config.js` → `TIPOS_ENTRADA_POR_DEFECTO` |
| Añadir o quitar partidos y competiciones | **Desde la app** (pestaña Competiciones). Ya no hay calendario fijo en el código |
| Cambiar la temporada | `config/app.config.js` → `TEMPORADA_ACTUAL` |
| Cambiar los métodos de pago | `config/app.config.js` → `METODOS_PAGO` |
| Añadir/quitar un tipo de abono | `config/app.config.js` → `TIPOS_ABONO` |
| Cambiar la fecha de Socio Fundador | `config/app.config.js` → `FECHA_LIMITE_FUNDADOR` |
| Tocar la tabla de socios | `ui/pages/socios.page.js` |
| Cambiar la lógica del escáner | `services/acceso.service.js` |
| Cambiar quién puede hacer qué | `firestore.rules` (+ `services/roles.service.js` para la UI) |
| Cambiar estilos | `<style>` de `index.html` |

### Más documentación

- **[MANUAL_USUARIO.md](MANUAL_USUARIO.md)** — Manual de uso detallado.
- **[PUESTA_EN_MARCHA_RAPIDA.md](PUESTA_EN_MARCHA_RAPIDA.md)** — GitHub Pages en 30 min.
- **[PUESTA_EN_MARCHA.md](PUESTA_EN_MARCHA.md)** — Local primero, más detallado.
- **[DESARROLLO.md](DESARROLLO.md)** — Entorno local, ramas Git, convenciones.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Despliegue a GitHub Pages y reglas de Firestore.
- **[CHANGELOG.md](CHANGELOG.md)** — Historial de cambios.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Cómo contribuir.
