// ============================================================================
//  src/services/taquilla.service.js  ·  Venta de entradas de taquilla.
// ============================================================================
import * as repo from '../repositories/taquilla.repository.js';
import { PRECIOS_TAQUILLA, tipoEntradaPorId } from '../config/app.config.js';
import { session } from '../core/session.js';

/**
 * Identificador de una venta. Sin él, dos ventas del mismo tipo, precio y
 * método cobradas en el mismo milisegundo son objetos IDÉNTICOS, y el
 * `arrayRemove` con el que se anula una borra las dos: se pedía corregir un
 * error y desaparecía también una venta buena. Es además lo que permite
 * anular una venta concreta y no solo la última.
 */
const nuevoIdVenta = () =>
  `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Vende una entrada. El contador lo incrementa el servidor (atómico). */
export async function venderEntrada(
  jornadaKey,
  tipo,
  { precio, metodoPago, nombreTipo } = {},
) {
  const tipoNormalizado = String(tipo || '').trim();
  if (!jornadaKey || !tipoNormalizado)
    throw new Error('Indica el partido y el tipo de entrada');
  const definido = tipoEntradaPorId(tipoNormalizado);
  // Un precio en blanco cae a la tarifa del tipo, NO a 0 €: el '' de un
  // <input> vacío pasaba por `Number('')` y regalaba la entrada. Un 0
  // explícito sí es válido — es como se cobra una invitación.
  const indicado = String(precio ?? '').trim();
  const importe = indicado === '' ? Number(definido?.precio ?? 0) : Number(indicado);
  if (!Number.isFinite(importe) || importe < 0) throw new Error('El precio no es válido');
  const venta = {
    id: nuevoIdVenta(),
    tipo: tipoNormalizado,
    // Se persiste el nombre para que un tipo renombrado en el futuro siga
    // siendo inteligible en el histórico y en los informes.
    nombreTipo: String(nombreTipo || definido?.nombre || tipoNormalizado).trim(),
    precio: importe,
    metodoPago: metodoPago || null,
    hora: new Date().toISOString(),
    vendidoPor: session.email ?? null, // auditoría: quién cobró
  };
  await repo.sumarVenta(jornadaKey, tipoNormalizado, venta);
  return venta;
}

/** Las ventas de una jornada ordenadas de la más reciente a la más antigua. */
export const ventasOrdenadas = (d = {}) =>
  [...ventasDe(d)].sort((a, b) =>
    String(b.hora || '').localeCompare(String(a.hora || '')),
  );

/**
 * Anula UNA venta concreta. Se relee el documento del servidor y se borra el
 * objeto tal y como está guardado: `arrayRemove` compara por valor exacto, así
 * que pasarle la copia que tiene el navegador en pantalla (que puede ir un
 * instante por detrás) no borraría nada.
 *
 * La venta anulada desaparece del historial, y las estadísticas se calculan
 * SIEMPRE a partir del historial: en cuanto se anula deja de contar, tanto en
 * el número de entradas como en la recaudación.
 *
 * @returns {Promise<object|null>} la venta anulada, o null si ya no estaba.
 */
export async function anularVenta(jornadaKey, ventaId) {
  const snap = await repo.obtenerTaquilla(jornadaKey);
  if (!snap.exists()) return null;
  const historial = snap.data().historial;
  if (!Array.isArray(historial)) return null;
  const venta = historial.find((v) => v?.id === ventaId);
  if (!venta) return null;
  await repo.restarVenta(jornadaKey, venta.tipo, venta);
  return venta;
}

/**
 * Deshace la última venta. Lee el historial para saber cuál es la última y la
 * elimina por valor exacto con arrayRemove -> si otro taquillero ha vendido
 * mientras tanto, se borra la que corresponde y no "la última que yo creía".
 */
export async function deshacerVenta(jornadaKey) {
  const snap = await repo.obtenerTaquilla(jornadaKey);
  if (!snap.exists()) return null;
  const historial = snap.data().historial;
  if (!historial?.length) return null;
  // El historial no está garantizado en orden: ordenamos por hora.
  const ultima = [...historial]
    .sort((a, b) => String(a.hora).localeCompare(b.hora))
    .pop();
  await repo.restarVenta(jornadaKey, ultima.tipo, ultima);
  return ultima;
}

export function ventasDe(d = {}) {
  // Si el documento TIENE historial, el historial es la verdad — aunque esté
  // vacío. Un `[]` significa "no queda ninguna venta", normalmente porque se
  // han anulado todas; antes se confundía con "documento antiguo sin historial"
  // y se caía a los contadores `general`/`menor`, así que anular la última
  // venta de una jornada la hacía reaparecer en las estadísticas.
  if (Array.isArray(d.historial)) return d.historial;
  // Documentos anteriores no guardaban el importe individual: se conserva su
  // significado usando las tarifas que estaban vigentes entonces.
  return [
    ...Array.from({ length: d.general || 0 }, () => ({
      tipo: 'general',
      nombreTipo: 'Entrada general',
      precio: PRECIOS_TAQUILLA.general,
      legacy: true,
    })),
    ...Array.from({ length: d.menor || 0 }, () => ({
      tipo: 'menor',
      nombreTipo: 'Entrada infantil',
      precio: PRECIOS_TAQUILLA.menor,
      legacy: true,
    })),
  ];
}
export const recaudacion = (d = {}) =>
  ventasDe(d).reduce((total, v) => total + Number(v.precio || 0), 0);
