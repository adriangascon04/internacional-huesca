# Puesta en marcha RÁPIDA — a GitHub Pages en 30 min

Saltamos local y vamos directo a producción. El login de Firebase Auth es suficiente.
(Si algo falla, el paso 12 tiene los arreglos.)

---

## Pasos

### 1. Descomprimir y subir a GitHub

```bash
unzip internacional-huesca.zip
cd internacional-huesca
git init
git add .
git commit -m "feat: app internacional huesca"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/internacional-huesca.git
git push -u origin main
```

> El repo puede ser **público**. El código está en el navegador de todos modos
> y la apiKey no es secreto. La seguridad es usuario+contraseña de Firebase.

### 2. Configurar Firebase

Abre `src/config/firebase.js` y pega tu configuración (desde Firebase
Console → ⚙️ Configuración del proyecto → Tus apps → Config):

```js
const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'internacional-huesca-nacho.firebaseapp.com',
  projectId: 'internacional-huesca-nacho',
  storageBucket: 'internacional-huesca-nacho.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: '1:123:web:abc',
};
```

Commit y push:

```bash
git add src/config/firebase.js
git commit -m "config: firebase credentials"
git push
```

### 3. Crear tu usuario en Firebase

Authentication → Users → Añadir usuario:
- Email: tuya
- Contraseña: cualquiera (mín 6 chars)

Copia tu **UID de usuario** (columna UID, cadena larga).

### 4. 🔴 CRÍTICO: Crear tu rol

**Esto es lo que NO te puedes saltar.** Si lo haces después de publicar las
reglas, te quedas fuera de tu propia app.

Firestore Database → Iniciar colección:

| Campo | Valor |
|-------|-------|
| **ID colección** | `usuarios` |
| **ID documento** | `{tu-UID}` ← el del paso 3, exacto |

Añade estos campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `rol` | string | `admin` |
| `email` | string | tu@email.com |
| `nombre` | string | Tu Nombre |

**Atención:** `admin` en minúsculas, ID del doc = tu UID exacto (sin espacios).

### 5. Crear el contador de socios

Firestore → Iniciar colección:

| Campo | Valor |
|-------|-------|
| **ID colección** | `contadores` |
| **ID documento** | `socios` |

Añade: `ultimo` (type: **number**, value: `0`)

### 6. Activar Authentication → Email/Contraseña

Authentication → Sign-in method → Email/contraseña → Activar.

### 7. Activar GitHub Pages

GitHub repo → Settings → Pages:
- Source: `main` branch
- Folder: `/ (root)` ← el `index.html` está en la raíz, no hay carpeta `public/`
- Save

En 2 min: `https://TU_USUARIO.github.io/internacional-huesca/`

### 8. Autorizar el dominio en Firebase

Firebase Console → Authentication → Settings → Dominios autorizados →
Añadir: `TU_USUARIO.github.io`

### 9. Publicar las reglas (con pruebas)

**Aquí sí:** abre el Simulador del editor de reglas y comprueba:

| Caso | Ubicación | Auth | Esperado |
|------|-----------|------|----------|
| 1 | `/socios/1` get | tu UID | ✅ Permitido |
| 2 | `/socios/1` delete | tu UID | ❌ Denegado |
| 3 | `/contadores/socios` update | tu UID | ✅ Permitido si `ultimo > anterior` |

Si pasa → **Publicar**.

**Rollback:** Reglas → Historial → Restaurar.

### 10. Ir a la app

`https://TU_USUARIO.github.io/internacional-huesca/`

- Entra con tu email y contraseña
- Debería salir `email · admin` arriba a la derecha
- Da de alta un socio: debe asignarle el nº 1 (del contador del paso 5)
- Escáner: selecciona jornada, escribe el nº, valida

### 11. Dar de alta al equipo

Para cada persona:

1. **Authentication → Añadir usuario** (email + contraseña)
2. Copia su UID
3. **Firestore → usuarios** → Documento nuevo con ID = ese UID:
   ```
   rol:    "taquillero"  (o control_acceso, lector)
   email:  "su@email.com"
   nombre: "Nombre"
   ```

| Rol | Ve socios | Escáner | Taquilla | Cierra | Backup |
|-----|-----------|---------|----------|--------|--------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `taquillero` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `control_acceso` | ✅ | ✅* | ❌ | ❌ | ❌ |
| `lector` | ✅ | ❌ | ❌ | ❌ | ❌ |

\* Solo puede añadir entradas, no borrar.

---

## Si algo falla

### Pantalla en blanco

Abre F12 → Console. Si ves `Firebase: Error (auth/invalid-api-key)` → el paso 2 está mal.

### Entra pero pone "· sin rol"

Tu UID en el paso 4 no coincide exactamente, o escribiste `Admin` en vez de `admin`.

### "Missing or insufficient permissions"

- ¿Tu `rol` dice `admin` en minúsculas?
- Comprueba con el Simulador qué regla te deniega (paso 9)
- Si te quedas fuera: **Reglas → Historial → Restaurar**

### El alta de socio falla

¿Existe `contadores/socios` con `ultimo` de tipo **number**? (paso 5)

### Login en GitHub Pages falla, pero en local funciona

Falta el paso 8 (autorizar el dominio).

---

## Lo que NO funciona

- **Cámara:** el portero teclea el nº a mano
- **Editar socio:** solo marcar pagado y observaciones
- **Offline:** sin 4G en el campo se cae
- **QR seguro:** se puede falsificar

Ver la tabla de deuda técnica en `DESARROLLO.md`.

---

## Resumen en 5 comandos

```bash
# 1. Subir a GitHub
git init && git add . && git commit -m "init" && git push -u origin main

# 2. Pegas credenciales en src/config/firebase.js y pushas

# 3. Firebase → usuarios/{tu-UID} → {rol:"admin", ...}
# 4. Firebase → contadores/socios → {ultimo:0}
# 5. Firestore → Reglas → pega firestore.rules → Publicar

# 6. GitHub Pages activo en / (root)
# 7. La app está en https://tu-usuario.github.io/internacional-huesca/
```

---

## CHANGELOG de esta versión

Ver `CHANGELOG.md`: 8 bugs corregidos en esta iteración, 2 críticos
(pérdida de registros por race condition, reglas que permitían más de lo que
decían).
