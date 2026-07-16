# Puesta en marcha — paso a paso

Guía completa desde el ZIP hasta la app funcionando en producción.
Tiempo estimado: **40–60 minutos** la primera vez.

> ### ⚠️ Lee esto antes de nada
>
> **El orden importa.** Hay un paso (el 4) que, si te lo saltas o lo haces
> después del 6, **te deja fuera de tu propia aplicación**. Sigue los pasos
> en orden aunque te parezcan pesados.

---

## Índice

1. [Preparar el proyecto](#1-preparar-el-proyecto)
2. [Configurar Firebase](#2-configurar-firebase)
3. [Crear tu usuario](#3-crear-tu-usuario)
4. [🔴 Sembrar tu rol de admin](#4--sembrar-tu-rol-de-admin-crítico)
5. [Crear el contador de socios](#5-crear-el-contador-de-socios)
6. [Probar en local](#6-probar-en-local)
7. [Publicar las reglas de seguridad](#7-publicar-las-reglas-de-seguridad)
8. [Verificar que todo funciona](#8-verificar-que-todo-funciona)
9. [Publicar en GitHub Pages](#9-publicar-en-github-pages)
10. [Dar de alta al resto del equipo](#10-dar-de-alta-al-resto-del-equipo)
11. [Qué NO funciona todavía](#11-qué-no-funciona-todavía)
12. [Si algo falla](#12-si-algo-falla)

---

## 1. Preparar el proyecto

### 1.1. Descomprimir

Descomprime `internacional-huesca.zip` donde guardes tus proyectos.
Por ejemplo `C:\Proyectos\` o `~/Proyectos/`.

Te quedará una carpeta `internacional-huesca/`.

### 1.2. Abrir en VS Code

Abre VS Code → **Archivo → Abrir carpeta** → selecciona `internacional-huesca`.

> ❗ Abre **la carpeta**, no un fichero suelto. Si abres solo `index.html`,
> VS Code no te resolverá las rutas de los imports y verás errores falsos.

### 1.3. Comprobar que tienes lo necesario

Abre el terminal de VS Code (**Ver → Terminal**) y escribe:

```bash
python3 --version
```

Si te dice una versión (3.x), perfecto. Si dice "no se reconoce", en Windows
prueba con `python --version`. Si tampoco, instala Python desde python.org
o usa la extensión **Live Server** de VS Code (ver paso 6).

---

## 2. Configurar Firebase

### 2.1. Conseguir tus credenciales

1. Entra en [console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona tu proyecto (`internacional-huesca-nacho`)
3. Pulsa el engranaje ⚙️ arriba a la izquierda → **Configuración del proyecto**
4. Baja hasta **Tus apps**
5. Si no hay ninguna app web, pulsa el icono `</>` y crea una (ponle
   cualquier nombre, no marques Hosting)
6. Verás un bloque `const firebaseConfig = { ... }`. **Ese es el que necesitas.**

### 2.2. Pegarlas en el proyecto

Abre `public/src/config/firebase.js` y sustituye el objeto de configuración
por el tuyo:

```js
const firebaseConfig = {
  apiKey: 'AIza...',                                    // ← el tuyo
  authDomain: 'internacional-huesca-nacho.firebaseapp.com',
  projectId: 'internacional-huesca-nacho',
  storageBucket: 'internacional-huesca-nacho.firebasestorage.app',
  messagingSenderId: '123456789',                       // ← el tuyo
  appId: '1:123:web:abc',                               // ← el tuyo
};
```

> **¿Es peligroso que la `apiKey` esté en el código?** No. La `apiKey` de una app
> web viaja al navegador de todos modos: cualquiera puede verla con F12. No es
> una contraseña, es un identificador de proyecto. La seguridad real la imponen
> las **reglas de Firestore** (paso 7). Aun así, mantén el repositorio **privado**.

### 2.3. Activar el login por email

En Firebase Console → **Authentication** → pestaña **Sign-in method**
→ **Correo electrónico/contraseña** → activar → **Guardar**.

---

## 3. Crear tu usuario

En Firebase Console → **Authentication** → pestaña **Users** → **Añadir usuario**:

- **Correo:** el tuyo
- **Contraseña:** la que quieras (mínimo 6 caracteres)

Pulsa **Añadir usuario**.

### 3.1. Copiar tu UID

En la lista de usuarios verás una columna **UID de usuario**: una cadena larga
tipo `k3Jd8sLpQ2XyZ...`.

**Cópiala. La necesitas en el paso siguiente.**

---

## 4. 🔴 Sembrar tu rol de admin (CRÍTICO)

> **Este es el paso que no te puedes saltar.**
>
> Las reglas de seguridad deciden qué puedes hacer leyendo tu rol de la
> colección `usuarios`. Si publicas las reglas (paso 7) sin haber creado
> antes tu documento de rol, las reglas buscarán tu rol, no lo encontrarán,
> y te denegarán **todo**. Incluida la capacidad de crearte el rol.
>
> Te quedas fuera y hay que revertir las reglas a mano.

En Firebase Console → **Firestore Database**:

1. Si no has creado la base de datos aún: **Crear base de datos** →
   **Modo de producción** → ubicación `eur3 (europe-west)` → Habilitar
2. Pulsa **Iniciar colección**
3. **ID de la colección:** `usuarios` → Siguiente
4. **ID del documento:** pega aquí **tu UID** del paso 3.1
   (⚠️ NO pulses "ID automático")
5. Añade estos tres campos:

| Campo    | Tipo   | Valor            |
|----------|--------|------------------|
| `rol`    | string | `admin`          |
| `email`  | string | tu@email.com     |
| `nombre` | string | Tu Nombre        |

6. **Guardar**

Debe quedarte así:

```
usuarios/
└── k3Jd8sLpQ2XyZ...        ← tu UID exacto
    ├── rol:    "admin"
    ├── email:  "tu@email.com"
    └── nombre: "Tu Nombre"
```

> **Errores típicos aquí:**
> - Poner "ID automático" en vez de tu UID → las reglas no te encontrarán.
> - Escribir `Admin` o `ADMIN` → **distingue mayúsculas**. Tiene que ser `admin`.
> - Copiar el UID con un espacio delante o detrás.

---

## 5. Crear el contador de socios

La app usa un contador para no reutilizar nunca los números de socio (era el
bug de los "QR zombie": al borrar al socio con el número más alto, el siguiente
alta reutilizaba ese número y su carnet antiguo abría la puerta identificando
a **otra persona**).

En Firestore → **Iniciar colección**:

- **ID de la colección:** `contadores`
- **ID del documento:** `socios` (escríbelo tal cual, no automático)
- **Campo:** `ultimo` · tipo **number** · valor:
  - **`0`** si empiezas de cero
  - **el número de socio más alto que ya tengas** si ya tienes socios
    (ejemplo: si tu último socio es el 87, pon `87`)

```
contadores/
└── socios
    └── ultimo: 0        ← number, NO string
```

> ⚠️ `ultimo` debe ser de tipo **number**, no string. Si lo pones como texto,
> el alta de socios fallará.

---

## 6. Probar en local

**Todavía NO publiques las reglas.** Primero comprueba que la app arranca.

En el terminal de VS Code:

```bash
cd public
python3 -m http.server 8080
```

Abre el navegador en **http://localhost:8080**

> ### ❗ No abras el `index.html` con doble clic
>
> Verás una pantalla en blanco y errores de CORS en la consola. Los módulos ES
> nativos **exigen** protocolo `http://`. Es el precio que aceptamos por no
> tener un paso de build. Siempre a través del servidor.
>
> **Alternativa:** extensión **Live Server** de VS Code → clic derecho sobre
> `public/index.html` → *Open with Live Server*.

### Qué deberías ver

1. La pantalla de login azul
2. Entras con tu email y contraseña del paso 3
3. Arriba a la derecha: `tu@email.com · admin`

**Si pone `· sin rol`**, el paso 4 está mal: revisa que el ID del documento
sea exactamente tu UID y que `rol` sea `admin` en minúsculas.

### Prueba a dar de alta un socio

Rellena el formulario y pulsa **Añadir socio**. Si aparece en la tabla,
la conexión con Firestore funciona.

Usa un DNI válido de verdad — la app valida la letra de control. Puedes usar
`12345678Z` para probar.

---

## 7. Publicar las reglas de seguridad

Ahora mismo tu base de datos está en modo producción (todo denegado) o en modo
prueba (todo permitido durante 30 días). Ninguna de las dos sirve.

### 7.1. Copiar las reglas

Abre `firestore.rules` del proyecto y copia **todo** el contenido.

En Firebase Console → **Firestore Database** → pestaña **Reglas** → borra lo
que haya y pega las nuevas.

### 7.2. 🔵 PROBARLAS ANTES DE PUBLICAR

**No pulses Publicar todavía.** Usa el **Simulador** (botón arriba a la derecha
del editor de reglas, "Simulador de reglas" / *Rules Playground*).

Prueba estos casos. Necesitarás el UID de un usuario de cada rol; de momento
solo tienes el tuyo (admin), así que prueba al menos los de admin:

| # | Tipo | Ubicación | Autenticado como | Esperado |
|---|------|-----------|------------------|----------|
| 1 | get | `/socios/1` | tu UID (admin) | ✅ Permitido |
| 2 | create | `/socios/99` | tu UID (admin) | ✅ Permitido* |
| 3 | delete | `/socios/1` | tu UID (admin) | ❌ **Denegado** |
| 4 | get | `/backups/x` | tu UID (admin) | ✅ Permitido |
| 5 | get | `/usuarios/OTRO_UID` | tu UID (admin) | ✅ Permitido |

\* Para el caso 2 el simulador te pedirá los datos del documento. Marca
"Crear documento" y añade `activo: true` (boolean) y `numerico: 99` (number),
o dará denegado — es correcto, las reglas exigen esos campos.

**El caso 3 debe salir DENEGADO.** Es intencionado: los socios se dan de baja
lógicamente (`activo: false`), nunca se borran, para que sus números no se
reutilicen jamás.

Si el caso 1 te sale **denegado**, tu documento de rol del paso 4 está mal.
**Arréglalo antes de publicar.**

### 7.3. Publicar

Cuando los casos salgan como en la tabla → **Publicar**.

### 7.4. Cómo revertir si algo va mal

Firestore → **Reglas** → pestaña **Historial** → selecciona la versión anterior
→ **Restaurar**.

**Ten localizado este botón antes de publicar.** Es tu paracaídas.

---

## 8. Verificar que todo funciona

Recarga la app en local y comprueba, marcando cada casilla:

- [ ] Entras y ves `tu@email.com · admin`
- [ ] Ves la lista de socios
- [ ] Puedes dar de alta un socio nuevo
- [ ] El número que le asigna es el siguiente al del contador (paso 5)
- [ ] Puedes marcar/desmarcar "pagado"
- [ ] Abres el perfil de un socio (botón 👤)
- [ ] Guardas una observación y se queda guardada al recargar
- [ ] En **QRs**: seleccionas un socio y aparece el código
- [ ] En **Escáner**: seleccionas jornada, escribes el nº de socio, pulsas
      Validar → sale ✅ ACCESO VÁLIDO
- [ ] Vuelves a validar el mismo → sale ⚠️ QR ya utilizado
- [ ] En **Taquilla**: seleccionas jornada, pulsas +1 General → el contador sube
- [ ] Pulsas "Deshacer última venta" → baja
- [ ] Cierras la jornada (🔒) → el escáner rechaza nuevas entradas
- [ ] En **Estadísticas**: se pinta el gráfico
- [ ] En **Backup**: creas una copia y aparece en la lista

Si todo esto pasa, la app está operativa.

---

## 9. Publicar en GitHub Pages

### 9.1. Subir el código

```bash
cd internacional-huesca
git init
git add .
git commit -m "feat: migración a arquitectura modular"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

> **Crea el repositorio como PRIVADO.** El código contiene la lógica de negocio
> del club y la configuración de tu proyecto Firebase.

### 9.2. Activar Pages

En GitHub → tu repo → **Settings** → **Pages**:

- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/public` ← ⚠️ importante, no `/root`
- **Save**

En 1–2 minutos tendrás: `https://TU_USUARIO.github.io/TU_REPO/`

### 9.3. Autorizar el dominio en Firebase

Firebase Console → **Authentication** → **Settings** → **Dominios autorizados**
→ **Añadir dominio** → `TU_USUARIO.github.io`

**Sin esto el login fallará en producción** aunque funcione en local.

### 9.4. Crear la rama de desarrollo

```bash
git checkout -b develop
git push -u origin develop
```

A partir de aquí, trabaja en `develop` y en ramas `feature/*`, y solo mergea a
`main` lo que quieras que vea el club. Está todo explicado en `DESARROLLO.md`.

---

## 10. Dar de alta al resto del equipo

Para cada persona (taquillero, portero…):

1. **Authentication → Users → Añadir usuario** con su email y una contraseña
2. Copia su UID
3. **Firestore → colección `usuarios` → Añadir documento** con ID = ese UID:

```
rol:    "taquillero"        ← uno de: admin | taquillero | control_acceso | lector
email:  "persona@email.com"
nombre: "Nombre Apellido"
```

### Qué puede hacer cada rol

| Rol | Socios | Escáner | Taquilla | Cerrar jornada | Backup |
|-----|--------|---------|----------|----------------|--------|
| `admin` | Todo | Sí | Sí | Sí | Sí |
| `taquillero` | Solo ver | No | Vender | No | No |
| `control_acceso` | Solo ver | Sí (solo añadir) | No | No | No |
| `lector` | Solo ver | No | No | No | No |

> **Nota honesta sobre privacidad:** cualquier rol que entre en la app puede
> leer **todos los datos de los socios**, incluidos DNI, teléfono y email. Las
> reglas de Firestore conceden o deniegan **documentos enteros**, no campos
> sueltos. Ocultarle el DNI a un taquillero requeriría Cloud Functions (plan de
> pago). Tenlo en cuenta a efectos de RGPD al decidir a quién das acceso.

---

## 11. Qué NO funciona todavía

Sé honesto contigo mismo sobre el estado real de esto:

| Cosa | Estado | Detalle |
|------|--------|---------|
| **Cámara del escáner** | ❌ No implementada | El portero teclea el número a mano. jsQR está cargado pero nadie lo usa. Es la mejora nº 1 en valor real. |
| **Editar un socio** | ❌ No hay UI | `editarSocio()` está escrita y validada en el service, pero **ningún botón la llama**. Solo puedes marcar pagado y observaciones. |
| **QR falsificable** | ⚠️ Abierto | El QR es `HUESCA:5` en texto plano. Cualquiera genera `HUESCA:6` con el móvil y entra. Se arregla con tokens aleatorios (no requiere pagar). |
| **CDN sin SRI** | ⚠️ Abierto | Si un CDN se compromete, ejecuta código en tu app. Falta añadir `integrity="sha384-..."`. |
| **Offline** | ❌ No activado | Sin cobertura en la puerta del campo, el escáner deja de funcionar. Se arregla con 3 líneas en `firebase.js`. |

Todo esto está detallado en la tabla de deuda técnica de `DESARROLLO.md`.

---

## 12. Si algo falla

### Pantalla en blanco

Abre la consola del navegador (**F12** → pestaña Console).

| Error | Causa | Solución |
|-------|-------|----------|
| `CORS policy` / `blocked` | Abriste el HTML con doble clic | Usa `python3 -m http.server` |
| `Failed to resolve module` | Ruta de import mal | ¿Abriste la carpeta correcta en VS Code? |
| `Firebase: Error (auth/invalid-api-key)` | Credenciales mal pegadas | Revisa el paso 2.2 |

### Entro pero pone "· sin rol"

Tu documento en `usuarios` no existe o el ID no coincide con tu UID.
Revisa el paso 4. Causa más frecuente: se usó "ID automático".

### "Missing or insufficient permissions"

Las reglas te están denegando. Opciones:

1. Comprueba que tu documento de rol dice `admin` **en minúsculas**
2. Usa el Simulador para ver **qué línea** de las reglas te deniega
3. Si te has quedado fuera: **Reglas → Historial → Restaurar** la versión
   anterior, arregla el rol, y vuelve a publicar

### El alta de socio falla

- ¿Existe `contadores/socios` con el campo `ultimo` de tipo **number**? (paso 5)
- ¿Tu rol es `admin`? Solo admin puede dar de alta.

### El login funciona en local pero no en GitHub Pages

Falta autorizar el dominio: paso 9.3.

### Los tests

Opcional, pero si quieres comprobar que la lógica está sana:

```bash
npm test
```

Deben pasar 15/15. No necesitas `npm install` para esto: usa el runner nativo
de Node, sin dependencias.

---

## Resumen en 6 líneas

```bash
# 1. Pega tus credenciales en public/src/config/firebase.js
# 2. Authentication → crea tu usuario → copia el UID
# 3. Firestore → usuarios/{tu-UID} → { rol: "admin", ... }     ← ANTES de las reglas
# 4. Firestore → contadores/socios → { ultimo: 0 }
# 5. cd public && python3 -m http.server 8080
# 6. Prueba las reglas en el Simulador → Publicar
```
