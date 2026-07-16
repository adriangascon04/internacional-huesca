// ============================================================================
//  src/utils/format.js  ·  Formateo de fechas, horas y números (es-ES).
// ============================================================================
export const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '—');
export const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES') : '—');
export const euros = (n) => `${Number(n || 0).toLocaleString('es-ES')} €`;

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
