# Guía de desarrollo

## Entorno local

Los módulos ES nativos **no funcionan con `file://`**. Necesitas un servidor:

```bash
cd public
python3 -m http.server 8080     # o: npx serve .
```

En VS Code, la extensión **Live Server** también sirve (botón "Go Live").

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
npx eslint "public/src/**/*.js"          # lint
npx prettier --write "public/src/**/*.js" # formatear
```

La CI (`.github/workflows/ci.yml`) ejecuta lint y formato en cada PR.

---

## Deuda técnica conocida

Cosas que **no** se han arreglado y por qué. Sé honesto contigo mismo aquí.

| Tema | Estado | Nota |
|---|---|---|
| QR falsificable | ❌ Pendiente | El QR es `HUESCA:<id>` en texto plano. Cualquiera puede generar uno. Firmarlo con HMAC exige un secreto en servidor → Cloud Functions → plan Blaze (de pago). |
| Dependencias CDN sin SRI | ⚠️ Parcial | Si un CDN se compromete, ejecuta código en tu app. Añadir `integrity="sha384-..."` a cada `<script>`. |
| Sin tests automáticos | ❌ Pendiente | Los services son funciones puras y fáciles de testear. Empezar por `validators.js` y `stats.service.js`. |
| Ocultar el DNI a roles no-admin | ❌ Imposible con reglas | Las reglas de Firestore permiten o deniegan documentos enteros, no campos. Requeriría Cloud Functions. |
| Cámara del escáner | ⚠️ | jsQR está cargado; la captura de vídeo se puede añadir en `scanner.page.js`. La validación manual funciona. |
