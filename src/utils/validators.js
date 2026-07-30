// ============================================================================
//  src/utils/validators.js
//  Validación de entradas (Upgrades #7). Antes: email con regex laxa y DNI
//  sin validar (solo "no vacío"). Estas funciones se usan en el service de
//  socios y en el importador de Excel.
// ============================================================================
import { TIPO_DOC_DNI, TIPOS_DOCUMENTO } from '../config/app.config.js';

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

/** Quita espacios y guiones: la gente teclea "AB-123 456" y es el mismo doc. */
export const normalizarDoc = (valor) =>
  String(valor ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '');

/**
 * Pasaporte. No hay letra de control que comprobar y cada país usa su formato,
 * así que solo se exige forma plausible: 5–15 caracteres alfanuméricos y al
 * menos un dígito (descarta que alguien escriba "PASAPORTE" en la casilla).
 */
export function esPasaporteValido(valor) {
  const v = normalizarDoc(valor);
  return /^[A-Z0-9]{5,15}$/.test(v) && /\d/.test(v);
}

/** "Otro" (documento extranjero, permiso de residencia…): mínimo exigible. */
export function esOtroDocValido(valor) {
  return /^[A-Z0-9]{4,20}$/.test(normalizarDoc(valor));
}

/**
 * Valida el documento según su tipo. Solo el DNI/NIE se comprueba de verdad
 * (letra de control); en el resto no hay nada que comprobar y el club asume
 * el dato tal como se teclea. El tipo desconocido o ausente se trata como
 * DNI/NIE: es lo que eran todos los socios anteriores al selector.
 */
export function esDocumentoValido(valor, tipoDoc = TIPO_DOC_DNI) {
  if (tipoDoc === 'Pasaporte') return esPasaporteValido(valor);
  if (tipoDoc === 'Otro') return esOtroDocValido(valor);
  return esDniValido(valor);
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

// El segundo apellido NO entra aquí: mucha gente no tiene (extranjeros, y
// españoles con un solo apellido registral). Exigirlo obligaba a inventárselo.
const CAMPOS_OBLIGATORIOS = ['nombre', 'ap1', 'dni', 'fnac', 'tipo'];

const ETIQUETA_CAMPO = {
  nombre: 'Nombre',
  ap1: 'Primer apellido',
  dni: 'Nº de documento',
  fnac: 'Fecha de nacimiento',
  tel: 'Teléfono',
  email: 'Email',
  tipo: 'Tipo de abono',
};

/** Valida el objeto socio completo. Devuelve [] si es válido o lista de errores. */
export function validarSocio(datos) {
  const errores = [];
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!datos?.[campo])
      errores.push(`El campo "${ETIQUETA_CAMPO[campo]}" es obligatorio.`);
  }

  const tipoDoc = datos?.tipoDoc || TIPO_DOC_DNI;
  if (!TIPOS_DOCUMENTO.includes(tipoDoc)) {
    errores.push(`Tipo de documento desconocido: "${tipoDoc}".`);
  } else if (datos?.dni && !esDocumentoValido(datos.dni, tipoDoc)) {
    errores.push(
      tipoDoc === TIPO_DOC_DNI
        ? 'El DNI/NIE no es válido (revisa la letra).'
        : `El nº de ${tipoDoc.toLowerCase()} no es válido.`,
    );
  }

  if (datos?.fnac && !esFechaValida(datos.fnac))
    errores.push('La fecha de nacimiento no es válida (formato AAAA-MM-DD).');
  if (datos?.email && !esEmailValido(datos.email)) errores.push('El email no es válido.');
  if (datos?.tel && !esTelefonoValido(datos.tel))
    errores.push('El teléfono no es válido.');
  return errores;
}
