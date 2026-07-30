// ============================================================================
//  src/services/mantenimiento.service.js
//  Reinicio de los datos de partido: borra los fichajes de la puerta y las
//  ventas de taquilla de TODAS las jornadas, y reabre las que estuvieran
//  cerradas. Pensado para el final de la fase de pruebas, cuando hay socios y
//  calendario buenos pero asistencia y recaudación inventadas.
//
//  QUÉ NO TOCA, y por qué:
//    · socios       — lo que se quiere conservar; además las reglas prohíben
//                     borrarlos (baja lógica, nunca borrado real) y el contador
//                     de números de socio solo puede subir, así que un reinicio
//                     de socios desde el cliente es imposible por diseño.
//    · competiciones— el calendario y los precios cuestan de montar y no son
//                     datos de prueba.
//    · usuarios     — borrarlos dejaría al club fuera de su propia aplicación.
//    · config       — la jornada actual sigue apuntando a un partido que existe;
//                     lo único que desaparece son sus datos.
//    · backups      — son justo la red de seguridad de esta operación.
//
//  Antes de borrar nada se crea SIEMPRE una copia de seguridad. Si esa copia
//  falla, no se borra nada: es una operación sin vuelta atrás y no tiene
//  sentido ejecutarla a ciegas.
// ============================================================================
import * as entradasRepo from '../repositories/entradas.repository.js';
import * as taquillaRepo from '../repositories/taquilla.repository.js';
import * as jornadasRepo from '../repositories/jornadas.repository.js';
import { crearBackup } from './backup.service.js';

/**
 * Qué se va a borrar, para poder enseñarlo ANTES de pedir la confirmación.
 * @returns {{jornadasConFichajes:number, fichajes:number,
 *            jornadasConVentas:number, ventas:number, jornadasCerradas:number}}
 */
export function resumenReinicio({ entradas = {}, taquilla = {}, jornadasBloqueadas = {} }) {
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
  };
}

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

  await Promise.all([
    ...Object.keys(entradas).map((j) => entradasRepo.borrarJornada(j)),
    ...Object.keys(taquilla).map((j) => taquillaRepo.borrarJornada(j)),
    ...Object.keys(jornadasBloqueadas).map((j) => jornadasRepo.borrarBloqueo(j)),
  ]);

  return { copia, resumen };
}
