// ============================================================================
//  src/ui/pages/backup.page.js  ·  Copias de seguridad (solo admin).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { state } from '../../core/state.js';
import { MAX_BACKUPS } from '../../config/app.config.js';
import * as backup from '../../services/backup.service.js';

export function initBackup() {
  on($('#btn-crear-backup'), 'click', async () => {
    const msg = $('#backup-msg');
    msg.textContent = 'Generando copia de seguridad…';
    try {
      const r = await backup.crearBackup(state.entradas, state.taquilla, state.salidas);
      msg.textContent = `Copia creada (${r.nSocios} socios, ${r.nJornadas} jornadas con datos).`;
    } catch {
      msg.textContent = 'Error al crear la copia. Revisa tus permisos.';
    }
  });
}

export function render() {
  const cont = $('#backup-lista');
  if (!cont) return;
  const lista = state.backups;
  if (!lista.length) {
    cont.innerHTML =
      '<p class="empty">Aún no se ha creado ninguna copia de seguridad.</p>';
    return;
  }
  cont.innerHTML = `<table><thead><tr>
      <th>Fecha</th><th>Socios</th><th>Jornadas</th><th>Creada por</th><th></th>
    </tr></thead><tbody>${lista
      .map(
        (b) => `<tr>
      <td>${esc(new Date(b.fecha).toLocaleString('es-ES'))}</td>
      <td>${esc(b.nSocios)}</td><td>${esc(b.nJornadas)}</td>
      <td>${esc(b.creadoPor || '—')}</td>
      <td><button class="btn" data-dl="${esc(b.id)}">⬇ Descargar JSON</button></td>
    </tr>`,
      )
      .join('')}</tbody></table>
    <p class="nota">${lista.length} de ${MAX_BACKUPS} copias usadas. Al superar ${MAX_BACKUPS} se borra automáticamente la más antigua.</p>
    <p class="nota">⚠️ Estas copias contienen datos personales (RGPD). Guárdalas en un lugar seguro y bórralas cuando no las necesites.</p>`;

  cont.querySelectorAll('[data-dl]').forEach((el) =>
    on(el, 'click', () => {
      const b = lista.find((x) => x.id === el.dataset.dl);
      if (b) backup.descargarBackup(b);
    }),
  );
}
