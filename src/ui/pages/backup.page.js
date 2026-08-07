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
  hayDatosDePartido,
  reiniciarJornadas,
  reiniciarTodo,
} from '../../services/mantenimiento.service.js';

/** Palabras que hay que teclear para confirmar cada reinicio. */
const PALABRA_JORNADAS = 'BORRAR';
const PALABRA_TODO = 'EMPEZAR DE CERO';

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
  on($('#btn-reiniciar-todo'), 'click', reiniciarDelTodo);
}

/**
 * Ejecuta un reinicio. Es lo mismo para los dos botones y por eso está en un
 * solo sitio: la diferencia entre borrar los partidos y borrarlo todo no puede
 * ser que uno de los dos se olvide de pedir confirmación o de avisar del fallo.
 *
 * No se puede deshacer, así que:
 *   1. se enseña exactamente lo que se va a borrar, contado;
 *   2. se pide teclear una palabra — un `confirm()` a secas se acepta sin leer;
 *   3. el servicio guarda una copia de seguridad antes de tocar nada.
 */
async function ejecutarReinicio({ boton, aviso, palabra, accion, exito }) {
  const msg = $('#reinicio-msg');
  const btn = $(boton);
  const respuesta = prompt(aviso);
  if (respuesta?.trim().toUpperCase() !== palabra) {
    msg.className = 'msg';
    msg.textContent = 'Reinicio cancelado. No se ha borrado nada.';
    return;
  }

  btn.disabled = true;
  msg.className = 'msg';
  msg.textContent = 'Guardando copia de seguridad y borrando…';
  try {
    const { resumen } = await accion(state);
    msg.className = 'msg msg-ok';
    msg.textContent = `${exito(resumen)} La copia de seguridad previa está en la lista de arriba.`;
  } catch (e) {
    console.error('Error al reiniciar:', e);
    msg.className = 'msg msg-err';
    msg.textContent =
      'No se ha podido completar el reinicio. Comprueba que sigues como admin y ' +
      'que hay conexión. Revisa los datos antes de volver a intentarlo.';
  } finally {
    btn.disabled = false;
  }
}

/** Reinicio de los datos de partido: los socios se quedan. */
function reiniciar() {
  const r = resumenReinicio(state);
  if (!hayDatosDePartido(r)) {
    const msg = $('#reinicio-msg');
    msg.className = 'msg';
    msg.textContent = 'No hay datos de partido que borrar: ya está todo a cero.';
    return;
  }
  return ejecutarReinicio({
    boton: '#btn-reiniciar-jornadas',
    palabra: PALABRA_JORNADAS,
    accion: reiniciarJornadas,
    aviso:
      `Se van a BORRAR los datos de partido de todas las jornadas:\n\n` +
      `  · ${r.fichajes} entradas fichadas en la puerta (${r.jornadasConFichajes} jornadas)\n` +
      `  · ${r.ventas} ventas de taquilla (${r.jornadasConVentas} jornadas)\n` +
      `  · ${r.jornadasCerradas} jornadas cerradas volverán a abrirse\n\n` +
      `Los ${r.socios} socios NO se tocan, ni el calendario, ni los precios, ni los usuarios.\n` +
      `Se guardará una copia de seguridad antes de borrar.\n\n` +
      `Esto NO se puede deshacer.\n\n` +
      `Escribe ${PALABRA_JORNADAS} para continuar:`,
    exito: (resumen) =>
      `Listo: borradas ${resumen.fichajes} entradas y ${resumen.ventas} ventas.`,
  });
}

/** Borrón y cuenta nueva: datos de partido MÁS todos los socios. */
function reiniciarDelTodo() {
  const r = resumenReinicio(state);
  if (!hayDatosDePartido(r) && !r.socios) {
    const msg = $('#reinicio-msg');
    msg.className = 'msg';
    msg.textContent = 'No hay nada que borrar: la aplicación ya está vacía.';
    return;
  }
  return ejecutarReinicio({
    boton: '#btn-reiniciar-todo',
    palabra: PALABRA_TODO,
    accion: reiniciarTodo,
    aviso:
      `BORRÓN Y CUENTA NUEVA. Se va a borrar TODO lo siguiente:\n\n` +
      `  · ${r.socios} socios, con sus fichas, sus carnets y sus cuotas\n` +
      `  · ${r.fichajes} entradas fichadas en la puerta (${r.jornadasConFichajes} jornadas)\n` +
      `  · ${r.ventas} ventas de taquilla (${r.jornadasConVentas} jornadas)\n` +
      `  · ${r.jornadasCerradas} jornadas cerradas volverán a abrirse\n\n` +
      `Todas las estadísticas quedarán a cero y TODOS los carnets impresos dejarán\n` +
      `de funcionar. Los socios habrá que darlos de alta otra vez.\n\n` +
      `NO se tocan el calendario de competiciones, los precios, los usuarios de la\n` +
      `aplicación ni las copias de seguridad.\n` +
      `Se guardará una copia de seguridad antes de borrar.\n\n` +
      `Esto NO se puede deshacer.\n\n` +
      `Escribe exactamente «${PALABRA_TODO}» para continuar:`,
    exito: (resumen) =>
      `Listo: borrados ${resumen.socios} socios, ${resumen.fichajes} entradas y ` +
      `${resumen.ventas} ventas. La aplicación está lista para empezar de cero.`,
  });
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
