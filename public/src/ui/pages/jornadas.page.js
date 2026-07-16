// ============================================================================
//  src/ui/pages/jornadas.page.js
//  Bloqueo/desbloqueo de jornadas (cierre de acta). Solo admin.
//  Afecta a escáner y taquilla: una jornada cerrada no admite cambios.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { state, estaBloqueada } from '../../core/state.js';
import { bloquearJornada } from '../../repositories/jornadas.repository.js';
import { esAdmin } from '../../services/roles.service.js';

export function initJornadas() {
  on($('#btn-bloqueo-scanner'), 'click', () => toggle(state.partidoScanner));
  on($('#btn-bloqueo-taquilla'), 'click', () => toggle(state.partidoTaquilla));
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

/** Refresca los botones y avisos de bloqueo en escáner y taquilla. */
export function render() {
  actualizar('scanner', state.partidoScanner);
  actualizar('taquilla', state.partidoTaquilla);
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
