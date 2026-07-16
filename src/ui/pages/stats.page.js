// ============================================================================
//  src/ui/pages/stats.page.js  ·  Estadísticas y gráfico (Chart.js por CDN).
// ============================================================================
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros } from '../../utils/format.js';
import { state } from '../../core/state.js';
import { claseAsistencia } from '../../config/app.config.js';
import { calcularStats } from '../../services/stats.service.js';

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
