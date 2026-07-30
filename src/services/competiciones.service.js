// Modelo único de calendario. Un partido siempre tiene una clave estable para
// enlazar asistencia, taquilla y bloqueos, independientemente de su etiqueta.
import { TIPOS_ENTRADA_POR_DEFECTO } from '../config/app.config.js';

export const tarifasPorDefecto = () =>
  Object.fromEntries(TIPOS_ENTRADA_POR_DEFECTO.map((t) => [t.id, t.precio]));

export function partidosDe(competiciones = []) {
  return [...competiciones]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .flatMap((c) =>
      [...(c.partidos || [])]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((p) => ({
          ...p,
          competicionId: c.id,
          competicion: c.nombre,
        })),
    );
}

export const partidoPorId = (competiciones, id) =>
  partidosDe(competiciones).find((p) => p.id === id);
export const etiquetaPartido = (competiciones, id) => {
  const p = partidoPorId(competiciones, id);
  return p ? `${p.competicion} · ${p.nombre}` : id;
};
export const preciosDePartido = (competiciones, id) => ({
  ...tarifasPorDefecto(),
  ...(partidoPorId(competiciones, id)?.precios || {}),
});
/** Tipos disponibles para un partido. Las claves añadidas a sus precios se
 * convierten automáticamente en tipos vendibles, sin tocar la aplicación. */
export const tiposDePartido = (competiciones, id) => {
  const precios = preciosDePartido(competiciones, id);
  return Object.keys(precios).map((tipo) => ({
    id: tipo,
    nombre: TIPOS_ENTRADA_POR_DEFECTO.find((t) => t.id === tipo)?.nombre || tipo,
    precio: precios[tipo],
  }));
};

/** Convierte claves históricas de Firestore en partidos editables sin perder datos. */
export function migrarPartidosLegacy(claves = []) {
  return claves.sort().map((id, orden) => ({
    id,
    nombre: id.replace(/-/g, '/'),
    orden,
    precios: tarifasPorDefecto(),
  }));
}

/**
 * Calendario inicial para una instalación que todavía no tiene competiciones.
 *
 * Sin esto, al pasar del calendario fijo al configurable los selectores de
 * escáner, taquilla y jornada actual se quedaban VACÍOS hasta que alguien
 * creara todo a mano, y una temporada ya empezada dejaba de poder fichar.
 *
 * Los partidos conservan como `id` la clave con la que ya están guardados los
 * accesos y la taquilla (`2026-27 - Jornada 01`), así que adoptar el calendario
 * no mueve ni un registro: el historial sigue colgando de la misma clave.
 *
 * @param {string[]} clavesEnUso  Claves de `entradas`/`taquilla` con datos.
 * @param {string[]} clavesFijas  El calendario fijo anterior (`getPartidos()`).
 * @param {string[]} etiquetas    Sus etiquetas legibles (`getPartidosLabel()`).
 * @returns {{nombre:string, orden:number, partidos:Array}}
 */
export function calendarioInicial(clavesEnUso = [], clavesFijas = [], etiquetas = []) {
  const nombrePorClave = new Map(clavesFijas.map((clave, i) => [clave, etiquetas[i]]));
  // Las jornadas del calendario fijo primero y en su orden; después cualquier
  // clave suelta que hubiera en Firestore y no estuviera en esa lista.
  const extras = [...new Set(clavesEnUso)].filter((c) => !nombrePorClave.has(c)).sort();

  return {
    nombre: 'Liga',
    orden: 0,
    partidos: [...clavesFijas, ...extras].map((clave, orden) => ({
      id: clave,
      nombre: nombrePorClave.get(clave) || clave.replace(/-/g, '/'),
      orden,
      precios: tarifasPorDefecto(),
    })),
  };
}
export const partidosDisponibles = (competiciones, clavesLegacy = []) => {
  const configurados = partidosDe(competiciones);
  // Al eliminar un partido del calendario no se destruyen sus datos: se
  // mantiene visible en estadísticas, escáner y exportaciones como histórico.
  const idsConfigurados = new Set(configurados.map((p) => p.id));
  const historicos = migrarPartidosLegacy(
    clavesLegacy.filter((id) => !idsConfigurados.has(id)),
  );
  return [...configurados, ...historicos];
};
