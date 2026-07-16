# Internacional Huesca · Gestión de Abonados

PWA para la gestión de socios, control de acceso por QR, taquilla y estadísticas
del club **Internacional Huesca**.

Migrada desde un único `index.html` de 1230 líneas a una arquitectura modular
con **módulos ES nativos**, sin paso de build, desplegable en GitHub Pages.

---



## Arranque rápido

```bash
# 1. Configurar Firebase
#    Edita src/config/firebase.js y pega tus credenciales
#    (Firebase Console → Configuración del proyecto → Tus apps → Config)

# 2. Levantar en local (los módulos ES exigen un servidor: file:// NO vale)
npm run dev
#    → abre http://localhost:8080
```

> ⚠️ **No se puede abrir con doble clic.** Los módulos ES nativos requieren
> protocolo `http://`. Es el precio (aceptado) de no tener build.

---

## Estructura

```
.                           Raíz del repo = lo que publica GitHub Pages
├── index.html              Shell de la app (HTML + CSS)
├── manifest.json           Manifiesto PWA
└── src/
    ├── main.js             Punto de entrada: orquesta todo
    ├── config/
    │   ├── firebase.js     Inicialización de Firebase (auth + db)
    │   └── app.config.js   ⭐ TODA la configuración: precios, temporada, abonos
    ├── core/
    │   ├── auth.js         Login/logout y carga del rol
    │   ├── session.js      Estado de sesión (uid, email, rol)
    │   └── state.js        Estado compartido reactivo
    ├── repositories/       ⭐ ÚNICA capa que habla con Firestore
    │   ├── socios.repository.js
    │   ├── entradas.repository.js
    │   ├── taquilla.repository.js
    │   ├── jornadas.repository.js
    │   ├── backups.repository.js
    │   ├── usuarios.repository.js
    │   └── contadores.repository.js
    ├── services/           Lógica de negocio
    │   ├── socios.service.js
    │   ├── acceso.service.js
    │   ├── taquilla.service.js
    │   ├── stats.service.js
    │   ├── backup.service.js
    │   └── roles.service.js
    ├── utils/
    │   ├── sanitize.js     ⭐ Escapado HTML (anti-XSS)
    │   ├── validators.js   DNI/NIE, email, teléfono
    │   ├── format.js       Fechas, horas, euros
    │   └── dom.js          $, $$, on
    └── ui/
        ├── login.view.js
        ├── layout.view.js  Pestañas y permisos por rol
        ├── camara.js       Cámara + lectura de QR (jsQR)
        ├── sonidos.js
        └── pages/          Una página por pestaña
            ├── socios.page.js
            ├── qr.page.js
            ├── scanner.page.js
            ├── taquilla.page.js
            ├── stats.page.js
            ├── importar.page.js
            ├── backup.page.js
            └── jornadas.page.js
```

### Regla de oro

```
UI  →  services  →  repositories  →  Firestore
```

Ninguna página importa Firestore directamente. Si necesitas datos, pasa por un
service. Si el service necesita persistir, pasa por un repository.

---

## ¿Dónde toco para…?

| Quiero… | Archivo |
|---|---|
| Cambiar el precio de las entradas | `config/app.config.js` → `PRECIOS_TAQUILLA` |
| Cambiar la temporada o nº de jornadas | `config/app.config.js` → `TEMPORADA_ACTUAL`, `NUM_JORNADAS` |
| Añadir/quitar un tipo de abono | `config/app.config.js` → `TIPOS_ABONO` |
| Cambiar la fecha de Socio Fundador | `config/app.config.js` → `FECHA_LIMITE_FUNDADOR` |
| Tocar la tabla de socios | `ui/pages/socios.page.js` |
| Cambiar la lógica del escáner | `services/acceso.service.js` |
| Cambiar quién puede hacer qué | `firestore.rules` (+ `services/roles.service.js` para la UI) |
| Cambiar estilos | `<style>` de `index.html` |

---

## Documentación

- **[PUESTA_EN_MARCHA_RAPIDA.md](PUESTA_EN_MARCHA_RAPIDA.md)** — GitHub Pages en 30 min
- **[PUESTA_EN_MARCHA.md](PUESTA_EN_MARCHA.md)** — Local primero, más detallado
- **[DESARROLLO.md](DESARROLLO.md)** — Entorno local, ramas Git, convenciones.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Despliegue a GitHub Pages y reglas de Firestore.
- **[CHANGELOG.md](CHANGELOG.md)** — Historial de cambios.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Cómo contribuir.
