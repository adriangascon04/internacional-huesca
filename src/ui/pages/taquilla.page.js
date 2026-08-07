import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros, horaCorta } from '../../utils/format.js';
import { state, estaBloqueada } from '../../core/state.js';
import { METODOS_PAGO } from '../../config/app.config.js';
import {
  etiquetaPartido,
  partidosDisponibles,
  preciosVendiblesDePartido,
  tiposDePartido,
} from '../../services/competiciones.service.js';
import * as taquilla from '../../services/taquilla.service.js';
import { pintarTarifasEntradas } from '../tarifas.view.js';

export function initTaquilla() {
  rellenarSelect();
  $('#taquilla-pago').innerHTML = METODOS_PAGO.map(
    (m) => `<option>${esc(m)}</option>`,
  ).join('');
  on($('#taquilla-partido-sel'), 'change', () => {
    state.partidoTaquilla = $('#taquilla-partido-sel').value;
    rellenarTipos();
    actualizarPrecio();
    render();
  });
  on($('#taquilla-tipo'), 'change', actualizarPrecio);
  on($('#btn-vender-entrada'), 'click', () => vender($('#taquilla-tipo').value));
  on($('#btn-deshacer-venta'), 'click', async () => {
    const j = state.partidoTaquilla;
    if (estaBloqueada(j)) return alert('Partido cerrado.');
    await taquilla.deshacerVenta(j);
  });
}

export function rellenarSelect() {
  const sel = $('#taquilla-partido-sel');
  if (!sel) return;
  const previo = sel.value;
  const partidos = partidosDisponibles(state.competiciones, [
    ...Object.keys(state.entradas),
    ...Object.keys(state.taquilla),
  ]);
  sel.innerHTML =
    '<option value="">— Selecciona partido —</option>' +
    partidos
      .map(
        (p) =>
          `<option value="${esc(p.id)}">${esc(`${p.competicion ? p.competicion + ' · ' : ''}${p.nombre}`)}</option>`,
      )
      .join('');
  sel.value = previo;
  state.partidoTaquilla = sel.value;
  rellenarTipos();
  actualizarPrecio();
}
function rellenarTipos() {
  const sel = $('#taquilla-tipo');
  if (!sel) return;
  const previo = sel.value;
  sel.innerHTML = tiposDePartido(state.competiciones, state.partidoTaquilla)
    .map((t) => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`)
    .join('');
  sel.value =
    previo && [...sel.options].some((o) => o.value === previo)
      ? previo
      : sel.options[0]?.value || '';
}
/**
 * Sincroniza el importe a cobrar y el recordatorio de tarifas con el partido y
 * el tipo elegidos. El precio queda EDITABLE: es la tarifa de partida, no una
 * imposición (invitación, descuento o suplemento se teclean encima).
 */
function actualizarPrecio() {
  const precios = preciosVendiblesDePartido(state.competiciones, state.partidoTaquilla);
  const input = $('#taquilla-precio');
  if (input) input.value = precios[$('#taquilla-tipo').value] ?? 0;
  pintarTarifasEntradas($('#tarifas-entradas'), state.partidoTaquilla ? precios : {});
}
async function vender(tipo) {
  const j = state.partidoTaquilla;
  if (!j) return alert('Selecciona un partido antes de vender entradas.');
  if (estaBloqueada(j)) return alert('Este partido está cerrado.');
  await taquilla.venderEntrada(j, tipo, {
    precio: $('#taquilla-precio').value,
    metodoPago: $('#taquilla-pago').value,
    nombreTipo: $('#taquilla-tipo').selectedOptions[0]?.textContent,
  });
}
export function render() {
  const j = state.partidoTaquilla;
  const d = state.taquilla[j] || { historial: [] };
  const resumen = $('#taquilla-resumen');
  const btnDeshacer = $('#btn-deshacer-venta');
  if (!j) {
    resumen.innerHTML = '';
    btnDeshacer.style.display = 'none';
    renderVentas([], j);
    return;
  }
  const ventas = taquilla.ventasDe(d);
  resumen.innerHTML = `<div class="stat"><div class="stat-n">${ventas.length}</div><div class="stat-l">Entradas vendidas — ${esc(etiquetaPartido(state.competiciones, j))}</div></div><div class="stat"><div class="stat-n">${euros(taquilla.recaudacion(d))}</div><div class="stat-l">Recaudación de taquilla</div></div>`;
  btnDeshacer.style.display = d.historial?.length ? 'inline-block' : 'none';
  renderVentas(taquilla.ventasOrdenadas(d), j);
}

/**
 * Lista de ventas del partido con un botón de anular en cada una.
 *
 * "Deshacer la última" no basta para corregir un error: en cuanto se cobran dos
 * entradas más, la equivocada ya no es la última y no había forma de quitarla.
 * Al anular, la venta sale del historial y deja de contar en las estadísticas
 * (asistentes y recaudación se calculan sobre ese mismo historial).
 *
 * Las ventas anteriores a que existiera el identificador de venta no se pueden
 * anular de una en una: se dicen expresamente en vez de enseñar un botón que no
 * haría nada.
 */
function renderVentas(ventas, jornada) {
  const cont = $('#taquilla-ventas');
  if (!cont) return;
  if (!jornada) {
    cont.innerHTML = '<p class="empty">Selecciona un partido para ver sus ventas.</p>';
    return;
  }
  if (!ventas.length) {
    cont.innerHTML = '<p class="empty">Todavía no se ha vendido ninguna entrada.</p>';
    return;
  }

  cont.innerHTML = `<table>
      <thead><tr><th>Hora</th><th>Tipo</th><th>Importe</th><th>Pago</th><th></th></tr></thead>
      <tbody>${ventas
        .map(
          (v) => `<tr>
        <td>${v.hora ? horaCorta(v.hora) : '—'}</td>
        <td>${esc(v.nombreTipo || v.tipo || '—')}</td>
        <td>${euros(v.precio)}</td>
        <td>${esc(v.metodoPago || '—')}</td>
        <td>${
          v.id
            ? `<button class="btn btn-danger" data-anular="${esc(v.id)}">Anular</button>`
            : '<span class="nota">venta antigua</span>'
        }</td>
      </tr>`,
        )
        .join('')}</tbody></table>`;

  cont.querySelectorAll('[data-anular]').forEach((el) =>
    on(el, 'click', async () => {
      if (estaBloqueada(jornada)) return alert('Este partido está cerrado.');
      if (
        !confirm(
          '¿Anular esta venta?\n\nDejará de contar en la recaudación y en el número de entradas de este partido.',
        )
      )
        return;
      el.disabled = true;
      try {
        const anulada = await taquilla.anularVenta(jornada, el.dataset.anular);
        if (!anulada) alert('Esa venta ya no existe: alguien la ha anulado antes.');
      } catch {
        alert('No se ha podido anular la venta. Revisa tus permisos y la conexión.');
      } finally {
        el.disabled = false;
      }
    }),
  );
}
