# Despliegue

## 1. Configurar Firebase

Edita `public/src/config/firebase.js` con los valores de tu proyecto
(Firebase Console → ⚙️ Configuración del proyecto → Tus apps → Config).

> La `apiKey` de una app web **no es un secreto**: viaja en el navegador de
> todos modos. La seguridad real la imponen `firestore.rules`. Aun así, se
> recomienda repositorio **privado** para no exponer la lógica de negocio.

## 2. Sembrar los roles (¡ANTES de publicar las reglas!)

Si publicas las reglas sin roles, **te quedas fuera de tu propia app**.

1. Firebase Console → Authentication → crea/localiza tu usuario y copia su **UID**.
2. Firestore → crea la colección `usuarios` → documento con **ID = ese UID**:

```json
{
  "rol": "admin",
  "email": "tu@email.com",
  "nombre": "Tu Nombre"
}
```

3. Repite para el resto del equipo con el rol que corresponda:
   `admin` · `taquillero` · `control_acceso` · `lector`

## 3. Probar las reglas antes de publicarlas

Firestore → Reglas → **Simulador (Playground)**:

| Prueba | Ubicación | Auth | Esperado |
|---|---|---|---|
| Lectura de socio | `/socios/1` | UID lector | ✅ Permitido |
| Escritura de socio | `/socios/1` | UID lector | ❌ Denegado |
| Escritura de socio | `/socios/1` | UID admin | ✅ Permitido |
| Lectura de backup | `/backups/x` | UID taquillero | ❌ Denegado |
| Venta en taquilla | `/taquilla/x` | UID taquillero | ✅ Permitido |

## 4. Publicar las reglas

Pega el contenido de `firestore.rules` en Firestore → Reglas → **Publicar**.

**Rollback:** Firestore → Reglas → pestaña *Historial* → seleccionar versión
anterior → *Restaurar*. Tenlo localizado antes de publicar.

## 5. Verificar

- [ ] Entras con tu usuario admin y ves los socios.
- [ ] Un usuario `lector` no puede dar de alta.
- [ ] El escáner registra una entrada.
- [ ] La taquilla vende con un usuario `taquillero`.
- [ ] Un `taquillero` NO ve la pestaña de Backup.

## 6. GitHub Pages

Settings → Pages:
- **Source:** Deploy from a branch
- **Branch:** `main`
- **Folder:** `/public`

En 1–2 minutos: `https://<usuario>.github.io/<repo>/`

> Si prefieres servir desde la raíz, mueve el contenido de `public/` a la raíz
> y ajusta la ruta en Pages.

## Índices de Firestore

`firestore.indexes.json` está vacío a propósito: las consultas actuales
(`orderBy('numerico')`, `orderBy('fecha','desc')`) usan índices automáticos de
campo único. Si añades una consulta compuesta, Firestore te dará en consola un
enlace para crear el índice; añádelo aquí para que quede versionado.
