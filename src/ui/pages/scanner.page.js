// ============================================================================
//  src/ui/pages/scanner.page.js  ·  Escáner de QR y registro de accesos.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { hora } from '../../utils/format.js';
import { state, estaBloqueada } from '../../core/state.js';
import { getPartidos, getPartidosLabel } from '../../config/app.config.js';
import * as acceso from '../../services/acceso.service.js';
import * as socios from '../../services/socios.service.js';
import { playSonido } from '../sonidos.js';

export function initScanner() {
  rellenarSelect();
  on($('#partido-sel'), 'change', () => {
    state.partidoScanner = $('#partido-sel').value;
    $('#scan-result').innerHTML = '';
    renderLog();
  });
  on($('#btn-manual'), 'click', async () => {
    await escanear($('#manual-id').value);
    $('#manual-id').value = '';
  });
}

function rellenarSelect() {
  const partidos = getPartidos();
  const labels = getPartidosLabel();
  const html =
    '<option value="">— Selecciona jornada —</option>' +
    partidos
      .map((p, i) => `<option value="${esc(p)}">${esc(labels[i])}</option>`)
      .join('');
  $('#partido-sel').innerHTML = html;
}

export async function escanear(raw) {
  const jornada = state.partidoScanner;
  const res = await acceso.procesarAcceso(raw, jornada, estaBloqueada(jornada));
  const out = $('#scan-result');

  switch (res.estado) {
    case 'sin_jornada':
      out.innerHTML =
        '<div class="scanner-result result-no">Selecciona una jornada antes de escanear.</div>';
      break;
    case 'bloqueada':
      out.innerHTML =
        '<div class="scanner-result result-no">🔒 Jornada cerrada. Desbloquéala para registrar entradas.</div>';
      break;
    case 'desconocido':
      playSonido('error');
      out.innerHTML = `<div class="scanner-result result-no">❌ QR no reconocido: ${esc(res.id)}</div>`;
      break;
    case 'repetido':
      playSonido('error');
      out.innerHTML = `<div class="scanner-result result-no">⚠️ QR ya utilizado — ${esc(`${res.socio.nombre} ${res.socio.ap1}`)}<br>
        <small>Entrada registrada a las ${hora(res.hora)}. No puede volver a entrar en esta jornada.</small></div>`;
      break;
    case 'valido':
      playSonido('ok');
      out.innerHTML = `<div class="scanner-result result-entrada">✅ ACCESO VÁLIDO — ${esc(`${res.socio.nombre} ${res.socio.ap1} ${res.socio.ap2 || ''}`)}<br>
        <small>${esc(res.socio.tipo)} · ${esc(res.socio.id)} · ${hora(res.hora)}</small></div>`;
      break;
  }
}

export function renderLog() {
  const log = $('#log-entradas');
  const jornada = state.partidoScanner;
  const e = state.entradas[jornada];
  if (!jornada || !e) {
    log.innerHTML = '';
    return;
  }
  const ids = Object.keys(e).sort((a, b) => new Date(e[b]) - new Date(e[a]));
  if (!ids.length) {
    log.innerHTML = '<p class="empty">Sin entradas registradas aún.</p>';
    return;
  }

  log.innerHTML = `<table><thead><tr><th>ID</th><th>Socio</th><th>Hora</th><th></th></tr></thead><tbody>${ids
    .map((id) => {
      const s = socios.obtener(id) || { nombre: id, ap1: '' };
      return `<tr><td><code>${esc(id)}</code></td><td>${esc(`${s.nombre} ${s.ap1}`)}</td>
        <td>${hora(e[id])}</td>
        <td><button class="btn btn-danger" data-borrar="${esc(id)}">Borrar</button></td></tr>`;
    })
    .join('')}</tbody></table>`;

  log.querySelectorAll('[data-borrar]').forEach((el) =>
    on(el, 'click', async () => {
      if (estaBloqueada(jornada)) return alert('Jornada cerrada.');
      if (
        !confirm(
          '¿Borrar este registro de entrada? Su QR volverá a estar disponible en esta jornada.',
        )
      )
        return;
      await acceso.borrarAcceso(el.dataset.borrar, jornada);
    }),
  );
}
