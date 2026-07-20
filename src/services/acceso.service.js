// ============================================================================
//  src/services/acceso.service.js
//  Validación de accesos por QR (escáner). Un registro por socio y jornada.
//  El renderizado del resultado se hace con `safe`/`esc` (Upgrades #10, XSS).
//
//  Solo hay ENTRADA: no existe mecánica de salida. Un socio que ya ha
//  fichado su entrada en una jornada no puede volver a entrar en ella.
//
//  IMPORTANTE — los dos números del socio:
//    · El QR y el teclado manual hablan siempre de nº de CARNET (o de DNI,
//      como vía de escape manual — ver `procesarAcceso`).
//    · Los fichajes se guardan bajo el id INTERNO del socio, que no cambia
//      nunca. Por eso renumerar los carnets no descoloca el historial.
//
//  QR y temporada: el QR lleva la temporada en la que se emitió. Si no
//  coincide con la temporada activa, se rechaza aunque el token sea correcto:
//  así un carnet de una temporada anterior no vale aunque, por lo que sea,
//  no se le hubiera regenerado el token al renumerar.
// ============================================================================
import * as entradasRepo from '../repositories/entradas.repository.js';
import {
  QR_PREFIX,
  QR_SEPARADOR,
  QR_ACEPTA_LEGACY,
  TEMPORADA_ACTUAL,
  jKey,
} from '../config/app.config.js';
import { porCarnet, porDni } from './socios.service.js';

/**
 * Descompone el texto de un QR en { id, token, temporada }.
 *   "HUESCA:123:A7K9...:2026-27" -> { id:'123', token:'A7K9...', temporada:'2026-27' } (v3)
 *   "HUESCA:123:A7K9..."         -> { id:'123', token:'A7K9...', temporada:'' }        (v2, sin temporada)
 *   "HUESCA:123"                 -> { id:'123', token:'', temporada:'' }               (v1, carnet viejo)
 *   "123"                        -> { id:'123', token:'', temporada:'' }               (tecleado a mano)
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
  const [id = '', token = '', temporada = ''] = cuerpo.split(QR_SEPARADOR);
  return { id: id.trim(), token: token.trim(), temporada: temporada.trim() };
}

/**
 * ¿Es aceptable el token que trae este QR? Exportada para poder probarla: es
 * la decisión de la que depende que un carnet falso (o de otra temporada)
 * entre o no.
 * @param {object} [opciones]
 * @param {boolean} [opciones.manual] Lo teclea el personal: no hay QR.
 * @param {boolean} [opciones.aceptaLegacy] Admitir carnets v1 sin token.
 * @returns {null|'no_coincide'|'sin_token'|'temporada_anterior'} null si el acceso puede seguir.
 */
export function comprobarToken(
  socio,
  token,
  temporada,
  {
    manual = false,
    aceptaLegacy = QR_ACEPTA_LEGACY,
    temporadaActual = jKey(TEMPORADA_ACTUAL),
  } = {},
) {
  // Alta manual: la teclea el personal, que está viendo a la persona. No hay
  // QR que validar y es la vía de escape cuando un carnet no lee.
  if (manual) return null;
  if (!token) return aceptaLegacy ? null : 'sin_token';
  if (token !== socio?.tokenQR) return 'no_coincide';
  // El QR es de un formato anterior a que se guardara la temporada: se acepta
  // (no hay forma de saber de qué temporada es), el token ya es la protección.
  if (!temporada) return null;
  return temporada === temporadaActual ? null : 'temporada_anterior';
}

/**
 * Procesa un escaneo. Devuelve un resultado tipado (la UI decide cómo pintarlo).
 * @param {object} [opciones]
 * @param {boolean} [opciones.manual] true si lo teclea el personal (no hay QR).
 * @returns {{estado:string, socio?, hora?, id?, motivo?}}
 *   estados: sin_jornada | bloqueada | desconocido | qr_invalido | repetido | valido
 */
export async function procesarAcceso(
  rawId,
  jornadaKey,
  jornadaBloqueada,
  { manual = false } = {},
) {
  const { id, token, temporada } = parseQr(rawId);
  if (!jornadaKey) return { estado: 'sin_jornada' };
  if (jornadaBloqueada) return { estado: 'bloqueada' };
  if (!id) return { estado: 'desconocido', id };

  // Manual: el nº de carnet es lo habitual, pero si no matchea (o no es un
  // número) se prueba como DNI/NIE — fallback cuando el lector no funciona y
  // el portero no tiene a mano el nº de carnet de la persona.
  const socio = manual ? porCarnet(id) || porDni(id) : porCarnet(id);
  if (!socio) return { estado: 'desconocido', id };

  const motivo = comprobarToken(socio, token, temporada, { manual });
  if (motivo) return { estado: 'qr_invalido', socio, id, motivo };

  return ficharEntrada(socio, jornadaKey);
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

/** Borra el registro de entrada de un socio en una jornada. */
export async function borrarAcceso(id, jornadaKey) {
  await entradasRepo.borrarEntrada(jornadaKey, id);
}
