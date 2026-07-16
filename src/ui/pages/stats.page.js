// ============================================================================
//  src/ui/pages/stats.page.js  ·  Estadísticas y gráfico (Chart.js por CDN).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { euros } from '../../utils/format.js';
import { state } from '../../core/state.js';
import {
  claseAsistencia,
  getPartidos,
  getPartidosLabel,
  FRANJA_MINUTOS,
} from '../../config/app.config.js';
import { calcularStats, calcularAfluencia } from '../../services/stats.service.js';

let chart = null;
let chartAfluencia = null;
let selectorListo = false;

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
  renderAfluencia();
}

// ============================================================================
//  Afluencia: a qué hora entra y sale la gente.
// ============================================================================

function renderAfluencia() {
  const sel = $('#afluencia-jornada');
  if (!sel) return;

  // El selector se rellena una vez: repintarlo en cada snapshot le borraría al
  // usuario la jornada que acaba de elegir.
  if (!selectorListo) {
    const partidos = getPartidos();
    const labels = getPartidosLabel();
    sel.innerHTML =
      '<option value="">Todas las jornadas jugadas</option>' +
      partidos
        .map((p, i) => `<option value="${esc(p)}">${esc(labels[i])}</option>`)
        .join('');
    on(sel, 'change', renderAfluencia);
    selectorListo = true;
  }

  const elegida = sel.value;
  const jornadas = elegida ? [elegida] : getPartidos();
  const a = calcularAfluencia({
    entradas: state.entradas,
    salidas: state.salidas,
    jornadas,
  });

  const resumen = $('#afluencia-resumen');
  if (!a.franjas.length) {
    resumen.innerHTML = '<p class="empty">Todavía no hay fichajes en esta selección.</p>';
    $('#chart-afluencia').style.display = 'none';
    return;
  }
  $('#chart-afluencia').style.display = '';

  const sinFichar = a.totalEntradas - a.totalSalidas;
  resumen.innerHTML = `
    <div class="stat"><div class="stat-n">${esc(a.pico.label)}</div><div class="stat-l">Franja de más gente${a.nJornadas > 1 ? `<br>(${a.nJornadas} jornadas juntas)` : ''}</div></div>
    <div class="stat"><div class="stat-n">${a.pico.dentro}</div><div class="stat-l">Personas dentro en ese momento</div></div>
    <div class="stat"><div class="stat-n">${a.totalEntradas}</div><div class="stat-l">Entradas fichadas</div></div>
    <div class="stat"><div class="stat-n">${a.totalSalidas}</div><div class="stat-l">Salidas fichadas</div></div>`;

  const nota = $('#afluencia-nota');
  nota.innerHTML =
    sinFichar > 0
      ? `⚠️ <strong>${sinFichar}</strong> ${sinFichar === 1 ? 'persona entró y no fichó' : 'personas entraron y no ficharon'} la salida, así que la curva de "dentro"
         se queda alta al final y el nº de personas dentro es un máximo, no un dato exacto.
         La <strong>hora del pico sí es fiable</strong>. Cuantas más salidas se fichen, más fina será la curva.`
      : `Todas las entradas tienen su salida fichada: la curva es fiable de principio a fin.`;

  pintarGraficoAfluencia(a);
}

function pintarGraficoAfluencia(a) {
  const ctx = $('#chart-afluencia');
  if (!ctx || typeof Chart === 'undefined') return;
  if (chartAfluencia) chartAfluencia.destroy();

  // eslint-disable-next-line no-undef
  chartAfluencia = new Chart(ctx, {
    data: {
      labels: a.franjas.map((f) => f.label),
      datasets: [
        {
          label: 'Dentro del campo',
          data: a.franjas.map((f) => f.dentro),
          type: 'line',
          borderColor: '#4D9FE8',
          backgroundColor: 'rgba(34,119,199,.18)',
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          order: 2,
        },
        {
          label: 'Entran',
          data: a.franjas.map((f) => f.entradas),
          type: 'bar',
          backgroundColor: '#22c55e',
          borderRadius: 3,
          order: 1,
        },
        {
          label: 'Salen',
          data: a.franjas.map((f) => f.salidas),
          type: 'bar',
          backgroundColor: '#E8354A',
          borderRadius: 3,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => `${items[0].label} – ${etiquetaFin(items[0].label)}`,
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

/** "19:15" -> "19:30": el tooltip enseña la franja entera, no solo su inicio. */
function etiquetaFin(label) {
  const [h, m] = label.split(':').map(Number);
  const fin = (h * 60 + m + FRANJA_MINUTOS) % 1440;
  return `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
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
