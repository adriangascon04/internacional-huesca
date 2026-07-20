// ============================================================================
//  src/ui/pages/jornadas.page.js
//  Bloqueo/desbloqueo de jornadas (cierre de acta) y "jornada actual" del
//  club. Ambos controles son solo admin.
//  Bloqueo: afecta a escáner y taquilla; una jornada cerrada no admite cambios.
//  Jornada actual: cuál es "la de hoy" — el portero solo puede escanear ahí.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { state, estaBloqueada } from '../../core/state.js';
import { bloquearJornada } from '../../repositories/jornadas.repository.js';
import { fijarJornadaActual } from '../../repositories/config.repository.js';
import { esAdmin } from '../../services/roles.service.js';
import { getPartidos, getPartidosLabel } from '../../config/app.config.js';

export function initJornadas() {
  on($('#btn-bloqueo-scanner'), 'click', () => toggle(state.partidoScanner));
  on($('#btn-bloqueo-taquilla'), 'click', () => toggle(state.partidoTaquilla));
  rellenarSelectJornadaActual();
  on($('#btn-jornada-actual-guardar'), 'click', guardarJornadaActual);
}

async function toggle(jornada) {
  if (!jornada) return;
  const bloqueada = estaBloqueada(jornada);
  const accion = bloqueada ? 'desbloquear' : 'cerrar';
  const detalle = bloqueada
    ? 'Se podrán volver a registrar entradas y ventas.'
    : 'No se podrán registrar ni borrar entradas ni ventas hasta que la desbloquees.';
  if (!confirm(`¿Quieres ${accion} la ${jornada}?\n\n${detalle}`)) return;
  try {
    await bloquearJornada(jornada, !bloqueada);
  } catch {
    alert('No se pudo cambiar el estado de la jornada. Solo un admin puede hacerlo.');
  }
}

function rellenarSelectJornadaActual() {
  const sel = $('#jornada-actual-sel');
  if (!sel) return;
  const partidos = getPartidos();
  const labels = getPartidosLabel();
  sel.innerHTML =
    '<option value="">— Selecciona jornada —</option>' +
    partidos
      .map((p, i) => `<option value="${esc(p)}">${esc(labels[i])}</option>`)
      .join('');
}

async function guardarJornadaActual() {
  const sel = $('#jornada-actual-sel');
  const jornada = sel?.value;
  if (!jornada) return alert('Selecciona una jornada.');
  if (
    !confirm(
      `¿Marcar "${jornada}" como la jornada actual?\n\nA partir de ahora los porteros (control de acceso) solo podrán escanear en ella.`,
    )
  )
    return;
  try {
    await fijarJornadaActual(jornada);
    alert('Jornada actual actualizada.');
  } catch {
    alert('No se pudo guardar. Solo un admin puede hacerlo.');
  }
}

/** Refresca los botones y avisos de bloqueo en escáner y taquilla. */
export function render() {
  actualizar('scanner', state.partidoScanner);
  actualizar('taquilla', state.partidoTaquilla);
  const bloqueJornadaActual = $('#bloque-jornada-actual');
  if (bloqueJornadaActual)
    bloqueJornadaActual.style.display = esAdmin() ? 'block' : 'none';
  const actualLabel = $('#jornada-actual-label');
  if (actualLabel) {
    actualLabel.textContent = state.jornadaActual
      ? `Jornada actual: ${state.jornadaActual}`
      : 'Jornada actual: sin fijar';
  }
}

function actualizar(panel, jornada) {
  const btn = $(`#btn-bloqueo-${panel}`);
  const aviso = $(`#aviso-bloqueada-${panel}`);
  if (!btn) return;
  if (!jornada) {
    btn.style.display = 'none';
    if (aviso) aviso.style.display = 'none';
    return;
  }
  const bloqueada = estaBloqueada(jornada);
  btn.style.display = esAdmin() ? 'inline-block' : 'none';
  btn.textContent = bloqueada ? '🔓 Desbloquear jornada' : '🔒 Cerrar jornada';
  btn.className = bloqueada ? 'btn btn-primary' : 'btn btn-danger';
  if (aviso) aviso.style.display = bloqueada ? 'block' : 'none';
}
