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
  temporadaDe,
  temporadasEntre,
  TEMPORADA_ACTUAL,
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
    const idsFichados = Object.keys(e);
    const nSocios = idsFichados.filter((id) => !idsExcluidos.has(id)).length;
    // Un socio Internacional que SÍ viene ha fichado igual que los demás: su
    // entrada existe, simplemente no entra en el % de asistencia. Se cuenta
    // aparte en vez de desaparecer, porque un fichaje que no se ve en ningún
    // sitio parece un fichaje perdido.
    const nSociosSinComputar = idsFichados.length - nSocios;
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
      nSociosSinComputar,
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
    // Cómo se cobra en la puerta. Sirve para cuadrar la caja al final del
    // partido: el efectivo es lo único que hay que contar a mano.
    porMetodoPago: agregarPorMetodo(
      partidos.flatMap((p) => ventasDe(taquilla[p.id] || {})),
    ),
  };
}

/** Agrupa cobros {metodoPago, precio} por método de pago. */
function agregarPorMetodo(cobros) {
  return Object.values(
    cobros.reduce((m, c) => {
      const metodo = c.metodoPago || 'Sin indicar';
      const x = m[metodo] || { metodo, n: 0, importe: 0 };
      x.n++;
      x.importe += Number(c.precio ?? c.importe ?? 0);
      m[metodo] = x;
      return m;
    }, {}),
  ).sort((a, b) => b.importe - a.importe);
}

/**
 * Cuota que se le cuenta a un socio: la que REALMENTE se cobró. Los socios
 * anteriores a que se guardara ese campo caen a la tarifa de referencia de su
 * tipo de abono.
 */
export const importeAbonoDe = (s) =>
  Number.isFinite(Number(s?.importeAbono))
    ? Number(s.importeAbono)
    : precioAbonoPorDefecto(s?.tipo);

/**
 * Recaudación de altas, deliberadamente separada de la venta de entradas.
 *
 * TODOS los socios entran aquí, incluidos los que no pisan el campo. Es la
 * contrapartida de excluir al Abono Internacional de la asistencia: su dinero
 * cuenta igual que el de cualquier otro — es justo de lo que va ese abono —,
 * lo único que no cuenta es su presencia. Por eso el reparto va aparte, en
 * `ingresosNoAsisten`: para poder ver cuánto de la recaudación viene de gente
 * que no ocupa asiento.
 */
export function calcularAltasSocios({ socios = [] }) {
  const porTipoMap = {};
  const porMesMap = {};
  let nuevosSocios = 0;
  let ingresos = 0;
  let pendientes = 0;
  let ingresosNoAsisten = 0;
  socios.forEach((s) => {
    nuevosSocios++;
    const importe = importeAbonoDe(s);
    const fila = porTipoMap[s.tipo] || {
      tipo: s.tipo || 'Sin tipo',
      socios: 0,
      ingresos: 0,
      pendiente: 0,
      cuotaMedia: 0,
      asiste: asisteAlCampo(s.tipo),
    };
    fila.socios++;
    if (s.pagado) {
      fila.ingresos += importe;
      ingresos += importe;
      if (!asisteAlCampo(s.tipo)) ingresosNoAsisten += importe;
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

  const porTipo = Object.values(porTipoMap).map((f) => ({
    ...f,
    // Con cuota libre (Socio Colaborador) la tarifa no dice nada: lo que
    // interesa saber es cuánto está aportando de media cada uno.
    cuotaMedia: f.socios ? Math.round((f.ingresos + f.pendiente) / f.socios) : 0,
  }));

  // Quién sostiene económicamente al club. Con cuotas libres el reparto deja de
  // ser plano y esta lista es lo que enseña de dónde sale el dinero de verdad.
  const topAportantes = [...socios]
    .map((s) => ({ socio: s, importe: importeAbonoDe(s), pagado: s.pagado === true }))
    .filter((x) => x.importe > 0)
    .sort((a, b) => b.importe - a.importe)
    .slice(0, 10);

  // Concentración: qué parte de las cuotas ponen el 10 % que más aporta. Si
  // sale muy alto, el club depende de muy poca gente y conviene saberlo.
  const importesOrdenados = socios.map(importeAbonoDe).sort((a, b) => b - a);
  const totalCuotas = importesOrdenados.reduce((a, b) => a + b, 0);
  const cuantosEnElDiez = Math.max(1, Math.ceil(importesOrdenados.length * 0.1));
  const pctTop10 = totalCuotas
    ? Math.round(
        (importesOrdenados.slice(0, cuantosEnElDiez).reduce((a, b) => a + b, 0) /
          totalCuotas) *
          100,
      )
    : 0;

  // Antigüedad: cuántos socios lleva cada nº de temporadas. Es la foto de si el
  // club está creciendo con gente nueva o sosteniéndose con los de siempre.
  const porAntiguedadMap = {};
  socios.forEach((s) => {
    const t = temporadaDe(s.alta);
    const n = t ? temporadasEntre(t, TEMPORADA_ACTUAL).length : 0;
    if (!n) return;
    porAntiguedadMap[n] = (porAntiguedadMap[n] || 0) + 1;
  });
  const porAntiguedad = Object.entries(porAntiguedadMap)
    .map(([temporadas, n]) => ({ temporadas: Number(temporadas), socios: n }))
    .sort((a, b) => a.temporadas - b.temporadas);

  return {
    nuevosSocios,
    ingresos,
    pendientes,
    ingresosNoAsisten,
    porTipo,
    topAportantes,
    pctTop10,
    porAntiguedad,
    cuotaMedia: nuevosSocios ? Math.round((ingresos + pendientes) / nuevosSocios) : 0,
    porMetodoPago: agregarPorMetodo(
      socios
        .filter((s) => s.pagado)
        .map((s) => ({ metodoPago: s.metodoPago, precio: importeAbonoDe(s) })),
    ),
    evolucion: Object.values(porMesMap).sort((a, b) => a.mes.localeCompare(b.mes)),
  };
}

// ============================================================================
//  Demografía y calidad de datos: edad, contacto, documentos, fundadores.
//
//  Ya no existe la "baja de socio": un socio que se quita se borra de verdad
//  (ver socios.service.js). El filtro `activo !== false` se mantiene por si
//  queda alguna ficha marcada de baja de antes, pero no se cuentan ni se
//  enseñan como una categoría.
// ============================================================================

/**
 * @returns {{totalActivos, pagados, pendientes, morosidadPct,
 *            conEmail, conTel, conAmbos, edadMedia, sinFecha,
 *            edades:Array, porDoc:Array, fundadores, noAsisten}}
 */
export function calcularDemografia({ socios }) {
  const activos = socios.filter((s) => s.activo !== false);

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
    // Cuántos socios sostienen al club sin ocupar asiento (Abono Internacional).
    noAsisten: activos.filter((s) => !asisteAlCampo(s.tipo)).length,
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
 * Cómo va la temporada: lo jugado, lo que queda y hacia dónde va la cosa.
 *
 * La proyección es una regla de tres deliberadamente simple —lo recaudado de
 * media por partido jugado, multiplicado por los que faltan— y va etiquetada
 * como estimación allá donde se enseñe. Un modelo más fino con ocho partidos de
 * muestra sería precisión falsa.
 *
 * La tendencia compara la segunda mitad de lo jugado con la primera: responde a
 * "¿esto sube o baja?", que es lo que se quiere saber a mitad de temporada y no
 * contesta ninguna media.
 *
 * @param {Array} porJornada Filas de `calcularStats`.
 */
export function calcularTemporada({ porJornada = [] } = {}) {
  const jugados = porJornada.filter((j) => j.nSocios || j.nTaquilla);
  const porJugar = porJornada.length - jugados.length;

  const recaudado = jugados.reduce((a, j) => a + (j.recaudacion || 0), 0);
  const asistentes = jugados.reduce((a, j) => a + (j.totalAsistentes || 0), 0);
  const mediaAsistentes = jugados.length ? Math.round(asistentes / jugados.length) : 0;
  const mediaRecaudacion = jugados.length ? Math.round(recaudado / jugados.length) : 0;

  const mitad = Math.floor(jugados.length / 2);
  const media = (filas, campo) =>
    filas.length ? filas.reduce((a, f) => a + (f[campo] || 0), 0) / filas.length : 0;
  const primeros = jugados.slice(0, mitad);
  const ultimos = jugados.slice(mitad);
  const variacion = (campo) => {
    if (jugados.length < 4) return null; // con menos, el ruido manda
    const a = media(primeros, campo);
    const b = media(ultimos, campo);
    return a ? Math.round(((b - a) / a) * 100) : null;
  };

  // Partido con más gente en el campo (no el que más recaudó: no es lo mismo).
  const lleno = jugados.length
    ? jugados.reduce((a, j) => (j.totalAsistentes > a.totalAsistentes ? j : a))
    : null;

  return {
    partidos: porJornada.length,
    jugados: jugados.length,
    porJugar,
    pctTemporada: porJornada.length
      ? Math.round((jugados.length / porJornada.length) * 100)
      : 0,
    asistentes,
    mediaAsistentes,
    mediaRecaudacion,
    lleno,
    tendenciaAsistencia: variacion('totalAsistentes'),
    tendenciaRecaudacion: variacion('recaudacion'),
    // Estimación, no promesa: lo que daría el resto de la temporada al ritmo
    // que lleva.
    proyeccionTaquilla: recaudado + mediaRecaudacion * porJugar,
  };
}

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
  const reparto = (parte) =>
    ingresoTotal ? Math.round((parte / ingresoTotal) * 100) : 0;

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

  // Núcleo duro: los que vienen al 80 % o más. Es la cifra que de verdad dice
  // con cuánta gente cuenta el club cada domingo, mejor que la media, que se
  // hunde con los que no vienen nunca.
  const nucleo = jornadasConDatos ? ranking.filter((r) => r.pct >= 80).length : 0;
  const ocasionales = jornadasConDatos
    ? ranking.filter((r) => r.pct > 0 && r.pct < 50).length
    : 0;

  // Cuánta gente distinta ha pisado el campo alguna vez. Un club con 200 socios
  // de los que solo 60 han venido nunca no es lo mismo que uno con 200 rotando.
  const distintos = jornadasConDatos ? ranking.filter((r) => r.asistidas > 0).length : 0;

  return {
    jornadaMax,
    jornadaMin,
    asistenciaMedia,
    ranking,
    porTipo,
    distribucionFidelidad,
    absentistas,
    fieles,
    nucleo,
    ocasionales,
    distintos,
    pctDistintos: base ? Math.round((distintos / base) * 100) : 0,
    base,
    ocupacionMedia,
    franjasHorarias,
    horaPico,
    totalFichajes,
    jornadasConDatos,
  };
}

// ============================================================================
//  Ficha individual de un socio: todo lo que se puede decir de UNA persona.
// ============================================================================

/**
 * Racha más larga de partidos consecutivos a los que fue, y racha viva al
 * final. `asistencias` es la lista de partidos jugados en orden, con true/false.
 */
function rachas(asistencias) {
  let mejor = 0;
  let actual = 0;
  for (const fue of asistencias) {
    actual = fue ? actual + 1 : 0;
    if (actual > mejor) mejor = actual;
  }
  // La racha viva solo cuenta si el último partido jugado lo tiene: si faltó al
  // último, su racha está rota aunque antes llevara diez seguidos.
  const viva = asistencias.at(-1) ? actual : 0;
  return { mejor, viva };
}

/**
 * Retrato completo de un socio. Reúne lo que hasta ahora estaba disperso (o no
 * estaba): cuánto lleva en el club, cuánto ha aportado cada temporada, a qué
 * partidos ha ido y cómo se compara con el resto.
 *
 * @param {object} p
 * @param {object} p.socio
 * @param {Array}  p.cuotas        Historial de cuotas (socios.service:cuotasDe).
 * @param {object} p.entradas      Fichajes de todas las jornadas.
 * @param {Array}  p.competiciones Calendario.
 * @param {Array}  p.socios        El resto del club, para poder comparar.
 */
export function perfilSocio({
  socio,
  cuotas = [],
  entradas = {},
  competiciones = [],
  socios = [],
}) {
  const partidos = partidosDisponibles(competiciones, Object.keys(entradas));
  const jugados = partidos.filter((p) => Object.keys(entradas[p.id] || {}).length);

  const asistidos = jugados
    .map((p) => ({
      jornada: p.id,
      competicion: p.competicion || 'Histórico',
      label: p.competicion ? `${p.competicion} · ${p.nombre}` : p.nombre,
      entrada: entradas[p.id]?.[socio.id] || null,
    }))
    .filter((x) => x.entrada);

  const pct = jugados.length ? Math.round((asistidos.length / jugados.length) * 100) : 0;

  // --- Antigüedad -----------------------------------------------------------
  const temporadaAlta = temporadaDe(socio.alta);
  const temporadas = temporadaAlta
    ? temporadasEntre(temporadaAlta, TEMPORADA_ACTUAL).length
    : 0;

  // --- Dinero ---------------------------------------------------------------
  const aportado = cuotas
    .filter((c) => c.pagado)
    .reduce((t, c) => t + Number(c.importe || 0), 0);
  const pendiente = cuotas
    .filter((c) => !c.pagado)
    .reduce((t, c) => t + Number(c.importe || 0), 0);
  const aportacionMedia = cuotas.length ? Math.round(aportado / cuotas.length) : 0;
  // Lo que le cuesta cada partido al que de verdad viene. Es la cifra que
  // convierte "paga 95 €" en "le sale a 12 € el partido".
  const costePorPartido = asistidos.length
    ? Math.round((aportado / asistidos.length) * 100) / 100
    : 0;

  // --- Comparación con el resto del club ------------------------------------
  const comparables = socios.filter((s) => asisteAlCampo(s.tipo));
  const asistenciasDeTodos = comparables
    .map((s) => jugados.filter((p) => entradas[p.id]?.[s.id]).length)
    .sort((a, b) => b - a);
  const posicion = asistenciasDeTodos.filter((n) => n > asistidos.length).length + 1;
  const mediaClub = asistenciasDeTodos.length
    ? Math.round(
        (asistenciasDeTodos.reduce((a, b) => a + b, 0) / asistenciasDeTodos.length) * 10,
      ) / 10
    : 0;

  // --- Ritmos ---------------------------------------------------------------
  const horas = asistidos
    .map((a) => new Date(a.entrada).getHours() * 60 + new Date(a.entrada).getMinutes())
    .filter((m) => !Number.isNaN(m));
  const minutoMedio = horas.length
    ? Math.round(horas.reduce((a, b) => a + b, 0) / horas.length)
    : null;

  const idsAsistidos = new Set(asistidos.map((a) => a.jornada));
  const { mejor: rachaMejor, viva: rachaViva } = rachas(
    jugados.map((p) => idsAsistidos.has(p.id)),
  );

  // --- Por competición ------------------------------------------------------
  const porCompeticion = Object.values(
    jugados.reduce((m, p) => {
      const nombre = p.competicion || 'Histórico';
      const fila = m[nombre] || { competicion: nombre, jugados: 0, asistidos: 0 };
      fila.jugados++;
      if (idsAsistidos.has(p.id)) fila.asistidos++;
      m[nombre] = fila;
      return m;
    }, {}),
  ).map((f) => ({
    ...f,
    pct: f.jugados ? Math.round((f.asistidos / f.jugados) * 100) : 0,
  }));

  return {
    // Antigüedad
    temporadas,
    temporadaAlta,
    esFundador: esFundador(socio),
    // Asistencia
    partidos: asistidos,
    asistidos: asistidos.length,
    jornadasConDatos: jugados.length,
    pct,
    ausencias: jugados.length - asistidos.length,
    rachaMejor,
    rachaViva,
    primero: asistidos[0] || null,
    ultimo: asistidos.at(-1) || null,
    minutoMedio,
    porCompeticion,
    // Comparación
    posicion,
    deCuantos: comparables.length,
    mediaClub,
    cuentaParaAsistencia: asisteAlCampo(socio.tipo),
    // Dinero
    cuotas,
    aportado,
    pendiente,
    aportacionMedia,
    costePorPartido,
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
