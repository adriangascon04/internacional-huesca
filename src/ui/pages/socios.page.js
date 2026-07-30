// ============================================================================
//  src/ui/pages/socios.page.js
//  Listado, alta, edición, perfil y renumeración de socios.
//  Todo dato de usuario se pinta con `safe`/`esc` -> sin XSS (Upgrades #10).
//
//  El "Nº" que se ve aquí es el nº de CARNET (el impreso, el que se renumera),
//  nunca el id interno del socio. Ver carnetDe() en app.config.js.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { fecha, antiguedad, horaCorta } from '../../utils/format.js';
import { state } from '../../core/state.js';
import {
  esFundador,
  TIPOS_ABONO,
  TIPOS_DOCUMENTO,
  METODOS_PAGO,
  precioAbonoPorDefecto,
  tipoDocDe,
  carnetDe,
} from '../../config/app.config.js';
import { pintarTarifasAbonos } from '../tarifas.view.js';
import * as socios from '../../services/socios.service.js';
import { historialSocio } from '../../services/stats.service.js';
import * as roles from '../../services/roles.service.js';

let perfilActualId = null;

const OPCIONES_TIPO =
  '<option value="">— Selecciona —</option>' +
  TIPOS_ABONO.map((t) => `<option>${esc(t.id)}</option>`).join('');

const OPCIONES_DOC = TIPOS_DOCUMENTO.map((t) => `<option>${esc(t)}</option>`).join('');

export function initSocios() {
  // Rellenar los selects desde la config (antes estaban en el HTML).
  $('#f-tipo').innerHTML = OPCIONES_TIPO;
  $('#e-tipo').innerHTML = OPCIONES_TIPO;
  $('#f-tipodoc').innerHTML = OPCIONES_DOC;
  $('#e-tipodoc').innerHTML = OPCIONES_DOC;
  $('#f-pago').innerHTML = METODOS_PAGO.map((m) => `<option>${esc(m)}</option>`).join('');
  pintarTarifasAbonos($('#tarifas-abonos'));
  on($('#f-tipo'), 'change', () => {
    $('#f-importe').value = precioAbonoPorDefecto($('#f-tipo').value);
  });

  on($('#buscador'), 'input', render);
  on($('#btn-alta'), 'click', onAlta);
  on($('#btn-guardar-obs'), 'click', onGuardarObs);
  on($('#btn-cerrar-perfil'), 'click', () => {
    $('#modal-perfil').style.display = 'none';
  });
  on($('#btn-export-csv'), 'click', exportarCSV);
  on($('#btn-editar-toggle'), 'click', () => mostrarFormEdicion(true));
  on($('#btn-cancelar-edicion'), 'click', () => mostrarFormEdicion(false));
  on($('#btn-guardar-socio'), 'click', onGuardarSocio);
  on($('#btn-renumerar'), 'click', onRenumerar);
}

export function render() {
  const q = ($('#buscador')?.value || '').toLowerCase();
  const lista = socios
    .getSociosActivos()
    .filter((s) =>
      `${s.nombre} ${s.ap1} ${s.ap2 || ''} ${s.dni}`.toLowerCase().includes(q),
    );

  $('#total-socios').textContent = socios.getSociosActivos().length;
  renderRenumerar();

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
      <td><code>${carnetDe(s)}</code></td>
      <td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim())}${esFundador(s) ? ' <span title="Socio Fundador">⭐</span>' : ''}</td>
      <td>${esc(s.dni)}<br><small style="color:var(--txt3)">${esc(tipoDocDe(s))}</small></td>
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

// --- Renumeración de temporada ---------------------------------------------

/** Enseña cuántos huecos hay antes de que el admin decida renumerar. */
function renderRenumerar() {
  const card = $('#card-renumerar');
  if (!card) return;
  card.style.display = roles.puedeGestionarSocios() ? '' : 'none';
  if (!roles.puedeGestionarSocios()) return;

  const activos = socios.getSociosActivos();
  const maxCarnet = activos.reduce((m, s) => Math.max(m, carnetDe(s)), 0);
  const huecos = maxCarnet - activos.length;
  $('#renumerar-info').innerHTML = huecos
    ? `Hay <strong>${activos.length}</strong> socios activos pero los carnets llegan hasta el
       <strong>${maxCarnet}</strong>: <strong style="color:var(--ambar)">${huecos} número${huecos === 1 ? '' : 's'} sueltos</strong>
       que han dejado las bajas. Al renumerar pasarán a ser <strong>1 – ${activos.length}</strong>.`
    : `Los <strong>${activos.length}</strong> socios activos ya están numerados del 1 al ${activos.length},
       sin huecos. No hace falta renumerar.`;
  $('#btn-renumerar').disabled = !activos.length;
}

async function onRenumerar() {
  const activos = socios.getSociosActivos();
  const msg = $('#renumerar-msg');
  if (
    !confirm(
      `¿Renumerar los ${activos.length} socios activos para la nueva temporada?\n\n` +
        `· Pasarán a tener los números 1 – ${activos.length}.\n` +
        `· TODOS los carnets actuales dejarán de funcionar al instante.\n` +
        `· Hay que reimprimir y repartir los carnets nuevos (pestaña QRs → Descargar todos).\n\n` +
        `El historial de asistencia de cada socio se conserva.\n\nEsto no se puede deshacer.`,
    )
  )
    return;

  $('#btn-renumerar').disabled = true;
  msg.className = 'msg';
  msg.textContent = 'Renumerando…';
  try {
    const r = await socios.renumerarTemporada();
    if (!r.ok) {
      msg.className = 'msg msg-err';
      msg.textContent = r.errores.join(' ');
      return;
    }
    msg.className = 'msg msg-ok';
    msg.textContent = `${r.renumerados} socios renumerados y ${r.huecos} hueco${r.huecos === 1 ? '' : 's'} recuperado${r.huecos === 1 ? '' : 's'}. Ahora reimprime los carnets desde la pestaña QRs.`;
  } catch {
    msg.className = 'msg msg-err';
    msg.textContent = 'No se pudo renumerar. Revisa tus permisos y vuelve a intentarlo.';
  } finally {
    $('#btn-renumerar').disabled = false;
  }
}

// --- Alta / baja / edición --------------------------------------------------

async function onAlta() {
  const msg = $('#form-msg');
  const datos = {
    nombre: $('#f-nombre').value.trim(),
    ap1: $('#f-ap1').value.trim(),
    ap2: $('#f-ap2').value.trim(),
    tipoDoc: $('#f-tipodoc').value,
    dni: $('#f-dni').value.trim(),
    fnac: $('#f-fnac').value,
    tel: $('#f-tel').value.trim(),
    email: $('#f-email').value.trim(),
    tipo: $('#f-tipo').value,
    metodoPago: $('#f-pago').value,
    importeAbono: $('#f-importe').value,
  };
  $('#add-spinner').style.display = 'inline-flex';
  try {
    const res = await socios.altaSocio(datos);
    if (!res.ok) {
      msg.className = 'msg msg-err';
      msg.textContent = res.errores.join(' ');
    } else {
      msg.className = 'msg msg-ok';
      msg.textContent = `Socio añadido correctamente con el nº de carnet ${res.carnet}.`;
      ['f-nombre', 'f-ap1', 'f-ap2', 'f-dni', 'f-tel', 'f-email', 'f-fnac'].forEach(
        (i) => {
          $('#' + i).value = '';
        },
      );
      $('#f-tipo').value = '';
      $('#f-importe').value = '';
    }
  } catch {
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
      `¿Dar de baja a ${s.nombre} ${s.ap1} (carnet nº ${carnetDe(s)})?\n\n` +
        `Su carnet dejará de ser válido. El hueco que deja se recupera al renumerar la próxima temporada.`,
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

  const h = historialSocio({
    socioId: id,
    entradas: state.entradas,
    competiciones: state.competiciones,
  });

  $('#perfil-nombre').textContent = `${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim();
  $('#perfil-subtitulo').innerHTML =
    `Carnet nº ${carnetDe(s)} · ${esc(s.tipo)}` +
    (esFundador(s) ? ' · <span style="color:#eab308">⭐ Socio Fundador</span>' : '');

  $('#perfil-stats').innerHTML = `
    <div class="stat"><div class="stat-n">${h.asistidos}</div><div class="stat-l">Partidos asistidos<br>de ${h.jornadasConDatos} jugados</div></div>
    <div class="stat"><div class="stat-n">${h.pct}%</div><div class="stat-l">% asistencia</div></div>
    <div class="stat"><div class="stat-n">${s.pagado ? '✅' : '❌'}</div><div class="stat-l">${s.pagado ? 'Pagado' : 'Pago pendiente'}</div></div>`;

  $('#perfil-datos').innerHTML = `
    <tr><td>Nombre completo</td><td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim())}</td></tr>
    <tr><td>${esc(tipoDocDe(s))}</td><td>${esc(s.dni)}</td></tr>
    <tr><td>Fecha de nacimiento</td><td>${fecha(s.fnac)}</td></tr>
    <tr><td>Teléfono</td><td>${esc(s.tel || '—')}</td></tr>
    <tr><td>Email</td><td>${esc(s.email || '—')}</td></tr>
    <tr><td>Tipo de abono</td><td>${esc(s.tipo)}</td></tr>
    <tr><td>Socio desde</td><td>${antiguedad(s.alta)}</td></tr>`;

  renderHistorial(h);

  // El formulario de edición solo existe para quien puede gestionar socios;
  // las reglas de Firestore lo imponen igualmente en el servidor.
  $('#perfil-edicion').style.display = roles.puedeGestionarSocios() ? 'block' : 'none';
  mostrarFormEdicion(false);

  $('#perfil-observaciones').value = s.observaciones || '';
  $('#perfil-obs-msg').textContent = '';
  $('#modal-perfil').style.display = 'flex';
}

/** Partido a partido: a qué fue y a qué hora entró. */
function renderHistorial(h) {
  const cont = $('#perfil-historial');
  if (!h.partidos.length) {
    cont.innerHTML = '<p class="empty">Todavía no ha asistido a ningún partido.</p>';
    return;
  }
  cont.innerHTML = `<table>
    <thead><tr><th>Jornada</th><th>Entró</th></tr></thead>
    <tbody>${h.partidos
      .map(
        (p) => `<tr>
        <td>${esc(p.label.split(' - ')[1] || p.label)}</td>
        <td>${horaCorta(p.entrada)}</td>
      </tr>`,
      )
      .join('')}</tbody></table>`;
}

/** Muestra/oculta el formulario y lo recarga desde el socio actual. */
function mostrarFormEdicion(visible) {
  $('#perfil-form').style.display = visible ? 'block' : 'none';
  $('#btn-editar-toggle').style.display = visible ? 'none' : 'inline-block';
  $('#perfil-edit-msg').textContent = '';
  if (!visible) return;

  const s = socios.obtener(perfilActualId);
  if (!s) return;
  $('#e-nombre').value = s.nombre || '';
  $('#e-ap1').value = s.ap1 || '';
  $('#e-ap2').value = s.ap2 || '';
  $('#e-tipodoc').value = tipoDocDe(s);
  $('#e-dni').value = s.dni || '';
  $('#e-fnac').value = s.fnac || '';
  $('#e-tel').value = s.tel || '';
  $('#e-email').value = s.email || '';
  $('#e-tipo').value = s.tipo || '';
}

async function onGuardarSocio() {
  if (!perfilActualId) return;
  const msg = $('#perfil-edit-msg');
  const campos = {
    nombre: $('#e-nombre').value.trim(),
    ap1: $('#e-ap1').value.trim(),
    ap2: $('#e-ap2').value.trim(),
    tipoDoc: $('#e-tipodoc').value,
    dni: $('#e-dni').value.trim(),
    fnac: $('#e-fnac').value,
    tel: $('#e-tel').value.trim(),
    email: $('#e-email').value.trim(),
    tipo: $('#e-tipo').value,
  };
  try {
    const res = await socios.editarSocio(perfilActualId, campos);
    if (!res.ok) {
      msg.className = 'msg msg-err';
      msg.textContent = res.errores.join(' ');
      return;
    }
    verPerfil(perfilActualId); // repinta la ficha; también limpia los mensajes
    msg.className = 'msg msg-ok';
    msg.textContent = 'Guardado ✓';
  } catch {
    msg.className = 'msg msg-err';
    msg.textContent = 'No se pudo guardar. Revisa tus permisos.';
  }
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
    'Nº carnet',
    'Nombre',
    'Apellido 1',
    'Apellido 2',
    'Tipo documento',
    'Documento',
    'Fecha nac.',
    'Teléfono',
    'Email',
    'Tipo',
    'Alta',
  ];
  const filas = socios
    .getSociosActivos()
    .map((s) => [
      carnetDe(s),
      s.nombre,
      s.ap1,
      s.ap2,
      tipoDocDe(s),
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
  // El BOM (U+FEFF) va escapado a propósito: pegado literal es invisible en el
  // editor y cualquiera lo borraría sin saberlo. Sin él, Excel se come los
  // acentos al abrir el CSV.
  const BOM = '\uFEFF';
  a.href = 'data:text/csv;charset=utf-8,' + BOM + encodeURIComponent(csv);
  a.download = 'Socios_InternacionalHuesca.csv';
  a.click();
}
