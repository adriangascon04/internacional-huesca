// ============================================================================
//  src/services/taquilla.service.js  ·  Venta de entradas de taquilla.
// ============================================================================
import * as repo from '../repositories/taquilla.repository.js';
import { PRECIOS_TAQUILLA, tipoEntradaPorId } from '../config/app.config.js';
import { session } from '../core/session.js';

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
  if (Array.isArray(d.historial) && d.historial.length) return d.historial;
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
