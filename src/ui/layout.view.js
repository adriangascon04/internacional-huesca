// ============================================================================
//  src/ui/layout.view.js
//  Cabecera, pestañas y visibilidad según rol (capa cosmética: la seguridad
//  real está en firestore.rules).
// ============================================================================
import { $, $$, on } from '../utils/dom.js';
import { esc } from '../utils/sanitize.js';
import { logout } from '../core/auth.js';
import { session } from '../core/session.js';
import { setState } from '../core/state.js';
import * as roles from '../services/roles.service.js';

const TABS = ['socios', 'qr', 'scanner', 'taquilla', 'stats', 'import', 'backup'];

export function initLayout(onTabChange) {
  $('#user-label').textContent =
    `${esc(session.email)} · ${esc(session.rol || 'sin rol')}`;
  on($('#btn-logout'), 'click', logout);

  $$('.tab').forEach((btn) => {
    on(btn, 'click', () => switchTab(btn.dataset.tab, onTabChange));
  });

  aplicarPermisos();
  switchTab('socios', onTabChange);
}

export function switchTab(tab, onTabChange) {
  TABS.forEach((t) => {
    $(`#panel-${t}`)?.classList.toggle('active', t === tab);
    $(`.tab[data-tab="${t}"]`)?.classList.toggle('active', t === tab);
  });
  setState({ tabActiva: tab });
  onTabChange?.(tab);
}

/** Oculta lo que el rol no puede usar. Nadie gana acceso por esto. */
function aplicarPermisos() {
  const ocultar = (sel, visible) => {
    const el = $(sel);
    if (el) el.style.display = visible ? '' : 'none';
  };
  ocultar('.tab[data-tab="backup"]', roles.puedeHacerBackup());
  ocultar('.tab[data-tab="import"]', roles.puedeGestionarSocios());
  ocultar('#form-alta', roles.puedeGestionarSocios());
  ocultar('.tab[data-tab="taquilla"]', roles.puedeVender());
  ocultar('.tab[data-tab="scanner"]', roles.puedeEscanear());
}
