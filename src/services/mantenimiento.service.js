// ============================================================================
//  src/services/mantenimiento.service.js
//  Los dos reinicios de la aplicación. Ambos son irreversibles y ambos guardan
//  SIEMPRE una copia de seguridad antes de tocar nada: si la copia falla, no se
//  borra nada. No tiene sentido ejecutar a ciegas algo sin vuelta atrás.
//
//    1. reiniciarJornadas() — DATOS DE PARTIDO.
//       Borra los fichajes de la puerta y las ventas de taquilla de todas las
//       jornadas, y reabre las que estuvieran cerradas. Es el reinicio de
//       "empieza una temporada nueva": los socios y el calendario se quedan.
//
//    2. reiniciarTodo() — BORRÓN Y CUENTA NUEVA.
//       Lo anterior MÁS todos los socios. Es el reinicio de "se acabaron las
//       pruebas": deja la base de datos vacía de datos inventados para empezar
//       a dar de alta socios de verdad.
//
//  QUÉ NO TOCA NINGUNO DE LOS DOS, y por qué:
//    · competiciones — el calendario y los precios cuestan de montar y no son
//                      datos de prueba. Si además quieres cambiarlo, se edita
//                      desde su pestaña.
//    · usuarios      — borrarlos dejaría al club fuera de su propia aplicación.
//    · config        — la jornada actual sigue apuntando a un partido que
//                      existe; lo único que desaparece son sus datos.
//    · backups       — son justo la red de seguridad de esta operación.
//    · contadores    — el contador de nº de socio SOLO puede subir (lo impone
//                      firestore.rules). Aunque se borren todos los socios, el
//                      siguiente id interno seguirá por donde iba. Es
//                      deliberado: un id reutilizado es el viejo bug del "QR
//                      zombie". El nº de CARNET visible sí vuelve a empezar en
//                      el 1, porque se calcula sobre los socios que hay.
// ============================================================================
import * as entradasRepo from '../repositories/entradas.repository.js';
import * as taquillaRepo from '../repositories/taquilla.repository.js';
import * as jornadasRepo from '../repositories/jornadas.repository.js';
import * as sociosRepo from '../repositories/socios.repository.js';
import { crearBackup } from './backup.service.js';

/**
 * Qué se va a borrar, para poder enseñarlo ANTES de pedir la confirmación.
 * @returns {{jornadasConFichajes:number, fichajes:number,
 *            jornadasConVentas:number, ventas:number,
 *            jornadasCerradas:number, socios:number}}
 */
export function resumenReinicio({
  entradas = {},
  taquilla = {},
  jornadasBloqueadas = {},
  socios = [],
}) {
  const fichajes = Object.values(entradas).reduce(
    (total, jornada) => total + Object.keys(jornada || {}).length,
    0,
  );
  const ventas = Object.values(taquilla).reduce(
    (total, jornada) =>
      total + (Array.isArray(jornada?.historial) ? jornada.historial.length : 0),
    0,
  );
  return {
    jornadasConFichajes: Object.keys(entradas).length,
    fichajes,
    jornadasConVentas: Object.keys(taquilla).length,
    ventas,
    jornadasCerradas: Object.values(jornadasBloqueadas).filter(Boolean).length,
    socios: socios.length,
  };
}

/** ¿Hay algo que borrar? Evita anunciar un borrado que no va a borrar nada. */
export const hayDatosDePartido = (r) =>
  !!(r.jornadasConFichajes || r.jornadasConVentas || r.jornadasCerradas);

/**
 * Borra los datos de partido de todas las jornadas. Irreversible.
 * @returns {Promise<{copia:object, resumen:object}>}
 */
export async function reiniciarJornadas({
  entradas = {},
  taquilla = {},
  jornadasBloqueadas = {},
}) {
  const resumen = resumenReinicio({ entradas, taquilla, jornadasBloqueadas });

  // La copia va primero y sin capturar el error a propósito: si no se puede
  // guardar, que reviente aquí y no se borre nada.
  const copia = await crearBackup(entradas, taquilla);

  await borrarDatosDePartido({ entradas, taquilla, jornadasBloqueadas });

  return { copia, resumen };
}

/**
 * Borrón y cuenta nueva: datos de partido MÁS todos los socios. Irreversible.
 *
 * El orden importa. Los socios se borran los ÚLTIMOS: si la operación se corta
 * a mitad (se cae la red, caduca la sesión), el peor escenario posible es
 * quedarse sin datos de partido —que es justo lo que se quería borrar— y con
 * los socios intactos. Al revés, quedarían fichajes huérfanos de socios que ya
 * no existen.
 *
 * @param {object} estado  El `state` de la aplicación.
 * @returns {Promise<{copia:object, resumen:object}>}
 */
export async function reiniciarTodo({
  entradas = {},
  taquilla = {},
  jornadasBloqueadas = {},
  socios = [],
}) {
  const resumen = resumenReinicio({ entradas, taquilla, jornadasBloqueadas, socios });

  const copia = await crearBackup(entradas, taquilla);

  await borrarDatosDePartido({ entradas, taquilla, jornadasBloqueadas });
  await sociosRepo.borrarSocios(socios.map((s) => s.id));

  return { copia, resumen };
}

function borrarDatosDePartido({ entradas, taquilla, jornadasBloqueadas }) {
  return Promise.all([
    ...Object.keys(entradas).map((j) => entradasRepo.borrarJornada(j)),
    ...Object.keys(taquilla).map((j) => taquillaRepo.borrarJornada(j)),
    ...Object.keys(jornadasBloqueadas).map((j) => jornadasRepo.borrarBloqueo(j)),
  ]);
}
