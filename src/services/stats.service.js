// ============================================================================
//  src/services/stats.service.js
//  Cálculo de estadísticas (asistencia, tipos, facturación). Devuelve datos
//  puros; el pintado (tablas/gráfico) lo hace la página de stats.
// ============================================================================
import {
  getPartidos,
  getPartidosLabel,
  asisteAlCampo,
  TIPOS_ABONO,
} from '../config/app.config.js';
import { recaudacion } from './taquilla.service.js';

export function calcularStats({ socios, entradas, taquilla }) {
  const partidos = getPartidos();
  const labels = getPartidosLabel();
  const conAsistencia = socios.filter((s) => asisteAlCampo(s.tipo)); // excluye Internacional
  const idsExcluidos = new Set(
    socios.filter((s) => !asisteAlCampo(s.tipo)).map((s) => s.id),
  );

  const totalSocios = socios.length;
  const pendientesPago = socios.filter((s) => !s.pagado).length;

  const porJornada = partidos.map((p, i) => {
    const e = entradas[p] || {};
    const nSocios = Object.keys(e).filter((id) => !idsExcluidos.has(id)).length;
    const d = taquilla[p] || {};
    const nTaquilla = (d.general || 0) + (d.menor || 0);
    return {
      jornada: p,
      label: labels[i],
      nSocios,
      nTaquilla,
      totalAsistentes: nSocios + nTaquilla,
      recaudacion: recaudacion(d),
    };
  });

  const tipos = {};
  socios.forEach((s) => {
    tipos[s.tipo] = (tipos[s.tipo] || 0) + 1;
  });

  return {
    totalSocios,
    pendientesPago,
    jornadasConDatos: Object.keys(entradas).length,
    porJornada,
    tipos,
    recaudacionTotal: porJornada.reduce((a, j) => a + j.recaudacion, 0),
    baseAsistencia: conAsistencia.length,
  };
}

// ============================================================================
//  Facturación: ingreso de cuotas de socio + taquilla.
// ============================================================================

const precioDe = (tipo) => TIPOS_ABONO.find((t) => t.id === tipo)?.precio || 0;

/**
 * Ingresos por cuotas de socio (activos), desglosados en cobrado/pendiente
 * según el campo `pagado`, más el total de taquilla ya calculado en
 * `calcularStats`. Los precios de `TIPOS_ABONO` son de referencia (verifícalos
 * con el club) y hasta ahora no se usaban para nada: es la primera vez que se
 * traducen a una cifra de facturación.
 * @returns {{cuotasCobradas:number, cuotasPendientes:number,
 *            recaudacionTaquilla:number, totalEstimado:number,
 *            porTipo:Array, jornadaMax:object|null, jornadaMin:object|null}}
 */
export function calcularFacturacion({ socios, porJornada = [] }) {
  const activos = socios.filter((s) => s.activo !== false);

  let cuotasCobradas = 0;
  let cuotasPendientes = 0;
  const porTipo = TIPOS_ABONO.map((t) => ({
    tipo: t.id,
    socios: 0,
    cobrado: 0,
    pendiente: 0,
  }));
  const idxPorTipo = new Map(porTipo.map((t, i) => [t.tipo, i]));

  activos.forEach((s) => {
    const precio = precioDe(s.tipo);
    const fila = porTipo[idxPorTipo.get(s.tipo)];
    if (!fila) return; // tipo desconocido/legacy: no se contabiliza
    fila.socios += 1;
    if (s.pagado) {
      fila.cobrado += precio;
      cuotasCobradas += precio;
    } else {
      fila.pendiente += precio;
      cuotasPendientes += precio;
    }
  });

  const recaudacionTaquilla = porJornada.reduce((a, j) => a + j.recaudacion, 0);
  const conRecaudacion = porJornada.filter((j) => j.recaudacion > 0);
  const jornadaMax = conRecaudacion.length
    ? conRecaudacion.reduce((a, j) => (j.recaudacion > a.recaudacion ? j : a))
    : null;
  const jornadaMin = conRecaudacion.length
    ? conRecaudacion.reduce((a, j) => (j.recaudacion < a.recaudacion ? j : a))
    : null;

  return {
    cuotasCobradas,
    cuotasPendientes,
    recaudacionTaquilla,
    totalEstimado: cuotasCobradas + recaudacionTaquilla,
    porTipo,
    jornadaMax,
    jornadaMin,
  };
}

// ============================================================================
//  Asistencia: jornada pico/valle, ranking de socios, tasa por tipo de abono.
// ============================================================================

/**
 * @returns {{jornadaMax:object|null, jornadaMin:object|null,
 *            asistenciaMedia:number, ranking:Array, porTipo:Array}}
 */
export function calcularAsistencia({ socios, entradas, porJornada = [] }) {
  const conDatos = porJornada.filter((j) => j.nSocios > 0 || j.nTaquilla > 0);
  const jornadaMax = conDatos.length
    ? conDatos.reduce((a, j) => (j.nSocios > a.nSocios ? j : a))
    : null;
  const jornadaMin = conDatos.length
    ? conDatos.reduce((a, j) => (j.nSocios < a.nSocios ? j : a))
    : null;
  const asistenciaMedia = conDatos.length
    ? Math.round(conDatos.reduce((a, j) => a + j.nSocios, 0) / conDatos.length)
    : 0;

  const jornadasConDatos = getPartidos().filter(
    (j) => Object.keys(entradas[j] || {}).length,
  ).length;

  const activos = socios.filter((s) => s.activo !== false && asisteAlCampo(s.tipo));
  const ranking = activos
    .map((s) => {
      const asistidas = getPartidos().filter((j) => entradas[j]?.[s.id]).length;
      return {
        socio: s,
        asistidas,
        pct: jornadasConDatos ? Math.round((asistidas / jornadasConDatos) * 100) : 0,
      };
    })
    .sort((a, b) => b.asistidas - a.asistidas);

  const porTipo = TIPOS_ABONO.filter((t) => t.asiste).map((t) => {
    const deEsteTipo = activos.filter((s) => s.tipo === t.id);
    const mediaAsistencia = deEsteTipo.length
      ? Math.round(
          (deEsteTipo.reduce(
            (a, s) => a + getPartidos().filter((j) => entradas[j]?.[s.id]).length,
            0,
          ) /
            deEsteTipo.length /
            (jornadasConDatos || 1)) *
            100,
        )
      : 0;
    return { tipo: t.id, socios: deEsteTipo.length, mediaAsistencia };
  });

  return { jornadaMax, jornadaMin, asistenciaMedia, ranking, porTipo };
}

// ============================================================================
//  Historial individual de un socio.
// ============================================================================

/**
 * Jornadas de un socio con hora de entrada.
 * Se indexa por el id INTERNO del socio, no por su nº de carnet: así el
 * historial sobrevive a las renumeraciones de temporada.
 *
 * @returns {{partidos:Array, asistidos:number, jornadasConDatos:number, pct:number}}
 */
export function historialSocio({ socioId, entradas = {} }) {
  const labels = getPartidosLabel();
  const partidos = getPartidos()
    .map((j, i) => {
      const entrada = entradas[j]?.[socioId];
      if (!entrada) return null;
      return { jornada: j, label: labels[i], entrada };
    })
    .filter(Boolean);

  // El % se calcula sobre las jornadas que YA se han jugado (las que tienen
  // algún registro), no sobre las 17 de la temporada: en la jornada 3 nadie
  // tiene un 18% de asistencia, tiene un 100% de lo jugado.
  const jornadasConDatos = getPartidos().filter(
    (j) => Object.keys(entradas[j] || {}).length,
  ).length;

  return {
    partidos,
    asistidos: partidos.length,
    jornadasConDatos,
    pct: jornadasConDatos ? Math.round((partidos.length / jornadasConDatos) * 100) : 0,
  };
}
