// ============================================================================
//  src/ui/pages/socios.page.js
//  Listado, alta, edición y perfil de socios.
//  Todo dato de usuario se pinta con `safe`/`esc` -> sin XSS (Upgrades #10).
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { fecha, antiguedad } from '../../utils/format.js';
import { state } from '../../core/state.js';
import { esFundador, TIPOS_ABONO, getPartidos } from '../../config/app.config.js';
import * as socios from '../../services/socios.service.js';
import * as roles from '../../services/roles.service.js';

let perfilActualId = null;

export function initSocios() {
  // Rellenar el select de tipos desde la config (antes estaba en el HTML).
  $('#f-tipo').innerHTML =
    '<option value="">— Selecciona —</option>' +
    TIPOS_ABONO.map((t) => `<option>${esc(t.id)}</option>`).join('');

  on($('#buscador'), 'input', render);
  on($('#btn-alta'), 'click', onAlta);
  on($('#btn-guardar-obs'), 'click', onGuardarObs);
  on($('#btn-cerrar-perfil'), 'click', () => {
    $('#modal-perfil').style.display = 'none';
  });
  on($('#btn-export-csv'), 'click', exportarCSV);
}

export function render() {
  const q = ($('#buscador')?.value || '').toLowerCase();
  const lista = socios
    .getSociosActivos()
    .filter((s) => `${s.nombre} ${s.ap1} ${s.ap2} ${s.dni}`.toLowerCase().includes(q));

  $('#total-socios').textContent = socios.getSociosActivos().length;
  const tbody = $('#tabla-socios');
  const empty = $('#tabla-empty');
  if (!lista.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const admin = roles.puedeGestionarSocios();
  tbody.innerHTML = lista
    .map(
      (s) => `
    <tr>
      <td><code>${esc(s.id)}</code></td>
      <td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`)}${esFundador(s) ? ' <span title="Socio Fundador">⭐</span>' : ''}</td>
      <td>${esc(s.dni)}</td>
      <td>${esc(s.tipo)}</td>
      <td style="text-align:center">
        <input type="checkbox" data-pagado="${esc(s.id)}" ${s.pagado ? 'checked' : ''} ${admin ? '' : 'disabled'}>
      </td>
      <td>
        <button class="btn" data-perfil="${esc(s.id)}">👤 Perfil</button>
        ${admin ? `<button class="btn btn-danger" data-baja="${esc(s.id)}">Dar de baja</button>` : ''}
      </td>
    </tr>`,
    )
    .join('');

  // Delegación de eventos (nada de onclick="" con datos interpolados).
  tbody
    .querySelectorAll('[data-pagado]')
    .forEach((el) =>
      on(el, 'change', () => socios.marcarPagado(el.dataset.pagado, el.checked)),
    );
  tbody
    .querySelectorAll('[data-perfil]')
    .forEach((el) => on(el, 'click', () => verPerfil(el.dataset.perfil)));
  tbody
    .querySelectorAll('[data-baja]')
    .forEach((el) => on(el, 'click', () => onBaja(el.dataset.baja)));
}

async function onAlta() {
  const msg = $('#form-msg');
  const datos = {
    nombre: $('#f-nombre').value.trim(),
    ap1: $('#f-ap1').value.trim(),
    ap2: $('#f-ap2').value.trim(),
    dni: $('#f-dni').value.trim(),
    fnac: $('#f-fnac').value,
    tel: $('#f-tel').value.trim(),
    email: $('#f-email').value.trim(),
    tipo: $('#f-tipo').value,
  };
  $('#add-spinner').style.display = 'inline-flex';
  try {
    const res = await socios.altaSocio(datos);
    if (!res.ok) {
      msg.className = 'msg msg-err';
      msg.textContent = res.errores.join(' ');
    } else {
      msg.className = 'msg msg-ok';
      msg.textContent = `Socio ${res.id} añadido correctamente.`;
      ['f-nombre', 'f-ap1', 'f-ap2', 'f-dni', 'f-tel', 'f-email', 'f-fnac'].forEach(
        (i) => {
          $('#' + i).value = '';
        },
      );
      $('#f-tipo').value = '';
    }
  } catch (e) {
    msg.className = 'msg msg-err';
    msg.textContent = 'Error al guardar. Revisa tus permisos.';
  } finally {
    $('#add-spinner').style.display = 'none';
  }
}

async function onBaja(id) {
  const s = socios.obtener(id);
  if (
    !confirm(
      `¿Dar de baja a ${s.nombre} ${s.ap1} (nº ${id})?\n\nSu carnet dejará de ser válido. El número NO se reutilizará.`,
    )
  )
    return;
  try {
    await socios.bajaSocio(id);
  } catch {
    alert('No se pudo dar de baja. Revisa tus permisos.');
  }
}

function verPerfil(id) {
  const s = socios.obtener(id);
  if (!s) return;
  perfilActualId = id;
  const partidos = getPartidos();
  const asistidas = partidos.filter((p) => state.entradas[p]?.[id]);
  const conDatos = partidos.filter((p) => state.entradas[p]);
  const pct = conDatos.length
    ? Math.round((asistidas.length / conDatos.length) * 100)
    : 0;

  $('#perfil-nombre').textContent = `${s.nombre} ${s.ap1} ${s.ap2 || ''}`;
  $('#perfil-subtitulo').innerHTML =
    `Socio nº ${esc(s.id)} · ${esc(s.tipo)}` +
    (esFundador(s) ? ' · <span style="color:#eab308">⭐ Socio Fundador</span>' : '');

  $('#perfil-stats').innerHTML = `
    <div class="stat"><div class="stat-n">${asistidas.length}</div><div class="stat-l">Partidos asistidos</div></div>
    <div class="stat"><div class="stat-n">${pct}%</div><div class="stat-l">% asistencia</div></div>
    <div class="stat"><div class="stat-n">${s.pagado ? '✅ Pagado' : '❌ Pendiente'}</div><div class="stat-l">Estado de pago</div></div>`;

  $('#perfil-datos').innerHTML = `
    <tr><td>Nombre completo</td><td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`)}</td></tr>
    <tr><td>DNI / NIE</td><td>${esc(s.dni)}</td></tr>
    <tr><td>Fecha de nacimiento</td><td>${fecha(s.fnac)}</td></tr>
    <tr><td>Teléfono</td><td>${esc(s.tel || '—')}</td></tr>
    <tr><td>Email</td><td>${esc(s.email || '—')}</td></tr>
    <tr><td>Tipo de abono</td><td>${esc(s.tipo)}</td></tr>
    <tr><td>Socio desde</td><td>${antiguedad(s.alta)}</td></tr>`;

  $('#perfil-observaciones').value = s.observaciones || '';
  $('#perfil-obs-msg').textContent = '';
  $('#modal-perfil').style.display = 'flex';
}

async function onGuardarObs() {
  if (!perfilActualId) return;
  const msg = $('#perfil-obs-msg');
  try {
    await socios.guardarObservaciones(perfilActualId, $('#perfil-observaciones').value);
    msg.textContent = 'Guardado ✓';
    setTimeout(() => {
      msg.textContent = '';
    }, 2500);
  } catch {
    msg.textContent = 'Error al guardar.';
  }
}

function exportarCSV() {
  const h = [
    'ID',
    'Nombre',
    'Apellido 1',
    'Apellido 2',
    'DNI',
    'Fecha nac.',
    'Teléfono',
    'Email',
    'Tipo',
    'Alta',
  ];
  const filas = socios
    .getSociosActivos()
    .map((s) => [
      s.id,
      s.nombre,
      s.ap1,
      s.ap2,
      s.dni,
      s.fnac,
      s.tel,
      s.email,
      s.tipo,
      s.alta,
    ]);
  const csv = [h, ...filas]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'Socios_InternacionalHuesca.csv';
  a.click();
}
