// ============================================================================
//  src/ui/tarifas.view.js
//  Recordatorio de precios visible mientras se cobra, para que nadie tenga que
//  saberse las tarifas de memoria.
//
//  Se pinta SIEMPRE desde la configuración y desde los precios reales del
//  partido: antes era texto fijo en index.html, así que en cuanto alguien
//  cambiaba un precio el cartel mentía. Un único módulo para las dos pantallas
//  (alta de socios y taquilla) para no volver a tener dos listas que cuadrar.
// ============================================================================
import { esc } from '../utils/sanitize.js';
import { euros } from '../utils/format.js';
import {
  TIPOS_ABONO,
  METODOS_PAGO,
  nombreAbono,
  tipoEntradaPorId,
} from '../config/app.config.js';

/** "Bizum, TPV o Efectivo" a partir de la lista de métodos configurada. */
const metodosEnTexto = () =>
  METODOS_PAGO.length > 1
    ? `${METODOS_PAGO.slice(0, -1).join(', ')} o ${METODOS_PAGO.at(-1)}`
    : METODOS_PAGO[0] || '—';

/** Una tarifa: "Abono Normal — 95 €" (o "gratis" cuando el precio es 0). */
const fila = (nombre, precio, nota) =>
  `<li><span>${esc(nombre)}</span> <strong>${precio > 0 ? euros(precio) : 'gratis'}</strong>${
    nota ? ` <small>(${esc(nota)})</small>` : ''
  }</li>`;

const lista = (filas) => `<ul class="tarifas">${filas.join('')}</ul>`;

/** Precios de los abonos, para la pantalla de alta de socios. */
export function pintarTarifasAbonos(el) {
  if (!el) return;
  el.innerHTML =
    `<strong>Precios de los abonos</strong>` +
    lista(TIPOS_ABONO.map((t) => fila(nombreAbono(t.id), t.precio))) +
    `<small>Pago: ${esc(metodosEnTexto())}. El importe se puede ajustar en esta alta
     concreta sin cambiar la tarifa general.</small>`;
}

/**
 * Precios de las entradas del partido seleccionado. Recibe las tarifas ya
 * resueltas (`preciosDePartido`), de modo que refleja el precio de ESE partido
 * y no el general, y aparecen automáticamente los tipos nuevos.
 * @param {HTMLElement} el
 * @param {Record<string, number>} precios
 */
export function pintarTarifasEntradas(el, precios = {}) {
  if (!el) return;
  const filas = Object.entries(precios).map(([tipo, precio]) => {
    const def = tipoEntradaPorId(tipo);
    return fila(def?.nombre || tipo, Number(precio), def?.nota);
  });
  el.innerHTML =
    `<strong>Precios de este partido</strong>` +
    (filas.length ? lista(filas) : '<p class="nota">Selecciona un partido.</p>') +
    `<small>Pago: ${esc(metodosEnTexto())}. El precio se puede cambiar para una
     persona concreta (invitación, descuento o suplemento) y las estadísticas
     registran el importe realmente cobrado.</small>`;
}
