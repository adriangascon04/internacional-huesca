// ============================================================================
//  src/services/taquilla.service.js  ·  Venta de entradas de taquilla.
// ============================================================================
import * as repo from '../repositories/taquilla.repository.js';
import { PRECIOS_TAQUILLA } from '../config/app.config.js';
import { session } from '../core/session.js';

/** Vende una entrada. El contador lo incrementa el servidor (atómico). */
export async function venderEntrada(jornadaKey, tipo /* 'general' | 'menor' */) {
  if (!PRECIOS_TAQUILLA[tipo]) throw new Error(`Tipo de entrada desconocido: ${tipo}`);
  const venta = {
    tipo,
    hora: new Date().toISOString(),
    vendidoPor: session.email ?? null, // auditoría: quién cobró
  };
  await repo.sumarVenta(jornadaKey, tipo, venta);
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

export const recaudacion = (d = {}) =>
  (d.general || 0) * PRECIOS_TAQUILLA.general + (d.menor || 0) * PRECIOS_TAQUILLA.menor;
