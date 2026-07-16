// ============================================================================
//  src/utils/sanitize.js
//  Escapado de HTML para TODO dato de usuario que se inyecte con innerHTML.
//  Corrige la inyección de HTML / XSS almacenado (Upgrades #10): antes se hacía
//  innerHTML=`...${s.nombre}...` sin escapar (escáner, previsualización de QR).
// ============================================================================
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa una cadena para insertarla de forma segura como texto en HTML. */
export const esc = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => MAPA[c]);

/**
 * Tag de plantilla: escapa automáticamente las interpolaciones.
 * Uso:  el.innerHTML = safe`Hola ${nombreUsuario}`;
 */
export function safe(strings, ...values) {
  return strings.reduce(
    (acc, str, i) => acc + str + (i < values.length ? esc(values[i]) : ''),
    '',
  );
}
