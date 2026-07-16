// ============================================================================
//  src/main.js  ·  PUNTO DE ENTRADA de la aplicación.
//
//  Flujo:
//    1. Observa la sesión (Firebase Auth) y carga el rol desde /usuarios/{uid}.
//    2. Si no hay sesión -> pantalla de login.
//    3. Si hay sesión    -> monta el layout, abre las suscripciones en tiempo
//                           real e inicializa cada página.
//
//  Regla de oro de la arquitectura:  UI → services → repositories → Firestore.
//  Ninguna página importa Firestore directamente.
// ============================================================================
import { observarSesion } from './core/auth.js';
import { setState, state } from './core/state.js';
import { initLogin, mostrarLogin } from './ui/login.view.js';
import { initLayout } from './ui/layout.view.js';

import * as sociosSvc from './services/socios.service.js';
import * as backupSvc from './services/backup.service.js';
import { suscribirEntradas } from './repositories/entradas.repository.js';
import { suscribirTaquilla } from './repositories/taquilla.repository.js';
import { suscribirBloqueos } from './repositories/jornadas.repository.js';

import * as sociosPage from './ui/pages/socios.page.js';
import * as qrPage from './ui/pages/qr.page.js';
import * as scannerPage from './ui/pages/scanner.page.js';
import * as taquillaPage from './ui/pages/taquilla.page.js';
import * as statsPage from './ui/pages/stats.page.js';
import * as importarPage from './ui/pages/importar.page.js';
import * as backupPage from './ui/pages/backup.page.js';
import * as jornadasPage from './ui/pages/jornadas.page.js';

let suscripciones = [];
let appIniciada = false;

initLogin();

observarSesion((user) => {
  mostrarLogin(!user);
  if (!user) return cerrarSuscripciones();
  if (!appIniciada) {
    iniciarApp();
    appIniciada = true;
  }
});

function iniciarApp() {
  initLayout(onTabChange);

  // Inicializar páginas (registra listeners una sola vez).
  sociosPage.initSocios();
  qrPage.initQr();
  scannerPage.initScanner();
  taquillaPage.initTaquilla();
  importarPage.initImportar();
  backupPage.initBackup();
  jornadasPage.initJornadas();

  // Suscripciones en tiempo real -> estado -> re-render de lo visible.
  suscripciones = [
    sociosSvc.iniciarSocios((lista) => {
      setState({ socios: lista });
      sociosPage.render();
      qrPage.rellenarSelect();
      if (state.tabActiva === 'stats') statsPage.render();
    }),
    suscribirEntradas((map) => {
      setState({ entradas: map });
      scannerPage.renderLog();
      if (state.tabActiva === 'stats') statsPage.render();
    }),
    suscribirTaquilla((map) => {
      setState({ taquilla: map });
      taquillaPage.render();
      if (state.tabActiva === 'stats') statsPage.render();
    }),
    suscribirBloqueos((map) => {
      setState({ jornadasBloqueadas: map });
      jornadasPage.render();
    }),
    backupSvc.iniciarBackups((lista) => {
      setState({ backups: lista });
      if (state.tabActiva === 'backup') backupPage.render();
    }),
  ];
}

/** Re-render bajo demanda al cambiar de pestaña (evita trabajo innecesario). */
function onTabChange(tab) {
  if (tab === 'stats') statsPage.render();
  if (tab === 'taquilla') taquillaPage.render();
  if (tab === 'backup') backupPage.render();
  if (tab === 'taquilla' || tab === 'scanner') jornadasPage.render();
}

function cerrarSuscripciones() {
  suscripciones.forEach((unsub) => typeof unsub === 'function' && unsub());
  suscripciones = [];
}
