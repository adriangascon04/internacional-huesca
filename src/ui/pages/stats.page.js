// ============================================================================
//  src/ui/pages/stats.page.js  ·  Estadísticas y gráficos (Chart.js por CDN).
//
//  La pantalla está partida en cuatro subpestañas, cada una con UNA pregunta:
//    · resumen    — ¿cómo va la temporada y de dónde sale el dinero?
//    · socios     — ¿quiénes son y cuánto han pagado?
//    · taquilla   — ¿qué se vende en la puerta?
//    · asistencia — ¿quién viene al campo?
//
//  Los gráficos se pintan SOLO en la subpestaña visible. Chart.js mide el
//  contenedor al crearse, y un canvas dentro de un `display:none` mide 0: se
//  quedaba en una raya de un píxel que ya no se recuperaba al enseñar la
//  pestaña. Por eso cambiar de subpestaña vuelve a llamar a render().
// ============================================================================
import { $, $$, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros } from '../../utils/format.js';
import { state } from '../../core/state.js';
import { claseAsistencia, carnetDe, asisteAlCampo } from '../../config/app.config.js';
import {
  calcularStats,
  calcularAltasSocios,
  calcularEconomiaEntradas,
  calcularAsistencia,
  calcularDemografia,
} from '../../services/stats.service.js';

let chart = null;
let chartAsistencia = null;
let chartFranjas = null;
let chartFidelidad = null;
let chartAltas = null;

const SUBTABS = ['resumen', 'socios', 'taquilla', 'asistencia'];
let subtabActiva = 'resumen';

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
/** Cuerpo de tabla, o una fila de "sin datos" que ocupe todas las columnas. */
const filasO = (html, columnas, texto = 'Sin datos') =>
  html || `<tr><td colspan="${columnas}">${texto}</td></tr>`;

export function initStats() {
  $$('.subtab').forEach((btn) =>
    on(btn, 'click', () => cambiarSubtab(btn.dataset.subtab)),
  );
  cambiarSubtab(subtabActiva);
}

function cambiarSubtab(sub) {
  subtabActiva = SUBTABS.includes(sub) ? sub : SUBTABS[0];
  SUBTABS.forEach((s) => {
    $(`#substats-${s}`)?.classList.toggle('active', s === subtabActiva);
    $(`.subtab[data-subtab="${s}"]`)?.classList.toggle('active', s === subtabActiva);
  });
  render();
}

export function render() {
  // Una sola población de socios para TODAS las subpestañas. Cada función de
  // estadística filtraba por su cuenta y el mismo club salía con dos censos
  // distintos según la tarjeta que mirases. Ya no hay bajas de socio (un socio
  // que se quita se borra), pero el filtro se queda por si alguna ficha antigua
  // sigue marcada de baja.
  const socios = state.socios.filter((s) => s.activo !== false);

  const s = calcularStats({
    socios,
    entradas: state.entradas,
    taquilla: state.taquilla,
    competiciones: state.competiciones,
  });
  // Las cuotas se calculan UNA vez: las pinta su propia subpestaña y además
  // aportan el ingreso real con el que se reparte el total en el resumen.
  const altas = calcularAltasSocios({ socios });

  // Las tablas y las cifras se pintan siempre (son baratas y así no hay que
  // acordarse de repintarlas); los gráficos solo en la subpestaña visible.
  renderResumen(s, altas);
  renderSocios(s, altas, socios);
  renderTaquilla(s, altas);
  renderAsistencia(s, socios);
}

// ============================================================================
//  Resumen
// ============================================================================

function renderResumen(s, altas) {
  const e = calcularEconomiaEntradas({
    porJornada: s.porJornada,
    ingresoAltas: altas.ingresos,
  });

  $('#stats-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${s.totalSocios}</div><div class="stat-l">Socios</div></div>
    <div class="stat"><div class="stat-n">${s.jornadasConDatos}</div><div class="stat-l">Partidos con datos</div></div>
    <div class="stat"><div class="stat-n">${s.porJornada.reduce((a, j) => a + j.totalAsistentes, 0)}</div><div class="stat-l">Asistentes totales</div></div>
    <div class="stat"><div class="stat-n">${euros(e.ingresoTotal)}</div><div class="stat-l">Ingreso total de la temporada</div></div>
    <div class="stat"><div class="stat-n">${s.pendientesPago}</div><div class="stat-l">Socios pendientes de pago</div></div>`;

  $('#resumen-ingresos-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${euros(altas.ingresos)}</div><div class="stat-l">Cuotas de socio cobradas<br><small>${e.pctIngresoAltas}% del ingreso</small></div></div>
    <div class="stat"><div class="stat-n">${euros(e.recaudacionTaquilla)}</div><div class="stat-l">Taquilla<br><small>${e.pctIngresoTaquilla}% del ingreso</small></div></div>
    <div class="stat"><div class="stat-n">${euros(altas.pendientes)}</div><div class="stat-l">Cuotas pendientes de cobro</div></div>
    ${altas.ingresosNoAsisten ? `<div class="stat"><div class="stat-n">${euros(altas.ingresosNoAsisten)}</div><div class="stat-l">De socios que no van al campo<br><small>Abono Internacional</small></div></div>` : ''}`;

  $('#stats-recaudacion').textContent = euros(s.recaudacionTotal);

  $('#stats-tabla').innerHTML = filasO(
    s.porJornada
      .map((j) => {
        const p = s.baseAsistencia ? Math.round((j.nSocios / s.baseAsistencia) * 100) : 0;
        return `<tr><td>${esc(j.label)}</td>
      <td>${j.nSocios}${j.nSociosSinComputar ? ` <small style="color:var(--txt3)" title="Socios que no cuentan para el % de asistencia">+${j.nSociosSinComputar}</small>` : ''}</td>
      <td><span class="badge ${claseAsistencia(p)}">${p}%</span></td>
      <td>${j.nTaquilla}</td><td><strong>${j.totalAsistentes}</strong></td>
      <td>${euros(j.recaudacion)}</td></tr>`;
      })
      .join(''),
    6,
    'Todavía no hay ningún partido con datos.',
  );

  $('#stats-competiciones').innerHTML = filasO(
    s.porCompeticion
      .map(
        (c) =>
          `<tr><td>${esc(c.competicion)}</td><td>${c.partidos}</td><td>${c.asistentes}</td><td>${euros(c.recaudacion)}</td></tr>`,
      )
      .join(''),
    4,
  );
}

// ============================================================================
//  Socios: cuotas, reparto por abono, perfil demográfico.
// ============================================================================

function renderSocios(s, altas, socios) {
  $('#altas-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${altas.nuevosSocios}</div><div class="stat-l">Socios dados de alta</div></div>
    <div class="stat"><div class="stat-n">${euros(altas.ingresos)}</div><div class="stat-l">Cuotas cobradas</div></div>
    <div class="stat"><div class="stat-n">${euros(altas.pendientes)}</div><div class="stat-l">Pendiente de cobro</div></div>
    <div class="stat"><div class="stat-n">${euros(altas.nuevosSocios ? Math.round((altas.ingresos + altas.pendientes) / altas.nuevosSocios) : 0)}</div><div class="stat-l">Cuota media por socio</div></div>`;

  $('#altas-tabla').innerHTML = filasO(
    altas.porTipo
      .map(
        (t) =>
          `<tr><td>${esc(t.tipo)}${t.asiste ? '' : ' <small style="color:var(--txt3)">no asiste</small>'}</td>
           <td>${t.socios}</td><td>${euros(t.cuotaMedia)}</td>
           <td>${euros(t.ingresos)}</td><td>${euros(t.pendiente)}</td></tr>`,
      )
      .join(''),
    5,
  );

  const totalTipos = Object.values(s.tipos).reduce((a, n) => a + n, 0);
  $('#stats-tipos').innerHTML = filasO(
    Object.entries(s.tipos)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([t, n]) =>
          `<tr><td>${esc(t)}</td><td>${n}</td><td>${pct(n, totalTipos)}%</td>
           <td>${asisteAlCampo(t) ? 'Sí' : '<span class="badge badge-warn">No</span>'}</td></tr>`,
      )
      .join(''),
    4,
  );

  $('#socios-metodo-tabla').innerHTML = filasO(
    altas.porMetodoPago
      .map(
        (m) =>
          `<tr><td>${esc(m.metodo)}</td><td>${m.n}</td><td>${euros(m.importe)}</td></tr>`,
      )
      .join(''),
    3,
    'Todavía no se ha cobrado ninguna cuota.',
  );

  renderDemografia(socios);
  if (subtabActiva === 'socios') pintarAltas(altas);
}

function renderDemografia(socios) {
  const d = calcularDemografia({ socios });

  $('#demografia-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${d.totalActivos}</div><div class="stat-l">Socios</div></div>
    <div class="stat"><div class="stat-n">${d.edadMedia || '—'}</div><div class="stat-l">Edad media</div></div>
    <div class="stat"><div class="stat-n">${d.fundadores}</div><div class="stat-l">Socios fundadores</div></div>
    <div class="stat"><div class="stat-n">${d.noAsisten}</div><div class="stat-l">No cuentan para asistencia<br><small>Abono Internacional</small></div></div>
    <div class="stat"><div class="stat-n">${d.pendientes}</div><div class="stat-l">Pendientes de pago<br><small>${d.morosidadPct}% de morosidad</small></div></div>
    <div class="stat"><div class="stat-n">${pct(d.conEmail, d.totalActivos)}%</div><div class="stat-l">Con email<br><small>${pct(d.conTel, d.totalActivos)}% con teléfono</small></div></div>`;

  $('#demografia-edad-tabla').innerHTML =
    filasO(
      d.edades
        .map(
          (g) =>
            `<tr><td>${esc(g.label)} años</td><td>${g.socios}</td>
           <td><span class="badge badge-ok">${pct(g.socios, d.totalActivos)}%</span></td></tr>`,
        )
        .join(''),
      3,
    ) +
    (d.sinFecha
      ? `<tr><td>Sin fecha de nacimiento</td><td>${d.sinFecha}</td>
         <td><span class="badge badge-warn">${pct(d.sinFecha, d.totalActivos)}%</span></td></tr>`
      : '');

  $('#demografia-doc-tabla').innerHTML = filasO(
    d.porDoc
      .map(
        (t) =>
          `<tr><td>${esc(t.doc)}</td><td>${t.n}</td><td>${pct(t.n, d.totalActivos)}%</td></tr>`,
      )
      .join(''),
    3,
  );
}

// ============================================================================
//  Taquilla: economía de la venta de entradas.
// ============================================================================

function renderTaquilla(s, altas) {
  const e = calcularEconomiaEntradas({
    porJornada: s.porJornada,
    ingresoAltas: altas.ingresos,
  });

  $('#economia-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${euros(e.recaudacionTaquilla)}</div><div class="stat-l">Recaudación por entradas<br><small>${e.entradasVendidas} entradas vendidas</small></div></div>
    <div class="stat"><div class="stat-n">${euros(e.ticketMedioTaquilla)}</div><div class="stat-l">Ticket medio por entrada</div></div>
    <div class="stat"><div class="stat-n">${euros(e.recaudacionMediaJornada)}</div><div class="stat-l">Recaudación media por partido jugado</div></div>
    ${e.jornadaMax ? `<div class="stat"><div class="stat-n">${euros(e.jornadaMax.recaudacion)}</div><div class="stat-l">Mejor taquilla<br>${esc(e.jornadaMax.label)}</div></div>` : ''}
    ${e.jornadaMin ? `<div class="stat"><div class="stat-n">${euros(e.jornadaMin.recaudacion)}</div><div class="stat-l">Peor taquilla<br>${esc(e.jornadaMin.label)}</div></div>` : ''}`;

  $('#stats-entradas-tipos').innerHTML = filasO(
    s.tiposEntrada
      .map(
        (t) =>
          `<tr><td>${esc(t.nombre || t.tipo)}</td><td>${t.asistentes}</td><td>${euros(t.recaudacion)}</td>
           <td>${euros(t.asistentes ? Math.round(t.recaudacion / t.asistentes) : 0)}</td></tr>`,
      )
      .join(''),
    4,
    'Todavía no se ha vendido ninguna entrada.',
  );

  $('#taquilla-metodo-tabla').innerHTML = filasO(
    s.porMetodoPago
      .map(
        (m) =>
          `<tr><td>${esc(m.metodo)}</td><td>${m.n}</td><td>${euros(m.importe)}</td></tr>`,
      )
      .join(''),
    3,
    'Todavía no se ha vendido ninguna entrada.',
  );

  if (subtabActiva === 'taquilla') pintarGrafico(s);
}

// ============================================================================
//  Asistencia: jornada pico/valle, ranking de socios, tasa por tipo de abono.
// ============================================================================

function renderAsistencia(s, socios) {
  const a = calcularAsistencia({
    socios,
    entradas: state.entradas,
    porJornada: s.porJornada,
  });

  $('#asistencia-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${a.asistenciaMedia}</div><div class="stat-l">Asistencia media por jornada (socios)</div></div>
    <div class="stat"><div class="stat-n">${a.ocupacionMedia}%</div><div class="stat-l">Ocupación media<br><small>sobre ${a.base} socios que asisten</small></div></div>
    <div class="stat"><div class="stat-n">${a.fieles}</div><div class="stat-l">Socios con asistencia perfecta</div></div>
    <div class="stat"><div class="stat-n">${a.absentistas}</div><div class="stat-l">Absentistas<br><small>nunca han venido</small></div></div>
    <div class="stat"><div class="stat-n">${a.totalFichajes}</div><div class="stat-l">Fichajes totales registrados</div></div>
    ${a.horaPico ? `<div class="stat"><div class="stat-n">${String(a.horaPico.hora).padStart(2, '0')}:00</div><div class="stat-l">Hora punta de entrada<br><small>${a.horaPico.n} fichajes</small></div></div>` : ''}
    ${a.jornadaMax ? `<div class="stat"><div class="stat-n">${a.jornadaMax.nSocios}</div><div class="stat-l">Jornada con más asistencia<br>${esc(a.jornadaMax.label)}</div></div>` : ''}
    ${a.jornadaMin ? `<div class="stat"><div class="stat-n">${a.jornadaMin.nSocios}</div><div class="stat-l">Jornada con menos asistencia<br>${esc(a.jornadaMin.label)}</div></div>` : ''}`;

  $('#asistencia-tipos-tabla').innerHTML = filasO(
    a.porTipo
      .filter((t) => t.socios > 0)
      .map(
        (t) =>
          `<tr><td>${esc(t.tipo)}</td><td>${t.socios}</td><td>${t.mediaAsistencia}%</td></tr>`,
      )
      .join(''),
    3,
  );

  $('#asistencia-ranking-tabla').innerHTML = filasO(
    a.ranking
      .slice(0, 20)
      .map(
        (r) =>
          `<tr><td><code>${carnetDe(r.socio)}</code></td>
           <td>${esc(`${r.socio.nombre} ${r.socio.ap1}`)}</td>
           <td>${r.asistidas}</td><td>${r.pct}%</td></tr>`,
      )
      .join(''),
    4,
  );

  if (subtabActiva === 'asistencia') {
    pintarGraficoAsistencia(s);
    pintarFidelidad(a);
    pintarFranjas(a);
  }
}

// ============================================================================
//  Gráficos
// ============================================================================

const COLORES_TIPO = ['#185FA5', '#22c55e', '#eab308', '#E8354A', '#7c3aed', '#f97316'];

/**
 * Barras apiladas: una barra por partido, un color por tipo.
 *
 * Los dos desgloses (dinero y personas) son el MISMO dibujo con distinta
 * unidad, así que comparten esta función en vez de duplicar la configuración de
 * Chart.js. Solo cambian de dónde salen las filas de cada jornada, qué campo se
 * apila y cómo se escribe el número en el tooltip.
 *
 * @param {string} selector      Canvas donde pintar.
 * @param {object} cfg
 * @param {Array}  cfg.porJornada
 * @param {Array}  cfg.tipos     Series a pintar: {tipo, nombre}.
 * @param {Function} cfg.filas   (jornada) => filas de esa jornada.
 * @param {string} cfg.campo     Campo numérico de la fila que se apila.
 * @param {Function} cfg.formato Cómo se lee el valor en el tooltip.
 */
function graficoApilado(selector, { porJornada, tipos, filas, campo, formato }) {
  const ctx = $(selector);
  if (!ctx || typeof Chart === 'undefined') return null;

  // eslint-disable-next-line no-undef
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: porJornada.map((j) => j.label),
      datasets: tipos.map((t, i) => ({
        label: t.nombre || t.tipo,
        data: porJornada.map(
          (j) => filas(j).find((f) => f.tipo === t.tipo)?.[campo] || 0,
        ),
        backgroundColor: COLORES_TIPO[i % COLORES_TIPO.length],
        borderRadius: 4,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: { label: (c) => `${c.dataset.label}: ${formato(c.parsed.y)}` },
        },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

/** De dónde sale el dinero de cada partido. */
function pintarGrafico(s) {
  if (chart) chart.destroy();
  chart = graficoApilado('#chart-taquilla', {
    porJornada: s.porJornada,
    tipos: s.tiposEntrada,
    filas: (j) => j.porTipo,
    campo: 'recaudacion',
    formato: euros,
  });
}

/**
 * Quién llena el campo. No es la misma foto que la recaudación: los abonados
 * son la mayor parte de la asistencia y aportan 0 € en la puerta, así que en el
 * gráfico de dinero no se les ve.
 */
function pintarGraficoAsistencia(s) {
  if (chartAsistencia) chartAsistencia.destroy();
  chartAsistencia = graficoApilado('#chart-asistencia', {
    porJornada: s.porJornada,
    tipos: s.tiposAsistencia,
    filas: (j) => j.asistentesPorTipo,
    campo: 'asistentes',
    formato: (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`,
  });
}

function pintarAltas(f) {
  const ctx = $('#chart-altas');
  if (!ctx || typeof Chart === 'undefined') return;
  if (chartAltas) chartAltas.destroy();
  // eslint-disable-next-line no-undef
  chartAltas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: f.evolucion.map((e) => e.mes),
      datasets: [
        {
          label: 'Nuevos socios',
          data: f.evolucion.map((e) => e.socios),
          backgroundColor: '#185FA5',
          yAxisID: 'y',
        },
        {
          label: 'Ingresos (€)',
          data: f.evolucion.map((e) => e.ingresos),
          type: 'line',
          borderColor: '#22c55e',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } },
      },
    },
  });
}

/** Distribución de fidelidad: nº de socios según cuántas jornadas han venido. */
function pintarFidelidad(a) {
  const ctx = $('#chart-fidelidad');
  if (!ctx || typeof Chart === 'undefined') return;
  if (chartFidelidad) chartFidelidad.destroy();
  // eslint-disable-next-line no-undef
  chartFidelidad = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: a.distribucionFidelidad.map((d) => d.jornadas),
      datasets: [
        {
          label: 'Socios',
          data: a.distribucionFidelidad.map((d) => d.socios),
          backgroundColor: a.distribucionFidelidad.map((d) =>
            d.jornadas === 0 ? '#E8354A' : '#185FA5',
          ),
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Jornadas asistidas' } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

/** Franjas horarias: a qué hora del día entra la gente por la puerta. */
function pintarFranjas(a) {
  const ctx = $('#chart-franjas');
  if (!ctx || typeof Chart === 'undefined') return;
  if (chartFranjas) chartFranjas.destroy();
  // eslint-disable-next-line no-undef
  chartFranjas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: a.franjasHorarias.map((f) => String(f.hora).padStart(2, '0') + 'h'),
      datasets: [
        {
          label: 'Fichajes',
          data: a.franjasHorarias.map((f) => f.n),
          backgroundColor: '#22c55e',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}
