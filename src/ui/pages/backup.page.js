// ============================================================================
//  src/ui/pages/backup.page.js  ·  Copias de seguridad (solo admin).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { state } from '../../core/state.js';
import { MAX_BACKUPS } from '../../config/app.config.js';
import * as backup from '../../services/backup.service.js';
import * as roles from '../../services/roles.service.js';
import {
  resumenReinicio,
  reiniciarJornadas,
} from '../../services/mantenimiento.service.js';

/** Palabra que hay que teclear para confirmar el reinicio. */
const PALABRA_CONFIRMACION = 'BORRAR';

export function initBackup() {
  on($('#btn-crear-backup'), 'click', async () => {
    const msg = $('#backup-msg');
    msg.textContent = 'Generando copia de seguridad…';
    try {
      const r = await backup.crearBackup(state.entradas, state.taquilla);
      msg.textContent = `Copia creada (${r.nSocios} socios, ${r.nJornadas} jornadas con datos).`;
    } catch {
      msg.textContent = 'Error al crear la copia. Revisa tus permisos.';
    }
  });
  on($('#btn-reiniciar-jornadas'), 'click', reiniciar);
}

/**
 * Reinicio de los datos de partido. No se puede deshacer, así que:
 *   1. se enseña exactamente lo que se va a borrar, contado;
 *   2. se pide teclear una palabra — un `confirm()` a secas se acepta sin leer;
 *   3. el servicio guarda una copia de seguridad antes de tocar nada.
 */
async function reiniciar() {
  const msg = $('#reinicio-msg');
  const r = resumenReinicio(state);

  if (!r.jornadasConFichajes && !r.jornadasConVentas && !r.jornadasCerradas) {
    msg.className = 'msg';
    msg.textContent = 'No hay datos de partido que borrar: ya está todo a cero.';
    return;
  }

  const respuesta = prompt(
    `Se van a BORRAR los datos de partido de todas las jornadas:\n\n` +
      `  · ${r.fichajes} entradas fichadas en la puerta (${r.jornadasConFichajes} jornadas)\n` +
      `  · ${r.ventas} ventas de taquilla (${r.jornadasConVentas} jornadas)\n` +
      `  · ${r.jornadasCerradas} jornadas cerradas volverán a abrirse\n\n` +
      `NO se tocan los socios, ni el calendario, ni los precios, ni los usuarios.\n` +
      `Se guardará una copia de seguridad antes de borrar.\n\n` +
      `Esto NO se puede deshacer.\n\n` +
      `Escribe ${PALABRA_CONFIRMACION} para continuar:`,
  );
  if (respuesta?.trim().toUpperCase() !== PALABRA_CONFIRMACION) {
    msg.className = 'msg';
    msg.textContent = 'Reinicio cancelado. No se ha borrado nada.';
    return;
  }

  const btn = $('#btn-reiniciar-jornadas');
  btn.disabled = true;
  msg.className = 'msg';
  msg.textContent = 'Guardando copia de seguridad y borrando…';
  try {
    const { resumen } = await reiniciarJornadas(state);
    msg.className = 'msg msg-ok';
    msg.textContent =
      `Listo: borradas ${resumen.fichajes} entradas y ${resumen.ventas} ventas. ` +
      `La copia de seguridad previa está en la lista de abajo.`;
  } catch (e) {
    console.error('Error al reiniciar las jornadas:', e);
    msg.className = 'msg msg-err';
    msg.textContent =
      'No se ha podido completar el reinicio. Comprueba que sigues como admin y ' +
      'que hay conexión. Revisa los datos antes de volver a intentarlo.';
  } finally {
    btn.disabled = false;
  }
}

export function render() {
  // El servidor ya lo impide, pero un botón de borrado masivo no debería ni
  // verse si no puedes usarlo.
  const zona = $('#zona-reinicio');
  if (zona) zona.style.display = roles.esAdmin() ? 'block' : 'none';

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
