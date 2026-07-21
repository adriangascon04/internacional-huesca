// ============================================================================
//  src/services/stats.service.js
//  Cálculo de estadísticas (asistencia, tipos, facturación). Devuelve datos
//  puros; el pintado (tablas/gráfico) lo hace la página de stats.
// ============================================================================
import {
  getPartidos,
  getPartidosLabel,
  asisteAlCampo,
  tipoDocDe,
  esFundador,
  TIPOS_ABONO,
} from '../config/app.config.js';
import { recaudacion } from './taquilla.service.js';

/** Edad en años a partir de la fecha de nacimiento (null si no hay fecha). */
export function edadDe(fnac) {
  if (!fnac) return null;
  const f = new Date(fnac);
  if (Number.isNaN(f.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) edad--;
  return Math.max(0, edad);
}

/** Franjas de edad para el desglose demográfico. */
const GRUPOS_EDAD = [
  { label: '0–15', min: 0, max: 15 },
  { label: '16–25', min: 16, max: 25 },
  { label: '26–40', min: 26, max: 40 },
  { label: '41–65', min: 41, max: 65 },
  { label: '66+', min: 66, max: 200 },
];

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
//  Demografía y calidad de datos: edad, sexo del abono, contacto, fundadores.
//  Todo se calcula sobre socios ACTIVOS (los de baja no cuentan como base).
// ============================================================================

/**
 * @returns {{totalActivos, bajas, pagados, pendientes, morosidadPct,
 *            conEmail, conTel, conAmbos, edadMedia, sinFecha,
 *            edades:Array, porDoc:Array, fundadores}}
 */
export function calcularDemografia({ socios }) {
  const activos = socios.filter((s) => s.activo !== false);
  const bajas = socios.length - activos.length;

  const conEmail = activos.filter((s) => (s.email || '').trim()).length;
  const conTel = activos.filter((s) => (s.tel || '').trim()).length;
  const conAmbos = activos.filter(
    (s) => (s.email || '').trim() && (s.tel || '').trim(),
  ).length;
  const pagados = activos.filter((s) => s.pagado).length;

  const edades = GRUPOS_EDAD.map((g) => ({ ...g, socios: 0 }));
  let sinFecha = 0;
  let sumaEdades = 0;
  let nConEdad = 0;
  activos.forEach((s) => {
    const e = edadDe(s.fnac);
    if (e === null) {
      sinFecha++;
      return;
    }
    sumaEdades += e;
    nConEdad++;
    const g = edades.find((x) => e >= x.min && e <= x.max);
    if (g) g.socios++;
  });

  const porDocMap = {};
  activos.forEach((s) => {
    const d = tipoDocDe(s);
    porDocMap[d] = (porDocMap[d] || 0) + 1;
  });
  const porDoc = Object.entries(porDocMap)
    .map(([doc, n]) => ({ doc, n }))
    .sort((a, b) => b.n - a.n);

  return {
    totalActivos: activos.length,
    bajas,
    pagados,
    pendientes: activos.length - pagados,
    morosidadPct: activos.length
      ? Math.round(((activos.length - pagados) / activos.length) * 100)
      : 0,
    conEmail,
    conTel,
    conAmbos,
    edadMedia: nConEdad ? Math.round(sumaEdades / nConEdad) : 0,
    sinFecha,
    edades,
    porDoc,
    fundadores: activos.filter(esFundador).length,
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

  // Métricas derivadas: ticket medio de taquilla, reparto del ingreso entre
  // cuotas y taquilla, morosidad y recaudación media por jornada jugada.
  const entradasTaquilla = porJornada.reduce((a, j) => a + (j.nTaquilla || 0), 0);
  const totalCuotas = cuotasCobradas + cuotasPendientes;
  const ingresoTotal = cuotasCobradas + recaudacionTaquilla;

  return {
    cuotasCobradas,
    cuotasPendientes,
    recaudacionTaquilla,
    totalEstimado: ingresoTotal,
    porTipo,
    jornadaMax,
    jornadaMin,
    ticketMedioTaquilla: entradasTaquilla
      ? Math.round(recaudacionTaquilla / entradasTaquilla)
      : 0,
    morosidadPct: totalCuotas ? Math.round((cuotasPendientes / totalCuotas) * 100) : 0,
    pctIngresoCuotas: ingresoTotal
      ? Math.round((cuotasCobradas / ingresoTotal) * 100)
      : 0,
    pctIngresoTaquilla: ingresoTotal
      ? Math.round((recaudacionTaquilla / ingresoTotal) * 100)
      : 0,
    recaudacionMediaJornada: conRecaudacion.length
      ? Math.round(recaudacionTaquilla / conRecaudacion.length)
      : 0,
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

  // Distribución de fidelidad: cuántos socios han ido a exactamente k jornadas
  // de las jugadas. El grupo k=0 son los absentistas (nunca han venido).
  const distribucionFidelidad = [];
  for (let k = 0; k <= jornadasConDatos; k++) {
    distribucionFidelidad.push({
      jornadas: k,
      socios: ranking.filter((r) => r.asistidas === k).length,
    });
  }
  const absentistas = jornadasConDatos
    ? ranking.filter((r) => r.asistidas === 0).length
    : 0;
  const fieles = jornadasConDatos
    ? ranking.filter((r) => r.asistidas === jornadasConDatos).length
    : 0;

  // Franjas horarias: a qué hora del día entra la gente. Útil para dimensionar
  // el personal de puerta (¿llegan justos o repartidos?).
  const franjasMap = {};
  let totalFichajes = 0;
  getPartidos().forEach((j) => {
    Object.values(entradas[j] || {}).forEach((iso) => {
      const h = new Date(iso).getHours();
      if (!Number.isNaN(h)) {
        franjasMap[h] = (franjasMap[h] || 0) + 1;
        totalFichajes++;
      }
    });
  });
  const franjasHorarias = Object.entries(franjasMap)
    .map(([hora, n]) => ({ hora: Number(hora), n }))
    .sort((a, b) => a.hora - b.hora);
  const horaPico = franjasHorarias.length
    ? franjasHorarias.reduce((a, f) => (f.n > a.n ? f : a))
    : null;

  const base = activos.length; // activos que asisten al campo
  const ocupacionMedia = base && conDatos.length ? Math.round((asistenciaMedia / base) * 100) : 0;

  return {
    jornadaMax,
    jornadaMin,
    asistenciaMedia,
    ranking,
    porTipo,
    distribucionFidelidad,
    absentistas,
    fieles,
    base,
    ocupacionMedia,
    franjasHorarias,
    horaPico,
    totalFichajes,
  };
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
