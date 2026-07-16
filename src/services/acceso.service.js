// ============================================================================
//  src/services/acceso.service.js
//  Validación de accesos por QR (escáner). Un registro por socio y jornada.
//  El renderizado del resultado se hace con `safe`/`esc` (Upgrades #10, XSS).
//
//  Dos fichajes por socio y jornada: ENTRADA y SALIDA. La salida es opcional
//  (quien se va sin fichar simplemente no tiene hora de salida) y de ella salen
//  las estadísticas de afluencia.
//
//  IMPORTANTE — los dos números del socio:
//    · El QR y el teclado manual hablan siempre de nº de CARNET.
//    · Los fichajes se guardan bajo el id INTERNO del socio, que no cambia
//      nunca. Por eso renumerar los carnets no descoloca el historial.
// ============================================================================
import * as entradasRepo from '../repositories/entradas.repository.js';
import * as salidasRepo from '../repositories/salidas.repository.js';
import { QR_PREFIX, QR_SEPARADOR, QR_ACEPTA_LEGACY } from '../config/app.config.js';
import { porCarnet } from './socios.service.js';

export const MODO_ENTRADA = 'entrada';
export const MODO_SALIDA = 'salida';

/**
 * Descompone el texto de un QR en { id, token }.
 *   "HUESCA:123:A7K9..." -> { id:'123', token:'A7K9...' }   (v2)
 *   "HUESCA:123"         -> { id:'123', token:'' }          (v1, carnet viejo)
 *   "123"                -> { id:'123', token:'' }          (tecleado a mano)
 * `id` es el nº de CARNET, no el id interno del socio.
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

/** Minutos entre dos ISO. Negativo si están del revés (reloj mal, dos puertas). */
export const minutosEntre = (isoA, isoB) =>
  Math.round((new Date(isoB) - new Date(isoA)) / 60000);

/**
 * Procesa un escaneo. Devuelve un resultado tipado (la UI decide cómo pintarlo).
 * @param {object} [opciones]
 * @param {boolean} [opciones.manual] true si lo teclea el personal (no hay QR).
 * @param {'entrada'|'salida'} [opciones.modo]
 * @returns {{estado:string, socio?, hora?, id?, motivo?, minutos?}}
 *   estados: sin_jornada | bloqueada | desconocido | qr_invalido
 *            | repetido | valido                         (modo entrada)
 *            | sin_entrada | salida_repetida | salida_ok (modo salida)
 */
export async function procesarAcceso(
  rawId,
  jornadaKey,
  jornadaBloqueada,
  { manual = false, modo = MODO_ENTRADA } = {},
) {
  const { id, token } = parseQr(rawId);
  if (!jornadaKey) return { estado: 'sin_jornada' };
  if (jornadaBloqueada) return { estado: 'bloqueada' };
  if (!id) return { estado: 'desconocido', id };

  const socio = porCarnet(id);
  if (!socio) return { estado: 'desconocido', id };

  const motivo = comprobarToken(socio, token, { manual });
  if (motivo) return { estado: 'qr_invalido', socio, id, motivo };

  return modo === MODO_SALIDA
    ? ficharSalida(socio, jornadaKey)
    : ficharEntrada(socio, jornadaKey);
}

async function ficharEntrada(socio, jornadaKey) {
  // Comprobación de repetido: lectura previa. Ojo, no es atómica -> dos
  // escaneos del MISMO carnet en el mismo instante podrían pasar los dos.
  // Es aceptable: el riesgo real (perder registros de otros socios) ya está
  // resuelto porque la escritura ya no reemplaza el documento entero.
  const snap = await entradasRepo.obtenerEntradas(jornadaKey);
  const data = snap.exists() ? snap.data() : {};
  if (data[socio.id]) return { estado: 'repetido', socio, hora: data[socio.id] };

  const ahora = new Date().toISOString();
  await entradasRepo.registrarEntrada(jornadaKey, socio.id, ahora);
  return { estado: 'valido', socio, hora: ahora };
}

async function ficharSalida(socio, jornadaKey) {
  // Sin entrada previa no hay salida que registrar: o el portero tiene el modo
  // equivocado, o esta persona entró sin fichar. Avisar es más útil que grabar
  // una salida huérfana que luego ensucia las estadísticas de afluencia.
  const entradasSnap = await entradasRepo.obtenerEntradas(jornadaKey);
  const entradas = entradasSnap.exists() ? entradasSnap.data() : {};
  const horaEntrada = entradas[socio.id];
  if (!horaEntrada) return { estado: 'sin_entrada', socio };

  const salidasSnap = await salidasRepo.obtenerSalidas(jornadaKey);
  const salidas = salidasSnap.exists() ? salidasSnap.data() : {};
  if (salidas[socio.id]) {
    return { estado: 'salida_repetida', socio, hora: salidas[socio.id] };
  }

  const ahora = new Date().toISOString();
  await salidasRepo.registrarSalida(jornadaKey, socio.id, ahora);
  return {
    estado: 'salida_ok',
    socio,
    hora: ahora,
    minutos: minutosEntre(horaEntrada, ahora),
  };
}

/** Borra el registro de acceso de un socio en una jornada (entrada y salida). */
export async function borrarAcceso(id, jornadaKey) {
  await entradasRepo.borrarEntrada(jornadaKey, id);
  // La salida puede no existir; si el documento de la jornada tampoco, el
  // updateDoc revienta y no pasa nada: no había nada que borrar.
  try {
    await salidasRepo.borrarSalida(jornadaKey, id);
  } catch {
    /* sin salida registrada */
  }
}
