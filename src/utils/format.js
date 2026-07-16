// ============================================================================
//  src/utils/format.js  ·  Formateo de fechas, horas y números (es-ES).
// ============================================================================
export const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '—');
export const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES') : '—');
export const euros = (n) => `${Number(n || 0).toLocaleString('es-ES')} €`;

/** Hora corta "20:47" para tablas y gráficos, donde los segundos estorban. */
export const horaCorta = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '—';

/**
 * Minutos -> "1h 52min". Un tiempo negativo (relojes descuadrados entre dos
 * puertas, o un fichaje corregido a mano) se muestra como '—' en vez de un
 * "-3min" que solo confunde a quien lo lee.
 */
export function duracion(minutos) {
  // El null va aparte: Number(null) es 0, así que un socio sin salida fichada
  // saldría como que estuvo "0min" dentro en vez de como desconocido.
  if (minutos === null || minutos === undefined) return '—';
  const m = Number(minutos);
  if (!Number.isFinite(m) || m < 0) return '—';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${h}h ${resto}min` : `${h}h`;
}

/** Años de antigüedad desde una fecha de alta (texto legible). */
export function antiguedad(iso) {
  if (!iso) return '—';
  const alta = new Date(iso);
  const hoy = new Date();
  let anios = hoy.getFullYear() - alta.getFullYear();
  const noCumplido =
    hoy.getMonth() < alta.getMonth() ||
    (hoy.getMonth() === alta.getMonth() && hoy.getDate() < alta.getDate());
  if (noCumplido) anios--;
  anios = Math.max(0, anios);
  const txt = anios === 0 ? 'menos de 1 año' : anios === 1 ? '1 año' : `${anios} años`;
  return `${fecha(iso)} (${txt})`;
}
