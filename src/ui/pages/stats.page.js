// ============================================================================
//  src/ui/pages/stats.page.js  ·  Estadísticas y gráfico (Chart.js por CDN).
// ============================================================================
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros } from '../../utils/format.js';
import { state } from '../../core/state.js';
import { claseAsistencia, carnetDe } from '../../config/app.config.js';
import {
  calcularStats,
  calcularFacturacion,
  calcularAsistencia,
  calcularDemografia,
} from '../../services/stats.service.js';

let chart = null;
let chartFranjas = null;
let chartFidelidad = null;

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export function render() {
  const s = calcularStats({
    socios: state.socios,
    entradas: state.entradas,
    taquilla: state.taquilla,
  });

  $('#stats-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${s.totalSocios}</div><div class="stat-l">Socios totales</div></div>
    <div class="stat"><div class="stat-n">${s.jornadasConDatos}</div><div class="stat-l">Jornadas con datos</div></div>
    <div class="stat"><div class="stat-n">${s.porJornada.reduce((a, j) => a + j.totalAsistentes, 0)}</div><div class="stat-l">Asistentes totales</div></div>
    <div class="stat"><div class="stat-n">${s.pendientesPago}</div><div class="stat-l">Pendientes de pago</div></div>`;

  $('#stats-tabla').innerHTML = s.porJornada
    .map((j) => {
      const pct = s.baseAsistencia ? Math.round((j.nSocios / s.baseAsistencia) * 100) : 0;
      const cls = claseAsistencia(pct);
      return `<tr><td>${esc(j.label)}</td><td>${j.nSocios}</td>
      <td><span class="badge ${cls}">${pct}%</span></td>
      <td>${j.nTaquilla}</td><td><strong>${j.totalAsistentes}</strong></td>
      <td>${euros(j.recaudacion)}</td></tr>`;
    })
    .join('');

  $('#stats-tipos').innerHTML =
    Object.entries(s.tipos)
      .map(([t, n]) => `<tr><td>${esc(t)}</td><td>${n}</td></tr>`)
      .join('') || '<tr><td colspan="2">Sin datos</td></tr>';

  $('#stats-recaudacion').textContent = euros(s.recaudacionTotal);
  pintarGrafico(s);
  renderDemografia();
  renderFacturacion(s);
  renderAsistencia(s);
}

// ============================================================================
//  Demografía y calidad de datos: edad, contacto, documentos, fundadores.
// ============================================================================

function renderDemografia() {
  const d = calcularDemografia({ socios: state.socios });

  $('#demografia-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${d.totalActivos}</div><div class="stat-l">Socios activos</div></div>
    <div class="stat"><div class="stat-n">${d.bajas}</div><div class="stat-l">Bajas</div></div>
    <div class="stat"><div class="stat-n">${d.edadMedia || '—'}</div><div class="stat-l">Edad media</div></div>
    <div class="stat"><div class="stat-n">${d.fundadores}</div><div class="stat-l">Socios fundadores</div></div>
    <div class="stat"><div class="stat-n">${d.pendientes}</div><div class="stat-l">Pendientes de pago<br><small>${d.morosidadPct}% de morosidad</small></div></div>
    <div class="stat"><div class="stat-n">${pct(d.conEmail, d.totalActivos)}%</div><div class="stat-l">Con email<br><small>${pct(d.conTel, d.totalActivos)}% con teléfono</small></div></div>`;

  $('#demografia-edad-tabla').innerHTML =
    d.edades
      .map(
        (g) =>
          `<tr><td>${esc(g.label)} años</td><td>${g.socios}</td>
           <td><span class="badge badge-ok">${pct(g.socios, d.totalActivos)}%</span></td></tr>`,
      )
      .join('') +
    (d.sinFecha
      ? `<tr><td>Sin fecha de nacimiento</td><td>${d.sinFecha}</td>
         <td><span class="badge badge-warn">${pct(d.sinFecha, d.totalActivos)}%</span></td></tr>`
      : '');

  $('#demografia-doc-tabla').innerHTML =
    d.porDoc
      .map(
        (t) =>
          `<tr><td>${esc(t.doc)}</td><td>${t.n}</td><td>${pct(t.n, d.totalActivos)}%</td></tr>`,
      )
      .join('') || '<tr><td colspan="3">Sin datos</td></tr>';
}

// ============================================================================
//  Facturación: cuotas de socio (cobrado/pendiente) + taquilla.
// ============================================================================

function renderFacturacion(s) {
  const f = calcularFacturacion({
    socios: state.socios,
    porJornada: s.porJornada,
  });

  $('#facturacion-cards').innerHTML = `
    <div class="stat"><div class="stat-n">${euros(f.cuotasCobradas)}</div><div class="stat-l">Cuotas cobradas</div></div>
    <div class="stat"><div class="stat-n">${euros(f.cuotasPendientes)}</div><div class="stat-l">Cuotas pendientes<br><small>${f.morosidadPct}% de morosidad</small></div></div>
    <div class="stat"><div class="stat-n">${euros(f.recaudacionTaquilla)}</div><div class="stat-l">Taquilla</div></div>
    <div class="stat"><div class="stat-n">${euros(f.totalEstimado)}</div><div class="stat-l">Facturación total estimada<br><small>(cuotas cobradas + taquilla)</small></div></div>
    <div class="stat"><div class="stat-n">${f.pctIngresoCuotas}% / ${f.pctIngresoTaquilla}%</div><div class="stat-l">Reparto del ingreso<br><small>cuotas / taquilla</small></div></div>
    <div class="stat"><div class="stat-n">${euros(f.ticketMedioTaquilla)}</div><div class="stat-l">Ticket medio de taquilla</div></div>
    <div class="stat"><div class="stat-n">${euros(f.recaudacionMediaJornada)}</div><div class="stat-l">Taquilla media por jornada</div></div>
    ${f.jornadaMax ? `<div class="stat"><div class="stat-n">${euros(f.jornadaMax.recaudacion)}</div><div class="stat-l">Mejor taquilla<br>${esc(f.jornadaMax.label)}</div></div>` : ''}
    ${f.jornadaMin ? `<div class="stat"><div class="stat-n">${euros(f.jornadaMin.recaudacion)}</div><div class="stat-l">Peor taquilla<br>${esc(f.jornadaMin.label)}</div></div>` : ''}`;

  $('#facturacion-tabla').innerHTML =
    f.porTipo
      .filter((t) => t.socios > 0)
      .map(
        (t) =>
          `<tr><td>${esc(t.tipo)}</td><td>${t.socios}</td><td>${euros(t.cobrado)}</td><td>${euros(t.pendiente)}</td></tr>`,
      )
      .join('') || '<tr><td colspan="4">Sin datos</td></tr>';
}

// ============================================================================
//  Asistencia: jornada pico/valle, ranking de socios, tasa por tipo de abono.
// ============================================================================

function renderAsistencia(s) {
  const a = calcularAsistencia({
    socios: state.socios,
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

  pintarFidelidad(a);
  pintarFranjas(a);

  $('#asistencia-tipos-tabla').innerHTML =
    a.porTipo
      .filter((t) => t.socios > 0)
      .map(
        (t) =>
          `<tr><td>${esc(t.tipo)}</td><td>${t.socios}</td><td>${t.mediaAsistencia}%</td></tr>`,
      )
      .join('') || '<tr><td colspan="3">Sin datos</td></tr>';

  $('#asistencia-ranking-tabla').innerHTML =
    a.ranking
      .slice(0, 20)
      .map(
        (r) =>
          `<tr><td><code>${carnetDe(r.socio)}</code></td>
           <td>${esc(`${r.socio.nombre} ${r.socio.ap1}`)}</td>
           <td>${r.asistidas}</td><td>${r.pct}%</td></tr>`,
      )
      .join('') || '<tr><td colspan="4">Sin datos</td></tr>';
}

function pintarGrafico(s) {
  const ctx = $('#chart-taquilla');
  if (!ctx || typeof Chart === 'undefined') return;
  if (chart) chart.destroy();
  // Tendencia: media móvil simple de 3 jornadas.
  const totales = s.porJornada.map((j) => j.totalAsistentes);
  const tendencia = totales.map((_, i) => {
    const ventana = totales.slice(Math.max(0, i - 2), i + 1);
    return Math.round(ventana.reduce((a, b) => a + b, 0) / ventana.length);
  });

  // eslint-disable-next-line no-undef
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: s.porJornada.map((j) => 'J' + j.label.split('Jornada ')[1]),
      datasets: [
        {
          label: 'Socios',
          data: s.porJornada.map((j) => j.nSocios),
          backgroundColor: '#185FA5',
          borderRadius: 4,
        },
        {
          label: 'Taquilla',
          data: s.porJornada.map((j) => j.nTaquilla),
          backgroundColor: '#888',
          borderRadius: 4,
        },
        {
          label: 'Tendencia (media 3)',
          data: tendencia,
          type: 'line',
          borderColor: '#eab308',
          tension: 0.35,
          pointRadius: 3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
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
