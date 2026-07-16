// ============================================================================
//  src/ui/pages/scanner.page.js  ·  Escáner de QR y registro de accesos.
//  Dos modos: ENTRADA y SALIDA. El modo es del portero, no de la jornada, y
//  se pinta bien visible porque fichar una salida creyendo que es una entrada
//  (o al revés) es el error caro de este panel.
// ============================================================================
import { $, $$, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { hora, duracion } from '../../utils/format.js';
import { state, estaBloqueada } from '../../core/state.js';
import { getPartidos, getPartidosLabel, carnetDe } from '../../config/app.config.js';
import * as acceso from '../../services/acceso.service.js';
import * as socios from '../../services/socios.service.js';
import { playSonido } from '../sonidos.js';
import { iniciarCamara, pararCamara, camaraActiva } from '../camara.js';

export function initScanner() {
  rellenarSelect();
  on($('#partido-sel'), 'change', () => {
    state.partidoScanner = $('#partido-sel').value;
    $('#scan-result').innerHTML = '';
    renderLog();
  });
  on($('#btn-manual'), 'click', async () => {
    // manual: lo teclea el personal, no se le exige token de carnet.
    await escanear($('#manual-id').value, { manual: true });
    $('#manual-id').value = '';
  });
  on($('#btn-camara'), 'click', toggleCamara);
  $$('[data-modo]').forEach((btn) =>
    on(btn, 'click', () => cambiarModo(btn.dataset.modo)),
  );
  cambiarModo(state.modoScanner);
}

function cambiarModo(modo) {
  state.modoScanner = modo;
  $$('[data-modo]').forEach((b) =>
    b.classList.toggle('modo-activo', b.dataset.modo === modo),
  );
  const salida = modo === acceso.MODO_SALIDA;
  $('#scanner-panel').classList.toggle('modo-salida', salida);
  $('#manual-id').placeholder = salida
    ? 'Nº de carnet que SALE'
    : 'Nº de carnet (ej. 42) o texto del QR';
  $('#scan-result').innerHTML = '';
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

/** Nombre completo del socio, ya escapado. */
const nombreDe = (s) => esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim());

export async function escanear(raw, opciones = {}) {
  const jornada = state.partidoScanner;
  const res = await acceso.procesarAcceso(raw, jornada, estaBloqueada(jornada), {
    ...opciones,
    modo: state.modoScanner,
  });
  const out = $('#scan-result');
  const pintar = (clase, html) => {
    out.innerHTML = `<div class="scanner-result ${clase}">${html}</div>`;
  };

  switch (res.estado) {
    case 'sin_jornada':
      pintar('result-no', 'Selecciona una jornada antes de escanear.');
      break;
    case 'bloqueada':
      pintar('result-no', '🔒 Jornada cerrada. Desbloquéala para registrar entradas.');
      break;
    case 'desconocido':
      playSonido('error');
      pintar('result-no', `❌ QR no reconocido: ${esc(res.id)}`);
      break;
    case 'qr_invalido':
      playSonido('error');
      pintar(
        'result-no',
        `🚫 CARNET NO VÁLIDO — nº ${esc(res.id)}<br>
         <small>${
           res.motivo === 'sin_token'
             ? 'El QR no lleva código de seguridad. Hay que reemitir el carnet.'
             : 'El código de seguridad no coincide: el QR no es auténtico o el carnet es de una temporada anterior.'
         }<br>Si reconoces a la persona como socia, valida a mano con su nº de carnet.</small>`,
      );
      break;
    case 'repetido':
      playSonido('error');
      pintar(
        'result-no',
        `⚠️ QR ya utilizado — ${nombreDe(res.socio)}<br>
         <small>Entrada registrada a las ${hora(res.hora)}. No puede volver a entrar en esta jornada.</small>`,
      );
      break;
    case 'valido':
      playSonido('ok');
      pintar(
        'result-entrada',
        `✅ ACCESO VÁLIDO — ${nombreDe(res.socio)}<br>
         <small>${esc(res.socio.tipo)} · nº ${carnetDe(res.socio)} · ${hora(res.hora)}</small>`,
      );
      break;
    // --- modo salida --------------------------------------------------------
    case 'sin_entrada':
      playSonido('error');
      pintar(
        'result-no',
        `❌ NO CONSTA SU ENTRADA — ${nombreDe(res.socio)}<br>
         <small>No se puede fichar la salida de quien no ha entrado. ¿Tienes el modo correcto?</small>`,
      );
      break;
    case 'salida_repetida':
      playSonido('error');
      pintar(
        'result-no',
        `⚠️ SALIDA YA FICHADA — ${nombreDe(res.socio)}<br>
         <small>Salió a las ${hora(res.hora)}.</small>`,
      );
      break;
    case 'salida_ok':
      playSonido('ok');
      pintar(
        'result-salida',
        `🚪 SALIDA REGISTRADA — ${nombreDe(res.socio)}<br>
         <small>nº ${carnetDe(res.socio)} · ${hora(res.hora)} · estuvo ${duracion(res.minutos)}</small>`,
      );
      break;
  }
}

export function renderLog() {
  const log = $('#log-entradas');
  const jornada = state.partidoScanner;
  const e = state.entradas[jornada];
  const sal = state.salidas[jornada] || {};
  if (!jornada || !e) {
    log.innerHTML = '';
    return;
  }
  const ids = Object.keys(e).sort((a, b) => new Date(e[b]) - new Date(e[a]));
  if (!ids.length) {
    log.innerHTML = '<p class="empty">Sin entradas registradas aún.</p>';
    return;
  }

  const dentro = ids.filter((id) => !sal[id]).length;
  log.innerHTML = `
    <p class="nota">${ids.length} han entrado · <strong style="color:var(--verde)">${dentro} siguen dentro</strong> · ${ids.length - dentro} se han ido.</p>
    <table><thead><tr><th>Nº</th><th>Socio</th><th>Entrada</th><th>Salida</th><th>Dentro</th><th></th></tr></thead>
    <tbody>${ids
      .map((id) => {
        const s = socios.obtener(id) || { nombre: `(socio ${id})`, ap1: '' };
        const salida = sal[id];
        return `<tr><td><code>${carnetDe(s) || esc(id)}</code></td>
        <td>${esc(`${s.nombre} ${s.ap1}`)}</td>
        <td>${hora(e[id])}</td>
        <td>${salida ? hora(salida) : '<span class="badge badge-ok">dentro</span>'}</td>
        <td>${salida ? duracion(acceso.minutosEntre(e[id], salida)) : '—'}</td>
        <td><button class="btn btn-danger" data-borrar="${esc(id)}">Borrar</button></td></tr>`;
      })
      .join('')}</tbody></table>`;

  log.querySelectorAll('[data-borrar]').forEach((el) =>
    on(el, 'click', async () => {
      if (estaBloqueada(jornada)) return alert('Jornada cerrada.');
      if (
        !confirm(
          '¿Borrar este registro? Se borran su entrada y su salida, y su QR volverá a estar disponible en esta jornada.',
        )
      )
        return;
      await acceso.borrarAcceso(el.dataset.borrar, jornada);
    }),
  );
}

async function toggleCamara() {
  const wrap = $('#camara-wrap');
  const video = $('#camara-video');
  const btn = $('#btn-camara');

  if (camaraActiva()) {
    pararCamara(video);
    wrap.style.display = 'none';
    btn.textContent = '📷 Activar cámara';
    return;
  }
  if (!state.partidoScanner) {
    return alert('Selecciona una jornada antes de escanear.');
  }
  try {
    wrap.style.display = 'block';
    await iniciarCamara(video, $('#camara-canvas'), escanear);
    btn.textContent = '⏹ Parar cámara';
  } catch {
    wrap.style.display = 'none';
    alert('No se pudo acceder a la cámara. Requiere HTTPS y permiso del navegador.');
  }
}

export function pararCamaraSiActiva() {
  if (camaraActiva()) {
    pararCamara($('#camara-video'));
    $('#camara-wrap').style.display = 'none';
    $('#btn-camara').textContent = '📷 Activar cámara';
  }
}
