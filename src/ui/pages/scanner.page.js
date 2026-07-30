// ============================================================================
//  src/ui/pages/scanner.page.js  ·  Escáner de QR y registro de accesos.
//  Solo hay ENTRADA: no existe modo salida. Cada resultado se muestra en un
//  pop-up grande a pantalla completa (verde = acceso válido, rojo = rechazo),
//  con sonido y vibración, y se cierra a mano para que el portero le dé
//  tiempo a leerlo antes de que desaparezca.
//
//  Jornada actual: el admin fija cuál es "la jornada de hoy" (ver
//  jornadas.page.js). Un portero (control_acceso) solo puede escanear en esa
//  jornada — así no puede dejarse seleccionada por error la del partido
//  anterior. El admin sí puede elegir cualquier otra, pero ve un aviso.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { hora } from '../../utils/format.js';
import { state, estaBloqueada } from '../../core/state.js';
import { carnetDe } from '../../config/app.config.js';
import { partidosDisponibles } from '../../services/competiciones.service.js';
import * as acceso from '../../services/acceso.service.js';
import * as socios from '../../services/socios.service.js';
import * as roles from '../../services/roles.service.js';
import { playSonido, vibrar } from '../sonidos.js';
import { iniciarCamara, pararCamara, camaraActiva, CamaraError } from '../camara.js';

export function initScanner() {
  rellenarSelect();
  on($('#partido-sel'), 'change', () => {
    state.partidoScanner = $('#partido-sel').value;
    actualizarAvisoJornada();
    renderLog();
  });
  on($('#btn-manual'), 'click', async () => {
    // manual: lo teclea el personal, no se le exige token de carnet.
    await escanear($('#manual-id').value, { manual: true });
    $('#manual-id').value = '';
  });
  on($('#btn-camara'), 'click', toggleCamara);
  on($('#popup-cerrar'), 'click', cerrarPopup);
  on($('#popup-scanner'), 'click', (e) => {
    if (e.target.id === 'popup-scanner') cerrarPopup();
  });
}

/** Nombre completo del socio, ya escapado. */
const nombreDe = (s) => esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim());

/**
 * Rellena el selector de jornada. Un portero (control_acceso, no admin) solo
 * ve la jornada actual fijada por el admin: no hay forma de que se le quede
 * seleccionada por error la del partido anterior. El admin ve todas.
 */
export function rellenarSelect() {
  const sel = $('#partido-sel');
  if (!sel) return;
  const soloActual = roles.puedeEscanear() && !roles.esAdmin();

  if (soloActual) {
    const jornada = state.jornadaActual;
    sel.innerHTML = jornada
      ? `<option value="${esc(jornada)}">${esc(jornada)}</option>`
      : '<option value="">— El admin aún no ha fijado la jornada actual —</option>';
    sel.value = jornada || '';
    sel.disabled = true;
    if (state.partidoScanner !== jornada) {
      state.partidoScanner = jornada || '';
    }
  } else {
    const partidos = partidosDisponibles(state.competiciones, [
      ...Object.keys(state.entradas),
      ...Object.keys(state.taquilla),
    ]);
    const previo = sel.value;
    sel.disabled = false;
    sel.innerHTML =
      '<option value="">— Selecciona jornada —</option>' +
      partidos
        .map(
          (p) =>
            `<option value="${esc(p.id)}">${esc(`${p.competicion ? p.competicion + ' · ' : ''}${p.nombre}`)}</option>`,
        )
        .join('');
    sel.value = previo;
    state.partidoScanner = sel.value;
  }
  actualizarAvisoJornada();
  renderLog();
}

/** Aviso para el admin cuando escanea fuera de la jornada actual fijada. */
function actualizarAvisoJornada() {
  const aviso = $('#aviso-jornada-distinta');
  if (!aviso) return;
  const distinta =
    roles.esAdmin() &&
    state.partidoScanner &&
    state.jornadaActual &&
    state.partidoScanner !== state.jornadaActual;
  aviso.style.display = distinta ? 'block' : 'none';
  if (distinta) {
    aviso.innerHTML = `⚠️ Esta NO es la jornada actual (la jornada actual configurada es
      <strong>${esc(state.jornadaActual)}</strong>). Estás en una jornada pasada o futura —
      revisa que no sea un error antes de fichar entradas aquí.`;
  }
}

export async function escanear(raw, opciones = {}) {
  const jornada = state.partidoScanner;
  const res = await acceso.procesarAcceso(raw, jornada, estaBloqueada(jornada), opciones);

  switch (res.estado) {
    case 'sin_jornada':
      return alert('Selecciona una jornada antes de escanear.');
    case 'bloqueada':
      return alert('🔒 Jornada cerrada. Desbloquéala para registrar entradas.');
    case 'desconocido':
      return mostrarPopup('error', `❌ No reconocido`, `Nº o documento: ${esc(res.id)}`);
    case 'qr_invalido':
      return mostrarPopup(
        'error',
        `🚫 CARNET NO VÁLIDO`,
        `nº ${esc(res.id)}<br>${motivoQr(res.motivo)}<br>
         Si reconoces a la persona como socia, valida a mano con su nº de carnet o DNI.`,
      );
    case 'repetido':
      return mostrarPopup(
        'error',
        `⛔ YA HA ENTRADO`,
        datosSocio(res.socio, [
          ['Abono', esc(res.socio.tipo)],
          ['Ya entró a las', hora(res.hora)],
        ]) +
          `<div class="popup-motivo">Este carnet ya registró su entrada en esta jornada.
           <strong>No puede volver a acceder.</strong></div>`,
        res.socio,
      );
    case 'valido':
      return mostrarPopup(
        'ok',
        `✅ ACCESO VÁLIDO`,
        datosSocio(res.socio, [
          ['Abono', esc(res.socio.tipo)],
          ['Nº de carnet', carnetDe(res.socio)],
          ['Documento', esc(res.socio.dni || '—')],
          ['Entrada', hora(res.hora)],
        ]),
        res.socio,
      );
  }
}

/**
 * Rejilla de datos del socio para el pop-up: pares etiqueta/valor grandes y
 * legibles de un vistazo desde la puerta. `filas` ya viene escapada por quien
 * la construye (arriba), así que aquí no se vuelve a escapar.
 */
function datosSocio(s, filas) {
  return `<div class="popup-datos">${filas
    .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
    .join('')}</div>`;
}

function motivoQr(motivo) {
  if (motivo === 'sin_token')
    return 'El QR no lleva código de seguridad. Hay que reemitir el carnet.';
  if (motivo === 'temporada_anterior')
    return 'Este QR es de una temporada anterior. Hay que reemitir el carnet desde la pestaña QR.';
  return 'El código de seguridad no coincide: el QR no es auténtico.';
}

// ============================================================================
//  Pop-up de resultado: a pantalla completa, con sonido y vibración. Se
//  cierra a mano (botón o tocando fuera de la tarjeta), nunca solo, para que
//  el portero tenga tiempo de leer el motivo de un rechazo.
// ============================================================================
function mostrarPopup(tipo, titulo, detalle, s) {
  playSonido(tipo);
  vibrar(tipo);
  // La cámara continúa leyendo: el resultado se actualiza con cada QR y el
  // operador no necesita cerrar este aviso para atender a la siguiente persona.
  const cont = $('#popup-scanner');
  const box = $('#popup-scanner-box');
  box.className = `popup-box ${tipo === 'ok' ? 'popup-ok' : 'popup-error'}`;
  box.innerHTML = `
    <div class="popup-titulo">${titulo}</div>
    ${s ? `<div class="popup-nombre">${nombreDe(s)}</div>` : ''}
    <div class="popup-detalle">${detalle}</div>
    <button class="btn btn-primary" id="popup-cerrar" style="margin-top:22px;width:100%">Cerrar</button>`;
  on($('#popup-cerrar'), 'click', cerrarPopup);
  cont.style.display = 'flex';
}

function cerrarPopup() {
  $('#popup-scanner').style.display = 'none';
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

  log.innerHTML = `
    <p class="nota">${ids.length} ${ids.length === 1 ? 'ha entrado' : 'han entrado'}.</p>
    <table><thead><tr><th>Nº</th><th>Socio</th><th>Entrada</th><th></th></tr></thead>
    <tbody>${ids
      .map((id) => {
        const s = socios.obtener(id) || { nombre: `(socio ${id})`, ap1: '' };
        return `<tr><td><code>${carnetDe(s) || esc(id)}</code></td>
        <td>${esc(`${s.nombre} ${s.ap1}`)}</td>
        <td>${hora(e[id])}</td>
        <td><button class="btn btn-danger" data-borrar="${esc(id)}">Borrar</button></td></tr>`;
      })
      .join('')}</tbody></table>`;

  log.querySelectorAll('[data-borrar]').forEach((el) =>
    on(el, 'click', async () => {
      if (estaBloqueada(jornada)) return alert('Jornada cerrada.');
      if (
        !confirm(
          '¿Borrar esta entrada? Su QR volverá a estar disponible en esta jornada.',
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
    btn.textContent = '📷 Escanear QR';
    return;
  }
  if (!state.partidoScanner) {
    return alert('Selecciona una jornada antes de escanear.');
  }
  try {
    wrap.style.display = 'block';
    await iniciarCamara(video, $('#camara-canvas'), escanear);
    btn.textContent = '⏹ Parar cámara';
  } catch (e) {
    wrap.style.display = 'none';
    // Un fallo del lector no es lo mismo que un fallo de la cámara, y el
    // mensaje genérico mandaba a revisar permisos que estaban bien.
    alert(
      e instanceof CamaraError
        ? e.message
        : 'No se pudo acceder a la cámara. Requiere HTTPS y permiso del navegador.',
    );
  }
}

export function pararCamaraSiActiva() {
  if (camaraActiva()) {
    pararCamara($('#camara-video'));
    $('#camara-wrap').style.display = 'none';
    $('#btn-camara').textContent = '📷 Escanear QR';
  }
}
