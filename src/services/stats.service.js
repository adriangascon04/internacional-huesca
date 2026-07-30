// ============================================================================
//  src/services/stats.service.js
//  Cálculo de estadísticas (asistencia, tipos, facturación). Devuelve datos
//  puros; el pintado (tablas/gráfico) lo hace la página de stats.
// ============================================================================
import {
  asisteAlCampo,
  tipoDocDe,
  esFundador,
  precioAbonoPorDefecto,
  TIPOS_ABONO,
} from '../config/app.config.js';
import { recaudacion, ventasDe } from './taquilla.service.js';
import { partidosDisponibles } from './competiciones.service.js';

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

/**
 * Pseudo-tipo de los abonados que entran con su QR. No pasan por taquilla ni
 * pagan en la puerta, así que no aparecen en el desglose de recaudación — pero
 * son la mayor parte de la gente que hay en el campo, y sin ellos un gráfico de
 * asistentes por tipo estaría contando justo lo que menos pesa.
 */
export const TIPO_ABONADO = { id: 'abonado', nombre: 'Abonados (entrada incluida)' };

/** Suma filas {tipo, nombre, ...campos} de varias jornadas en una sola lista. */
function agregarPorTipo(filas, campos) {
  return Object.values(
    filas.reduce((m, fila) => {
      const actual = m[fila.tipo] || {
        tipo: fila.tipo,
        nombre: fila.nombre || fila.tipo,
        ...Object.fromEntries(campos.map((c) => [c, 0])),
      };
      campos.forEach((c) => {
        actual[c] += Number(fila[c] || 0);
      });
      m[fila.tipo] = actual;
      return m;
    }, {}),
  );
}

export function calcularStats({ socios, entradas, taquilla, competiciones = [] }) {
  const partidos = partidosDisponibles(competiciones, [
    ...Object.keys(entradas),
    ...Object.keys(taquilla),
  ]);
  const conAsistencia = socios.filter((s) => asisteAlCampo(s.tipo)); // excluye Internacional
  const idsExcluidos = new Set(
    socios.filter((s) => !asisteAlCampo(s.tipo)).map((s) => s.id),
  );

  const totalSocios = socios.length;
  const pendientesPago = socios.filter((s) => !s.pagado).length;

  const porJornada = partidos.map((p) => {
    const e = entradas[p.id] || {};
    const nSocios = Object.keys(e).filter((id) => !idsExcluidos.has(id)).length;
    const d = taquilla[p.id] || {};
    const ventas = ventasDe(d);
    const nTaquilla = ventas.length;
    const porTipo = Object.values(
      ventas.reduce((m, v) => {
        const tipo = v.tipo || 'otro';
        const x = m[tipo] || {
          tipo,
          nombre: v.nombreTipo || tipo,
          asistentes: 0,
          recaudacion: 0,
        };
        x.asistentes++;
        x.recaudacion += Number(v.precio || 0);
        m[tipo] = x;
        return m;
      }, {}),
    );
    return {
      jornada: p.id,
      label: `${p.competicion ? p.competicion + ' · ' : ''}${p.nombre}`,
      competicion: p.competicion || 'Histórico',
      nSocios,
      nTaquilla,
      totalAsistentes: nSocios + nTaquilla,
      recaudacion: recaudacion(d),
      porTipo,
      // Mismo desglose que `porTipo` pero contando PERSONAS y con los abonados
      // delante: es la foto de quién llena el campo, que no coincide con la de
      // quién lo paga.
      asistentesPorTipo: [
        { tipo: TIPO_ABONADO.id, nombre: TIPO_ABONADO.nombre, asistentes: nSocios },
        ...porTipo.map(({ tipo, nombre, asistentes }) => ({ tipo, nombre, asistentes })),
      ].filter((x) => x.asistentes > 0),
    };
  });

  const tipos = {};
  socios.forEach((s) => {
    tipos[s.tipo] = (tipos[s.tipo] || 0) + 1;
  });

  return {
    totalSocios,
    pendientesPago,
    jornadasConDatos: porJornada.filter((j) => j.nSocios || j.nTaquilla).length,
    porJornada,
    tipos,
    recaudacionTotal: porJornada.reduce((a, j) => a + j.recaudacion, 0),
    baseAsistencia: conAsistencia.length,
    tiposEntrada: agregarPorTipo(
      porJornada.flatMap((j) => j.porTipo),
      ['asistentes', 'recaudacion'],
    ),
    // Los mismos tipos contados en personas, abonados incluidos. Va aparte de
    // `tiposEntrada` a propósito: mezclar euros y personas en una sola lista
    // es justo lo que hace que un gráfico mienta.
    tiposAsistencia: agregarPorTipo(
      porJornada.flatMap((j) => j.asistentesPorTipo),
      ['asistentes'],
    ),
    porCompeticion: Object.values(
      porJornada.reduce((m, j) => {
        const nombre = j.competicion || 'Histórico';
        const actual = m[nombre] || {
          competicion: nombre,
          partidos: 0,
          asistentes: 0,
          recaudacion: 0,
        };
        actual.partidos++;
        actual.asistentes += j.totalAsistentes;
        actual.recaudacion += j.recaudacion;
        m[nombre] = actual;
        return m;
      }, {}),
    ),
  };
}

/** Recaudación de altas, deliberadamente separada de la venta de entradas. */
export function calcularAltasSocios({ socios = [] }) {
  const porTipoMap = {};
  const porMesMap = {};
  let nuevosSocios = 0;
  let ingresos = 0;
  let pendientes = 0;
  socios.forEach((s) => {
    // Una baja no borra una alta ni el dinero cobrado en ese momento.
    nuevosSocios++;
    // Importe REALMENTE cobrado en el alta. Los socios anteriores a que se
    // guardara ese campo caen a la tarifa de referencia de su tipo de abono.
    const importe = Number.isFinite(Number(s.importeAbono))
      ? Number(s.importeAbono)
      : precioAbonoPorDefecto(s.tipo);
    const fila = porTipoMap[s.tipo] || {
      tipo: s.tipo || 'Sin tipo',
      socios: 0,
      ingresos: 0,
      pendiente: 0,
    };
    fila.socios++;
    if (s.pagado) {
      fila.ingresos += importe;
      ingresos += importe;
    } else {
      fila.pendiente += importe;
      pendientes += importe;
    }
    porTipoMap[s.tipo] = fila;
    if (s.alta) {
      const mes = String(s.alta).slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(mes)) {
        const dato = porMesMap[mes] || { mes, socios: 0, ingresos: 0 };
        dato.socios++;
        if (s.pagado) dato.ingresos += importe;
        porMesMap[mes] = dato;
      }
    }
  });
  return {
    nuevosSocios,
    ingresos,
    pendientes,
    porTipo: Object.values(porTipoMap),
    evolucion: Object.values(porMesMap).sort((a, b) => a.mes.localeCompare(b.mes)),
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
//  Economía de la venta de entradas.
//
//  Deliberadamente NO toca las cuotas de socio: de eso se ocupa
//  `calcularAltasSocios`, que es la única fuente de la recaudación por altas.
//  Antes había aquí una `calcularFacturacion` que recalculaba las cuotas a
//  partir de la tarifa de `TIPOS_ABONO`, así que ignoraba el importe que
//  REALMENTE se cobró en el alta (`importeAbono`) y daba una cifra distinta a
//  la del apartado de altas. `ingresoAltas` se recibe ya calculado para poder
//  repartir el ingreso total entre las dos vías sin duplicar el cálculo.
// ============================================================================

/**
 * @param {object} p
 * @param {Array}  p.porJornada    Filas de `calcularStats`.
 * @param {number} p.ingresoAltas  Cobrado por altas (`calcularAltasSocios().ingresos`).
 * @returns {{recaudacionTaquilla:number, entradasVendidas:number,
 *            ticketMedioTaquilla:number, recaudacionMediaJornada:number,
 *            jornadaMax:object|null, jornadaMin:object|null,
 *            ingresoTotal:number, pctIngresoAltas:number,
 *            pctIngresoTaquilla:number}}
 */
export function calcularEconomiaEntradas({ porJornada = [], ingresoAltas = 0 } = {}) {
  const recaudacionTaquilla = porJornada.reduce((a, j) => a + (j.recaudacion || 0), 0);
  const entradasVendidas = porJornada.reduce((a, j) => a + (j.nTaquilla || 0), 0);

  // "Jornada con más/menos taquilla" solo tiene sentido entre las que han
  // recaudado algo: si no, la mínima sería siempre una jornada sin jugar.
  const conRecaudacion = porJornada.filter((j) => j.recaudacion > 0);
  const jornadaMax = conRecaudacion.length
    ? conRecaudacion.reduce((a, j) => (j.recaudacion > a.recaudacion ? j : a))
    : null;
  const jornadaMin = conRecaudacion.length
    ? conRecaudacion.reduce((a, j) => (j.recaudacion < a.recaudacion ? j : a))
    : null;

  const ingresoTotal = ingresoAltas + recaudacionTaquilla;
  const reparto = (parte) => (ingresoTotal ? Math.round((parte / ingresoTotal) * 100) : 0);

  return {
    recaudacionTaquilla,
    entradasVendidas,
    ticketMedioTaquilla: entradasVendidas
      ? Math.round(recaudacionTaquilla / entradasVendidas)
      : 0,
    recaudacionMediaJornada: conRecaudacion.length
      ? Math.round(recaudacionTaquilla / conRecaudacion.length)
      : 0,
    jornadaMax,
    jornadaMin,
    ingresoTotal,
    pctIngresoAltas: reparto(ingresoAltas),
    pctIngresoTaquilla: reparto(recaudacionTaquilla),
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

  const partidos = porJornada.length
    ? porJornada.map((j) => j.jornada)
    : partidosDisponibles([], Object.keys(entradas)).map((p) => p.id);
  const jornadasConDatos = partidos.filter(
    (j) => Object.keys(entradas[j] || {}).length,
  ).length;

  const activos = socios.filter((s) => s.activo !== false && asisteAlCampo(s.tipo));
  const ranking = activos
    .map((s) => {
      const asistidas = partidos.filter((j) => entradas[j]?.[s.id]).length;
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
            (a, s) => a + partidos.filter((j) => entradas[j]?.[s.id]).length,
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
  partidos.forEach((j) => {
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
  const ocupacionMedia =
    base && conDatos.length ? Math.round((asistenciaMedia / base) * 100) : 0;

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
export function historialSocio({ socioId, entradas = {}, competiciones = [] }) {
  const partidosConfigurados = partidosDisponibles(competiciones, Object.keys(entradas));
  const partidos = partidosConfigurados
    .map((p) => {
      const j = p.id;
      const entrada = entradas[j]?.[socioId];
      if (!entrada) return null;
      return {
        jornada: j,
        label: p.competicion ? `${p.competicion} · ${p.nombre}` : p.nombre,
        entrada,
      };
    })
    .filter(Boolean);

  // El % se calcula sobre las jornadas que YA se han jugado (las que tienen
  // algún registro), no sobre las 17 de la temporada: en la jornada 3 nadie
  // tiene un 18% de asistencia, tiene un 100% de lo jugado.
  const jornadasConDatos = partidosConfigurados.filter(
    (p) => Object.keys(entradas[p.id] || {}).length,
  ).length;

  return {
    partidos,
    asistidos: partidos.length,
    jornadasConDatos,
    pct: jornadasConDatos ? Math.round((partidos.length / jornadasConDatos) * 100) : 0,
  };
}
