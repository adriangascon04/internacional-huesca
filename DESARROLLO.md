# Guía de desarrollo

## Entorno local

Los módulos ES nativos **no funcionan con `file://`**. Necesitas un servidor:

```bash
npm run dev                     # sirve la raíz en http://localhost:8080
```

En VS Code, la extensión **Live Server** también sirve (botón "Go Live").

> Cualquier servidor estático vale, siempre que apunte a la **raíz** del repo.
> Con Python es `python -m http.server 8080` (en Windows el ejecutable es
> `python`, no `python3`, y si usas conda tendrás que lanzarlo desde un
> *Anaconda Prompt* o tener conda en el PATH).

---

## Estrategia de ramas

Para un proyecto con 1–2 mantenedores, Git Flow completo es excesivo. Usamos
una versión reducida y suficiente:

```
main        ← Producción. Lo que ve el club. Siempre desplegable.
  ↑
develop     ← Integración. Aquí se juntan las features y se prueba.
  ↑
feature/*   ← Una rama por cambio.  feature/editar-socio, feature/qr-firmado
hotfix/*    ← Arreglo urgente en producción. Sale de main y vuelve a main y develop.
```

### Flujo normal

```bash
git checkout develop
git pull
git checkout -b feature/editar-socio

# ... trabajas, commits pequeños ...

git push -u origin feature/editar-socio
# → Abres Pull Request hacia develop en GitHub
# → La CI pasa lint + formato
# → Merge a develop
```

### Publicar a producción

```bash
git checkout main
git merge develop
git tag v1.1.0
git push origin main --tags
# → GitHub Pages se actualiza solo
```

### Hotfix urgente

```bash
git checkout main
git checkout -b hotfix/qr-no-valida
# ... arreglas ...
git checkout main && git merge hotfix/qr-no-valida
git checkout develop && git merge hotfix/qr-no-valida   # ¡no lo olvides!
```

### Protección recomendada en GitHub

En *Settings → Branches* protege `main`:
- Requiere Pull Request antes de mergear.
- Requiere que la CI pase.

---

## Convención de commits

```
feat: permitir editar los datos de un socio
fix: el escáner no validaba jornadas cerradas
refactor: extraer taquilla a su propio service
docs: añadir guía de despliegue
chore: actualizar reglas de Firestore
```

---

## Calidad de código

```bash
npm test                           # tests (runner nativo de Node, sin instalar nada)
npx eslint "src/**/*.js"           # lint
npx prettier --write "src/**/*.js" # formatear
```

La CI (`.github/workflows/ci.yml`) ejecuta lint, formato y tests en cada PR.

### Las reglas de Firestore: probarlas de verdad

`firestore.rules` no lo cubre `npm test`: es un lenguaje aparte que evalúa el
servidor. Hay una suite que las ejecuta contra el **emulador de Firestore**, con
un usuario de cada rol, comprobando qué escritura pasa y cuál se rechaza:

```bash
npm run test:reglas:instalar   # una vez: baja el emulador y el SDK (no se guardan en package.json)
npm run test:reglas            # necesita Java instalado
```

Es lo único que distingue "creo que la regla dice esto" de "el servidor hace
esto". Cada vez que toques `firestore.rules`, pásala.

> ⚠️ Prueba el **fichero del repositorio**. Que lo que hay publicado en la consola
> de Firebase sea idéntico es otra cosa y no lo comprueba nadie: ver la tabla de
> deuda técnica.

### Dos comprobaciones que el lint NO hace

ESLint no resuelve imports ni sabe nada del HTML, así que dos errores muy fáciles
de cometer pasan el lint y revientan en el navegador al abrir la pestaña:

- **Un `import { algo }` de un export que ya no existe.** Se caza importando
  todos los módulos de `src/` con el stub de Firebase de `tests/`: en ESM, un
  export que falta es un error de enlazado, no de ejecución.
- **Un `$('#id')` que no existe en `index.html`.** Devuelve `null` y el fallo
  aparece lejos de donde está la causa.

Vale la pena pasarlas a mano tras tocar UI. Si esto se repite, conviértelas en un
test más.

---

## Deuda técnica conocida

Cosas que **no** se han arreglado y por qué. Sé honesto contigo mismo aquí.

| Tema | Estado | Nota |
|---|---|---|
| QR falsificable | ✅ Cerrado | El QR es `HUESCA:<id>:<token>`, con un token aleatorio por socio guardado en su ficha, y `QR_ACEPTA_LEGACY` está en `false`: un `HUESCA:6` sin token se rechaza. Se pudo apagar el flag porque no había ningún carnet v1 impreso. La vía de escape sigue siendo la validación manual del escáner, que no exige token porque la teclea el personal. Limitación que queda: cualquier usuario autenticado puede leer los tokens (las reglas conceden documentos enteros, no campos); blindarlo del todo exigiría Cloud Functions → plan Blaze. |
| Dependencias CDN sin SRI | ⚠️ Parcial | Si un CDN se compromete, ejecuta código en tu app. Añadir `integrity="sha384-..."` a cada `<script>`. |
| Sin tests automáticos | ✅ Cubierto lo crítico | `npm test` (runner nativo de Node, sin dependencias) cubre validadores, tokens, parseo de QR, accesos, taquilla, abonos y estadísticas. Falta cobertura de las páginas de UI: se compensa comprobando que todo `$('#id')` del JS existe en `index.html` y que los módulos importan (ver más arriba). |
| Reglas de Firestore desincronizadas | ⚠️ Vivo | `firestore.rules` **no se despliega solo**: GitHub Pages solo sirve HTML/JS. Cada cambio hay que pegarlo en Firebase Console → Firestore → Reglas → Publicar. Si el fichero y lo publicado divergen, la app enseña botones que el servidor rechaza. `npm run test:reglas` prueba el fichero, no lo publicado: esa diferencia sigue sin cubrir a nadie. Al tocar reglas, dilo en el commit. |
| Reglas sin probar | ✅ Cerrado | `npm run test:reglas` las ejecuta contra el emulador con un usuario de cada rol (26 casos: quién borra socios, quién anula una venta, qué pasa con la jornada cerrada, que el contador de nº de socio solo suba…). La CI lo pasa en cada PR. |
| Borrado real de socios | ✅ Decidido | Desde 1.3.0 `allow delete: if esAdmin()` en `/socios`. Era `if false` con baja lógica. No reabre el "QR zombie": el nº de carnet se reutiliza pero el QR lleva el `tokenQR` del socio, y el id interno lo reparte un contador monotónico. Lo que sí queda: fichajes en `entradas` colgando de ids borrados, que el escáner enseña como "(socio N)". |
| Ocultar el DNI a roles no-admin | ❌ Imposible con reglas | Las reglas de Firestore permiten o deniegan documentos enteros, no campos. Requeriría Cloud Functions. |
| Cámara del escáner | ✅ Implementada | `src/ui/camara.js` captura vídeo desde `scanner.page.js`. Decodifica con `BarcodeDetector` nativo (Chrome/Android) y cae a jsQR sobre un fotograma reducido a 640 px donde no exista. Exige HTTPS y permiso del navegador. La validación manual sigue como alternativa. |
