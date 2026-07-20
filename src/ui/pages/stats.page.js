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
} from '../../services/stats.service.js';

let chart = null;

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
  renderFacturacion(s);
  renderAsistencia(s);
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
    <div class="stat"><div class="stat-n">${euros(f.cuotasPendientes)}</div><div class="stat-l">Cuotas pendientes</div></div>
    <div class="stat"><div class="stat-n">${euros(f.recaudacionTaquilla)}</div><div class="stat-l">Taquilla</div></div>
    <div class="stat"><div class="stat-n">${euros(f.totalEstimado)}</div><div class="stat-l">Facturación total estimada<br><small>(cuotas cobradas + taquilla)</small></div></div>
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
    ${a.jornadaMax ? `<div class="stat"><div class="stat-n">${a.jornadaMax.nSocios}</div><div class="stat-l">Jornada con más asistencia<br>${esc(a.jornadaMax.label)}</div></div>` : ''}
    ${a.jornadaMin ? `<div class="stat"><div class="stat-n">${a.jornadaMin.nSocios}</div><div class="stat-l">Jornada con menos asistencia<br>${esc(a.jornadaMin.label)}</div></div>` : ''}`;

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
