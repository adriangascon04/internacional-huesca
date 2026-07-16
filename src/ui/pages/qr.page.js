// ============================================================================
//  src/ui/pages/qr.page.js  ·  Generación de QRs (individual y ZIP masivo).
//  Depende de qrcodejs, JSZip y FileSaver (cargados por CDN en index.html).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { QR_PREFIX, QR_SEPARADOR, carnetDe } from '../../config/app.config.js';
import * as socios from '../../services/socios.service.js';
import * as roles from '../../services/roles.service.js';

export function initQr() {
  on($('#qr-socio'), 'change', previewQR);
  on($('#btn-descargar-qr'), 'click', descargarQR);
  on($('#btn-zip-qr'), 'click', descargarTodosZip);
}

/** Rellena el desplegable de socios. Se llama al cambiar la lista. */
export function rellenarSelect() {
  const sel = $('#qr-socio');
  if (!sel) return;
  const previo = sel.value;
  sel.innerHTML =
    '<option value="">— Selecciona socio —</option>' +
    socios
      .getSociosActivos()
      .map(
        // value = id interno (estable); texto = nº de carnet (el que ve la gente)
        (s) =>
          `<option value="${esc(s.id)}">${esc(`${carnetDe(s)} — ${s.nombre} ${s.ap1}`)}</option>`,
      )
      .join('');
  sel.value = previo;
}

/**
 * Texto del QR: "HUESCA:<nº carnet>:<token>".
 * Lleva el nº de CARNET, no el id interno, porque es el número que va impreso
 * al lado y el que el portero teclea si el QR no lee: un solo número visible,
 * sin dos numeraciones que confundir.
 * Que ese número se reutilice al renumerar es inofensivo porque el token va
 * dentro: el carnet del antiguo nº 3 no valida contra el nuevo nº 3.
 */
export const textoQr = (carnet, token) =>
  token ? `${QR_PREFIX}${carnet}${QR_SEPARADOR}${token}` : `${QR_PREFIX}${carnet}`;

/**
 * Token con el que emitir el carnet. Si el socio no tiene (viene de antes de
 * los QR firmados) se le crea aquí. Un rol sin permiso para escribir socios no
 * puede crearlo: en ese caso se emite el QR antiguo en vez de reventar.
 */
async function tokenParaQr(id) {
  const s = socios.obtener(id);
  if (s?.tokenQR) return s.tokenQR;
  if (!roles.puedeGestionarSocios()) return null;
  try {
    return await socios.asegurarTokenQR(id);
  } catch {
    return null;
  }
}

async function previewQR() {
  const id = $('#qr-socio').value;
  const cont = $('#qr-preview');
  cont.innerHTML = '';
  if (!id) return;
  const s = socios.obtener(id);
  if (!s) return;

  const token = await tokenParaQr(id);
  const box = document.createElement('div');
  cont.appendChild(box);
  // eslint-disable-next-line no-undef
  new QRCode(box, {
    text: textoQr(carnetDe(s), token),
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Datos del socio: SIEMPRE escapados (antes se interpolaban en crudo).
  const info = document.createElement('p');
  info.innerHTML = `<strong>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim())}</strong><br>
    <small>Carnet nº ${carnetDe(s)} · ${esc(s.tipo)}</small>`;
  cont.appendChild(info);
}

function canvasDeQr(cont) {
  return cont.querySelector('canvas') || cont.querySelector('img');
}

function descargarQR() {
  const id = $('#qr-socio').value;
  if (!id) return alert('Selecciona un socio.');
  const el = canvasDeQr($('#qr-preview'));
  if (!el) return;
  const a = document.createElement('a');
  a.href = el.toDataURL ? el.toDataURL('image/png') : el.src;
  a.download = `QR_socio_${carnetDe(socios.obtener(id))}.png`;
  a.click();
}

/** Genera un ZIP con el QR de todos los socios activos. */
async function descargarTodosZip() {
  const msg = $('#qr-zip-msg');
  const lista = socios.getSociosActivos();
  if (!lista.length) return;
  msg.textContent = 'Generando QRs…';
  // eslint-disable-next-line no-undef
  const zip = new JSZip();
  const temp = document.createElement('div');
  temp.style.display = 'none';
  document.body.appendChild(temp);

  let hecho = 0;
  for (const s of lista) {
    // Asigna token a los socios que aún no lo tengan: el ZIP es justo el
    // momento de la reemisión masiva de carnets.
    const token = await tokenParaQr(s.id);
    msg.textContent = `Generando QRs… ${++hecho}/${lista.length}`;
    temp.innerHTML = '';
    // eslint-disable-next-line no-undef
    new QRCode(temp, {
      text: textoQr(carnetDe(s), token),
      width: 300,
      height: 300,
      correctLevel: QRCode.CorrectLevel.H,
    });
    await new Promise((r) => setTimeout(r, 30)); // dar tiempo a pintar
    const el = canvasDeQr(temp);
    const dataUrl = el.toDataURL ? el.toDataURL('image/png') : el.src;
    // El nº va con ceros delante para que el ZIP salga ordenado por carnet y
    // no en el orden alfabético "1, 10, 100, 11" que da el explorador.
    const nombreArchivo = `QR_${String(carnetDe(s)).padStart(4, '0')}_${s.nombre}_${s.ap1}.png`;
    zip.file(nombreArchivo.replace(/[^\w.-]/g, '_'), dataUrl.split(',')[1], {
      base64: true,
    });
  }
  temp.remove();
  const blob = await zip.generateAsync({ type: 'blob' });
  // eslint-disable-next-line no-undef
  saveAs(blob, 'QRs_InternacionalHuesca.zip');
  msg.textContent = `${lista.length} QRs generados.`;
}
