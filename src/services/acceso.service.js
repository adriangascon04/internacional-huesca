// ============================================================================
//  src/services/acceso.service.js
//  Validación de accesos por QR (escáner). Un registro por socio y jornada.
//  El renderizado del resultado se hace con `safe`/`esc` (Upgrades #10, XSS).
// ============================================================================
import * as entradasRepo from '../repositories/entradas.repository.js';
import { QR_PREFIX, QR_SEPARADOR, QR_ACEPTA_LEGACY } from '../config/app.config.js';
import { getSocios } from './socios.service.js';

/**
 * Descompone el texto de un QR en { id, token }.
 *   "HUESCA:123:A7K9..." -> { id:'123', token:'A7K9...' }   (v2)
 *   "HUESCA:123"         -> { id:'123', token:'' }          (v1, carnet viejo)
 *   "123"                -> { id:'123', token:'' }          (tecleado a mano)
 * Insensible a mayúsculas: antes comprobaba el prefijo en mayúsculas pero
 * recortaba sobre la cadena original, así que "huesca:5" se colaba entero
 * y el socio salía como desconocido.
 */
export function parseQr(raw) {
  const texto = String(raw ?? '').trim();
  const cuerpo = texto.toUpperCase().startsWith(QR_PREFIX)
    ? texto.slice(QR_PREFIX.length).trim()
    : texto;
  const [id = '', token = ''] = cuerpo.split(QR_SEPARADOR);
  return { id: id.trim(), token: token.trim() };
}

/**
 * ¿Es aceptable el token que trae este QR? Exportada para poder probarla: es
 * la decisión de la que depende que un carnet falso entre o no.
 * @param {object} [opciones]
 * @param {boolean} [opciones.manual] Lo teclea el personal: no hay QR.
 * @param {boolean} [opciones.aceptaLegacy] Admitir carnets v1 sin token.
 * @returns {null|'no_coincide'|'sin_token'} null si el acceso puede seguir.
 */
export function comprobarToken(
  socio,
  token,
  { manual = false, aceptaLegacy = QR_ACEPTA_LEGACY } = {},
) {
  // Alta manual: la teclea el personal, que está viendo a la persona. No hay
  // QR que validar y es la vía de escape cuando un carnet no lee.
  if (manual) return null;
  if (token) return token === socio?.tokenQR ? null : 'no_coincide';
  // Carnet v1, sin token.
  return aceptaLegacy ? null : 'sin_token';
}

/**
 * Procesa un escaneo. Devuelve un resultado tipado (la UI decide cómo pintarlo).
 * @param {object} [opciones]
 * @param {boolean} [opciones.manual] true si lo teclea el personal (no hay QR).
 * @returns {{estado:'sin_jornada'|'bloqueada'|'desconocido'|'qr_invalido'|'repetido'|'valido', socio?, hora?}}
 */
export async function procesarAcceso(
  rawId,
  jornadaKey,
  jornadaBloqueada,
  { manual = false } = {},
) {
  const { id, token } = parseQr(rawId);
  if (!jornadaKey) return { estado: 'sin_jornada' };
  if (jornadaBloqueada) return { estado: 'bloqueada' };
  if (!id) return { estado: 'desconocido', id };

  const socio = getSocios().find((s) => s.id === id && s.activo !== false);
  if (!socio) return { estado: 'desconocido', id };

  const motivo = comprobarToken(socio, token, { manual });
  if (motivo) return { estado: 'qr_invalido', socio, id, motivo };

  // Comprobación de repetido: lectura previa. Ojo, no es atómica -> dos
  // escaneos del MISMO carnet en el mismo instante podrían pasar los dos.
  // Es aceptable: el riesgo real (perder registros de otros socios) ya está
  // resuelto porque la escritura ya no reemplaza el documento entero.
  const snap = await entradasRepo.obtenerEntradas(jornadaKey);
  const data = snap.exists() ? snap.data() : {};
  if (data[id]) return { estado: 'repetido', socio, hora: data[id] };

  const ahora = new Date().toISOString();
  await entradasRepo.registrarEntrada(jornadaKey, id, ahora);
  return { estado: 'valido', socio, hora: ahora };
}

/** Borra el registro de acceso de un socio en una jornada. */
export const borrarAcceso = (id, jornadaKey) =>
  entradasRepo.borrarEntrada(jornadaKey, id);
