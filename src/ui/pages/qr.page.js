// ============================================================================
//  src/ui/pages/qr.page.js  ·  Generación de QRs (individual y ZIP masivo).
//  Depende de qrcodejs, JSZip y FileSaver (cargados por CDN en index.html).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { QR_PREFIX } from '../../config/app.config.js';
import * as socios from '../../services/socios.service.js';

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
        (s) =>
          `<option value="${esc(s.id)}">${esc(`${s.id} — ${s.nombre} ${s.ap1}`)}</option>`,
      )
      .join('');
  sel.value = previo;
}

/** Construye el texto del QR de un socio. Formato: "HUESCA:<id>". */
export const textoQr = (id) => `${QR_PREFIX}${id}`;

function previewQR() {
  const id = $('#qr-socio').value;
  const cont = $('#qr-preview');
  cont.innerHTML = '';
  if (!id) return;
  const s = socios.obtener(id);
  if (!s) return;

  const box = document.createElement('div');
  cont.appendChild(box);
  // eslint-disable-next-line no-undef
  new QRCode(box, {
    text: textoQr(id),
    width: 220,
    height: 220,
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Datos del socio: SIEMPRE escapados (antes se interpolaban en crudo).
  const info = document.createElement('p');
  info.innerHTML = `<strong>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`)}</strong><br>
    <small>Socio nº ${esc(s.id)} · ${esc(s.tipo)}</small>`;
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
  a.download = `QR_socio_${id}.png`;
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

  for (const s of lista) {
    temp.innerHTML = '';
    // eslint-disable-next-line no-undef
    new QRCode(temp, {
      text: textoQr(s.id),
      width: 300,
      height: 300,
      correctLevel: QRCode.CorrectLevel.H,
    });
    await new Promise((r) => setTimeout(r, 30)); // dar tiempo a pintar
    const el = canvasDeQr(temp);
    const dataUrl = el.toDataURL ? el.toDataURL('image/png') : el.src;
    zip.file(
      `QR_${s.id}_${s.nombre}_${s.ap1}.png`.replace(/[^\w.-]/g, '_'),
      dataUrl.split(',')[1],
      { base64: true },
    );
  }
  temp.remove();
  const blob = await zip.generateAsync({ type: 'blob' });
  // eslint-disable-next-line no-undef
  saveAs(blob, 'QRs_InternacionalHuesca.zip');
  msg.textContent = `${lista.length} QRs generados.`;
}
