// ============================================================================
//  src/core/state.js
//  Estado compartido de la aplicación (antes eran variables sueltas en
//  window: socios, entradas, taquilla, jornadasBloqueadas...).
//  Patrón mínimo de suscripción: sin dependencias, sin build.
// ============================================================================
import { TEMPORADA_ACTUAL } from '../config/app.config.js';

const listeners = new Set();

export const state = {
  temporada: TEMPORADA_ACTUAL,
  socios: [],
  entradas: {},
  taquilla: {},
  jornadasBloqueadas: {},
  backups: [],
  partidoScanner: '',
  partidoTaquilla: '',
  tabActiva: 'socios',
};

/** Actualiza el estado y notifica a los suscriptores. */
export function setState(parcial) {
  Object.assign(state, parcial);
  listeners.forEach((fn) => fn(state));
}

/** ¿Está bloqueada la jornada indicada? */
export const estaBloqueada = (jornadaKey) =>
  state.jornadasBloqueadas[jornadaKey] === true;
