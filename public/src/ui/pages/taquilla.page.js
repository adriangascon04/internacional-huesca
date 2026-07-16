// ============================================================================
//  src/ui/pages/taquilla.page.js  ·  Venta de entradas en taquilla.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros } from '../../utils/format.js';
import { state, estaBloqueada } from '../../core/state.js';
import {
  getPartidos,
  getPartidosLabel,
  PRECIOS_TAQUILLA,
} from '../../config/app.config.js';
import * as taquilla from '../../services/taquilla.service.js';

export function initTaquilla() {
  const partidos = getPartidos();
  const labels = getPartidosLabel();
  $('#taquilla-partido-sel').innerHTML =
    '<option value="">— Selecciona jornada —</option>' +
    partidos
      .map((p, i) => `<option value="${esc(p)}">${esc(labels[i])}</option>`)
      .join('');

  // Precios visibles desde config (antes escritos a mano en el HTML).
  $('#precio-general').textContent = euros(PRECIOS_TAQUILLA.general);
  $('#precio-menor').textContent = euros(PRECIOS_TAQUILLA.menor);

  on($('#taquilla-partido-sel'), 'change', () => {
    state.partidoTaquilla = $('#taquilla-partido-sel').value;
    render();
  });
  on($('#btn-vender-general'), 'click', () => vender('general'));
  on($('#btn-vender-menor'), 'click', () => vender('menor'));
  on($('#btn-deshacer-venta'), 'click', async () => {
    const j = state.partidoTaquilla;
    if (estaBloqueada(j)) return alert('Jornada cerrada.');
    await taquilla.deshacerVenta(j);
  });
}

async function vender(tipo) {
  const j = state.partidoTaquilla;
  if (!j) return alert('Selecciona una jornada antes de vender entradas.');
  if (estaBloqueada(j)) return alert('Esta jornada está cerrada.');
  await taquilla.venderEntrada(j, tipo);
}

export function render() {
  const j = state.partidoTaquilla;
  const d = state.taquilla[j] || { general: 0, menor: 0, historial: [] };
  $('#contador-general').textContent = d.general || 0;
  $('#contador-menor').textContent = d.menor || 0;

  const resumen = $('#taquilla-resumen');
  const btnDeshacer = $('#btn-deshacer-venta');
  if (!j) {
    resumen.innerHTML = '';
    btnDeshacer.style.display = 'none';
    return;
  }

  const total = (d.general || 0) + (d.menor || 0);
  const labels = getPartidosLabel();
  const label = labels[getPartidos().indexOf(j)] || j;
  resumen.innerHTML = `
    <div class="stat"><div class="stat-n">${total}</div><div class="stat-l">Entradas vendidas — ${esc(label)}</div></div>
    <div class="stat"><div class="stat-n">${euros(taquilla.recaudacion(d))}</div><div class="stat-l">Recaudación de taquilla</div></div>`;
  btnDeshacer.style.display = d.historial?.length ? 'inline-block' : 'none';
}
