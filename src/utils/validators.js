// ============================================================================
//  src/utils/validators.js
//  Validación de entradas (Upgrades #7). Antes: email con regex laxa y DNI
//  sin validar (solo "no vacío"). Estas funciones se usan en el service de
//  socios y en el importador de Excel.
// ============================================================================

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Valida DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra). */
export function esDniValido(valor) {
  if (!valor) return false;
  let dni = String(valor).trim().toUpperCase();
  const nie = { X: '0', Y: '1', Z: '2' };
  if (/^[XYZ]/.test(dni)) dni = nie[dni[0]] + dni.slice(1);
  if (!/^\d{8}[A-Z]$/.test(dni)) return false;
  const numero = parseInt(dni.slice(0, 8), 10);
  return LETRAS_DNI[numero % 23] === dni[8];
}

/** Validación de email algo más estricta que /\S+@\S+\.\S+/. */
export function esEmailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());
}

/**
 * Fecha en formato AAAA-MM-DD, real y no futura.
 * Antes solo se comprobaba "no vacío": el importador de Excel colaba números
 * de serie ("33970") o fechas imposibles ("2024-02-31") sin rechistar.
 */
export function esFechaValida(valor) {
  const s = String(valor ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Rechaza desbordes: new Date('2024-02-31') se convierte en 02/03.
  if (d.toISOString().slice(0, 10) !== s) return false;
  return d.getUTCFullYear() >= 1900 && d <= new Date();
}

/** Teléfono español: 9 dígitos (permite prefijo +34 y espacios). */
export function esTelefonoValido(valor) {
  const limpio = String(valor || '')
    .replace(/[\s+]/g, '')
    .replace(/^34/, '');
  return /^\d{9}$/.test(limpio);
}

/** Valida el objeto socio completo. Devuelve [] si es válido o lista de errores. */
export function validarSocio(datos) {
  const errores = [];
  const req = ['nombre', 'ap1', 'ap2', 'dni', 'fnac', 'tel', 'email', 'tipo'];
  for (const campo of req) {
    if (!datos?.[campo]) errores.push(`El campo "${campo}" es obligatorio.`);
  }
  if (datos?.dni && !esDniValido(datos.dni)) errores.push('El DNI/NIE no es válido.');
  if (datos?.fnac && !esFechaValida(datos.fnac))
    errores.push('La fecha de nacimiento no es válida (formato AAAA-MM-DD).');
  if (datos?.email && !esEmailValido(datos.email)) errores.push('El email no es válido.');
  if (datos?.tel && !esTelefonoValido(datos.tel))
    errores.push('El teléfono no es válido.');
  return errores;
}
