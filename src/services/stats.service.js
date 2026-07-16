// ============================================================================
//  src/services/stats.service.js
//  Cálculo de estadísticas (asistencia, tipos, ingresos). Devuelve datos
//  puros; el pintado (tablas/gráfico) lo hace la página de stats.
// ============================================================================
import {
  getPartidos,
  getPartidosLabel,
  asisteAlCampo,
  FRANJA_MINUTOS,
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
//  Afluencia: a qué hora llega y se va la gente.
// ============================================================================

/** Minuto del día (0..1439) de un ISO, en hora local del campo. */
const minutoDelDia = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
};

/** Redondea hacia abajo al inicio de su franja. 19:22 con franja 15 -> 19:15. */
const inicioFranja = (minuto) => Math.floor(minuto / FRANJA_MINUTOS) * FRANJA_MINUTOS;

export const etiquetaFranja = (minuto) =>
  `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;

/**
 * Curva de afluencia por franja horaria.
 *
 * `dentro` es un acumulado: en cada franja, cuánta gente había dentro del campo
 * (los que ya habían entrado menos los que ya habían salido). Es lo que
 * responde a "¿cuándo hay más gente viendo el partido?".
 *
 * OJO al leerlo: quien entra y no ficha la salida cuenta como que sigue dentro
 * hasta el final. Mientras el fichaje de salida no sea sistemático, la cola de
 * la curva se queda alta. La franja de PICO sí es fiable.
 *
 * @param {string[]} jornadas Jornadas a incluir. Varias = se suman.
 * @returns {{franjas:Array, nJornadas:number, totalEntradas:number,
 *            totalSalidas:number, pico:object|null}}
 */
export function calcularAfluencia({ entradas = {}, salidas = {}, jornadas = [] }) {
  const conDatos = jornadas.filter((j) => Object.keys(entradas[j] || {}).length);

  // Acumuladores por franja. Se cuentan aparte los fichajes de cada jornada
  // porque "dentro" es un acumulado y no se puede mezclar antes de sumarlo.
  const cuenta = new Map(); // minutoFranja -> { entradas, salidas }
  const anota = (iso, campo) => {
    const m = minutoDelDia(iso);
    if (m === null) return;
    const f = inicioFranja(m);
    if (!cuenta.has(f)) cuenta.set(f, { entradas: 0, salidas: 0 });
    cuenta.get(f)[campo]++;
  };

  conDatos.forEach((j) => {
    Object.values(entradas[j] || {}).forEach((iso) => anota(iso, 'entradas'));
    Object.values(salidas[j] || {}).forEach((iso) => anota(iso, 'salidas'));
  });

  if (!cuenta.size) {
    return { franjas: [], nJornadas: 0, totalEntradas: 0, totalSalidas: 0, pico: null };
  }

  // Rellena también las franjas vacías intermedias: sin ellas el gráfico junta
  // las 19:00 con las 21:30 como si fueran contiguas y la curva miente.
  const claves = [...cuenta.keys()].sort((a, b) => a - b);
  const franjas = [];
  let dentro = 0;
  for (let m = claves[0]; m <= claves[claves.length - 1]; m += FRANJA_MINUTOS) {
    const { entradas: e = 0, salidas: s = 0 } = cuenta.get(m) || {};
    dentro += e - s;
    franjas.push({
      minuto: m,
      label: etiquetaFranja(m),
      entradas: e,
      salidas: s,
      dentro,
    });
  }

  const pico = franjas.reduce((a, f) => (f.dentro > a.dentro ? f : a), franjas[0]);
  return {
    franjas,
    nJornadas: conDatos.length,
    totalEntradas: franjas.reduce((a, f) => a + f.entradas, 0),
    totalSalidas: franjas.reduce((a, f) => a + f.salidas, 0),
    pico,
  };
}

// ============================================================================
//  Historial individual de un socio.
// ============================================================================

/**
 * Partidos de un socio con hora de entrada, de salida y minutos dentro.
 * Se indexa por el id INTERNO del socio, no por su nº de carnet: así el
 * historial sobrevive a las renumeraciones de temporada.
 *
 * @returns {{partidos:Array, asistidos:number, jornadasConDatos:number,
 *            pct:number, minutosMedios:number|null}}
 */
export function historialSocio({ socioId, entradas = {}, salidas = {} }) {
  const labels = getPartidosLabel();
  const partidos = getPartidos()
    .map((j, i) => {
      const entrada = entradas[j]?.[socioId];
      if (!entrada) return null;
      const salida = salidas[j]?.[socioId] || null;
      const minutos = salida
        ? Math.round((new Date(salida) - new Date(entrada)) / 60000)
        : null;
      return { jornada: j, label: labels[i], entrada, salida, minutos };
    })
    .filter(Boolean);

  // El % se calcula sobre las jornadas que YA se han jugado (las que tienen
  // algún registro), no sobre las 17 de la temporada: en la jornada 3 nadie
  // tiene un 18% de asistencia, tiene un 100% de lo jugado.
  const jornadasConDatos = getPartidos().filter(
    (j) => Object.keys(entradas[j] || {}).length,
  ).length;

  const conDuracion = partidos.filter((p) => p.minutos !== null && p.minutos >= 0);
  return {
    partidos,
    asistidos: partidos.length,
    jornadasConDatos,
    pct: jornadasConDatos ? Math.round((partidos.length / jornadasConDatos) * 100) : 0,
    minutosMedios: conDuracion.length
      ? Math.round(conDuracion.reduce((a, p) => a + p.minutos, 0) / conDuracion.length)
      : null,
  };
}
