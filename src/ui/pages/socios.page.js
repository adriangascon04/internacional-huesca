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
import { fecha, antiguedad, horaCorta, euros } from '../../utils/format.js';
import { state } from '../../core/state.js';
import {
  esFundador,
  TIPOS_ABONO,
  TIPOS_DOCUMENTO,
  METODOS_PAGO,
  SOCIOS_POR_PAGINA,
  TEMPORADA_ACTUAL,
  claseAsistencia,
  precioAbonoPorDefecto,
  esAportacionLibre,
  descripcionAbono,
  tipoDocDe,
  carnetDe,
} from '../../config/app.config.js';
import { pintarTarifasAbonos } from '../tarifas.view.js';
import * as socios from '../../services/socios.service.js';
import { perfilSocio, importeAbonoDe } from '../../services/stats.service.js';
import * as roles from '../../services/roles.service.js';

let perfilActualId = null;
let pagina = 1;

const OPCIONES_TIPO =
  '<option value="">— Selecciona —</option>' +
  TIPOS_ABONO.map((t) => `<option>${esc(t.id)}</option>`).join('');

const OPCIONES_DOC = TIPOS_DOCUMENTO.map((t) => `<option>${esc(t)}</option>`).join('');
const OPCIONES_PAGO = METODOS_PAGO.map((m) => `<option>${esc(m)}</option>`).join('');

export function initSocios() {
  // Rellenar los selects desde la config (antes estaban en el HTML).
  $('#f-tipo').innerHTML = OPCIONES_TIPO;
  $('#e-tipo').innerHTML = OPCIONES_TIPO;
  $('#f-tipodoc').innerHTML = OPCIONES_DOC;
  $('#e-tipodoc').innerHTML = OPCIONES_DOC;
  $('#f-pago').innerHTML = OPCIONES_PAGO;
  $('#e-pago').innerHTML = OPCIONES_PAGO;
  pintarTarifasAbonos($('#tarifas-abonos'));
  on($('#f-tipo'), 'change', () =>
    sincronizarImporte('#f-tipo', '#f-importe', '#f-importe-nota'),
  );
  on($('#e-tipo'), 'change', () =>
    sincronizarImporte('#e-tipo', '#e-importe', '#e-importe-nota'),
  );

  // Cualquier búsqueda nueva vuelve a la primera página: si no, buscar desde
  // la página 4 dejaba la tabla en blanco porque el filtro ya no llega ahí.
  on($('#buscador'), 'input', () => {
    pagina = 1;
    render();
  });
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
  on($('#btn-pag-anterior'), 'click', () => irAPagina(pagina - 1));
  on($('#btn-pag-siguiente'), 'click', () => irAPagina(pagina + 1));
  $('#c-pago').innerHTML = OPCIONES_PAGO;
  $('#c-temporada').value = TEMPORADA_ACTUAL;
  on($('#btn-registrar-cuota'), 'click', onRegistrarCuota);
}

/**
 * Pone en el campo de importe la tarifa del abono elegido y explica de dónde
 * sale. Con aportación libre no hay tarifa que poner: se deja vacío a
 * propósito, porque un 0 € precargado se guarda tal cual sin que nadie lo note.
 */
function sincronizarImporte(selTipo, selImporte, selNota) {
  const tipo = $(selTipo).value;
  const input = $(selImporte);
  const nota = $(selNota);
  if (!input) return;
  const libre = esAportacionLibre(tipo);
  input.value = libre ? '' : precioAbonoPorDefecto(tipo);
  input.placeholder = libre ? 'Cantidad que aporta' : '';
  if (nota) {
    nota.textContent = !tipo
      ? ''
      : libre
        ? 'Aportación libre: escribe la cantidad. No hay tarifa.'
        : `Tarifa de «${tipo}»: ${euros(precioAbonoPorDefecto(tipo))}. Puedes cambiarla.`;
  }
}

// --- Listado paginado --------------------------------------------------------

/** Socios que casan con el buscador. Filtra sobre TODOS, no sobre la página. */
function filtrados() {
  const q = ($('#buscador')?.value || '').toLowerCase().trim();
  const lista = socios.getSociosActivos();
  if (!q) return lista;
  return lista.filter((s) =>
    `${s.nombre} ${s.ap1} ${s.ap2 || ''} ${s.dni}`.toLowerCase().includes(q),
  );
}

function irAPagina(n) {
  pagina = n;
  render();
  $('#tabla-socios')?.scrollIntoView({ block: 'nearest' });
}

export function render() {
  const lista = filtrados();
  const total = socios.getSociosActivos().length;
  const paginas = Math.max(1, Math.ceil(lista.length / SOCIOS_POR_PAGINA));
  // La página puede quedarse fuera de rango sola: al borrar el último socio de
  // la última página, o al recibir menos socios por una actualización remota.
  pagina = Math.min(Math.max(1, pagina), paginas);
  const desde = (pagina - 1) * SOCIOS_POR_PAGINA;
  const visibles = lista.slice(desde, desde + SOCIOS_POR_PAGINA);

  $('#total-socios').textContent = total;
  renderRenumerar();
  renderPaginacion(lista.length, paginas, desde, visibles.length);

  const tbody = $('#tabla-socios');
  const empty = $('#tabla-empty');
  if (!lista.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const admin = roles.puedeGestionarSocios();
  tbody.innerHTML = visibles
    .map(
      (s) => `
    <tr>
      <td><code>${carnetDe(s)}</code></td>
      <td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim())}${esFundador(s) ? ' <span title="Socio Fundador">⭐</span>' : ''}</td>
      <td>${esc(s.dni)}<br><small style="color:var(--txt3)">${esc(tipoDocDe(s))}</small></td>
      <td>${esc(s.tipo)}</td>
      <td>${euros(importeAbonoDe(s))}</td>
      <td style="text-align:center">
        <input type="checkbox" data-pagado="${esc(s.id)}" ${s.pagado ? 'checked' : ''} ${admin ? '' : 'disabled'}>
      </td>
      <td>
        <button class="btn" data-perfil="${esc(s.id)}">👤 Perfil</button>
        ${admin ? `<button class="btn btn-danger" data-eliminar="${esc(s.id)}">Eliminar</button>` : ''}
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
    .querySelectorAll('[data-eliminar]')
    .forEach((el) => on(el, 'click', () => onEliminar(el.dataset.eliminar)));
}

/** Barra de páginas. Se esconde entera si todo cabe en una. */
function renderPaginacion(nFiltrados, paginas, desde, nVisibles) {
  const barra = $('#paginacion-socios');
  if (!barra) return;
  barra.style.display = paginas > 1 ? 'flex' : 'none';
  const info = $('#paginacion-info');
  if (info)
    info.textContent = nFiltrados
      ? `${desde + 1}–${desde + nVisibles} de ${nFiltrados} · página ${pagina} de ${paginas}`
      : '';
  $('#btn-pag-anterior').disabled = pagina <= 1;
  $('#btn-pag-siguiente').disabled = pagina >= paginas;
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
    ? `Hay <strong>${activos.length}</strong> socios pero los carnets llegan hasta el
       <strong>${maxCarnet}</strong>: <strong style="color:var(--ambar)">${huecos} número${huecos === 1 ? '' : 's'} sueltos</strong>.
       Al renumerar pasarán a ser <strong>1 – ${activos.length}</strong>.`
    : `Los <strong>${activos.length}</strong> socios ya están numerados del 1 al ${activos.length},
       sin huecos. No hace falta renumerar.`;
  $('#btn-renumerar').disabled = !activos.length;
}

async function onRenumerar() {
  const activos = socios.getSociosActivos();
  const msg = $('#renumerar-msg');
  if (
    !confirm(
      `¿Renumerar los ${activos.length} socios para la nueva temporada?\n\n` +
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

// --- Alta / eliminación / edición -------------------------------------------

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
      sincronizarImporte('#f-tipo', '#f-importe', '#f-importe-nota');
    }
  } catch {
    msg.className = 'msg msg-err';
    msg.textContent = 'Error al guardar. Revisa tus permisos.';
  } finally {
    $('#add-spinner').style.display = 'none';
  }
}

/**
 * Borrado definitivo. Ya no hay "baja de socio": esto quita la ficha de verdad.
 * Se avisa con nombre y número para que nadie borre al socio de la fila de al
 * lado por un resbalón del dedo en el móvil.
 */
async function onEliminar(id) {
  const s = socios.obtener(id);
  if (!s) return;
  if (
    !confirm(
      `¿ELIMINAR a ${s.nombre} ${s.ap1} (carnet nº ${carnetDe(s)})?\n\n` +
        `Se borra su ficha entera: datos, cuota y carnet. Su QR deja de funcionar.\n` +
        `Esto NO se puede deshacer.`,
    )
  )
    return;
  try {
    await socios.eliminarSocio(id);
  } catch {
    alert('No se pudo eliminar. Revisa tus permisos.');
  }
}

function verPerfil(id) {
  const s = socios.obtener(id);
  if (!s) return;
  perfilActualId = id;

  const cuotas = socios.cuotasDe(s);
  const p = perfilSocio({
    socio: s,
    cuotas,
    entradas: state.entradas,
    competiciones: state.competiciones,
    socios: socios.getSociosActivos(),
  });

  $('#perfil-nombre').textContent = `${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim();
  $('#perfil-subtitulo').innerHTML =
    `Carnet nº ${carnetDe(s)} · ${esc(s.tipo)}` +
    (esFundador(s) ? ' · <span style="color:#eab308">⭐ Socio Fundador</span>' : '');

  renderCifrasPerfil(s, p);
  renderCuotas(p);
  renderAsistenciaPerfil(p);

  const desc = descripcionAbono(s.tipo);
  $('#perfil-datos').innerHTML = `
    <tr><td>Nombre completo</td><td>${esc(`${s.nombre} ${s.ap1} ${s.ap2 || ''}`.trim())}</td></tr>
    <tr><td>${esc(tipoDocDe(s))}</td><td>${esc(s.dni)}</td></tr>
    <tr><td>Fecha de nacimiento</td><td>${fecha(s.fnac)}</td></tr>
    <tr><td>Teléfono</td><td>${esc(s.tel || '—')}</td></tr>
    <tr><td>Email</td><td>${esc(s.email || '—')}</td></tr>
    <tr><td>Tipo de abono</td><td>${esc(s.tipo)}${desc ? `<br><small style="color:var(--txt3)">${esc(desc)}</small>` : ''}</td></tr>
    <tr><td>Importe del abono</td><td><strong>${euros(importeAbonoDe(s))}</strong>${
      esAportacionLibre(s.tipo)
        ? ' <small style="color:var(--txt3)">(aportación libre)</small>'
        : Number(s.importeAbono ?? NaN) !== precioAbonoPorDefecto(s.tipo) &&
            Number.isFinite(Number(s.importeAbono))
          ? ` <small style="color:var(--txt3)">(tarifa: ${euros(precioAbonoPorDefecto(s.tipo))})</small>`
          : ''
    }</td></tr>
    <tr><td>Método de pago</td><td>${esc(s.metodoPago || '—')}</td></tr>
    <tr><td>Socio desde</td><td>${antiguedad(s.alta)}</td></tr>
    <tr><td>Temporadas en el club</td><td>${p.temporadas || '—'}${p.temporadaAlta ? ` <small style="color:var(--txt3)">(desde la ${esc(p.temporadaAlta)})</small>` : ''}</td></tr>`;

  // El formulario de edición solo existe para quien puede gestionar socios;
  // las reglas de Firestore lo imponen igualmente en el servidor.
  $('#perfil-edicion').style.display = roles.puedeGestionarSocios() ? 'block' : 'none';
  $('#perfil-cuota-alta').style.display = roles.puedeGestionarSocios() ? 'block' : 'none';
  mostrarFormEdicion(false);

  $('#perfil-observaciones').value = s.observaciones || '';
  $('#perfil-obs-msg').textContent = '';
  $('#modal-perfil').style.display = 'flex';
}

/**
 * Las cinco cifras de cabecera. Se elige a conciencia qué va aquí arriba: es lo
 * único que se lee de verdad al abrir una ficha.
 */
function renderCifrasPerfil(s, p) {
  const hora = (m) =>
    m === null
      ? '—'
      : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  $('#perfil-stats').innerHTML = `
    <div class="stat"><div class="stat-n">${p.temporadas || '—'}</div><div class="stat-l">${p.temporadas === 1 ? 'Temporada' : 'Temporadas'} en el club</div></div>
    <div class="stat"><div class="stat-n">${euros(p.aportado)}</div><div class="stat-l">Aportado en total${p.pendiente ? `<br><small>+ ${euros(p.pendiente)} pendiente</small>` : ''}</div></div>
    <div class="stat"><div class="stat-n">${p.asistidos}</div><div class="stat-l">Partidos asistidos<br><small>de ${p.jornadasConDatos} jugados</small></div></div>
    <div class="stat"><div class="stat-n">${p.pct}%</div><div class="stat-l">% asistencia${
      p.cuentaParaAsistencia && p.deCuantos
        ? `<br><small>nº ${p.posicion} de ${p.deCuantos}</small>`
        : '<br><small>no computa</small>'
    }</div></div>
    <div class="stat"><div class="stat-n">${euros(importeAbonoDe(s))}</div><div class="stat-l">Cuota de esta temporada${esAportacionLibre(s.tipo) ? '<br><small>aportación libre</small>' : ''}</div></div>
    <div class="stat"><div class="stat-n">${s.pagado ? '✅' : '❌'}</div><div class="stat-l">${s.pagado ? 'Pagado' : 'Pago pendiente'}</div></div>
    ${p.asistidos ? `<div class="stat"><div class="stat-n">${euros(p.costePorPartido)}</div><div class="stat-l">Le sale cada partido<br><small>lo aportado entre los que vino</small></div></div>` : ''}
    ${p.rachaMejor ? `<div class="stat"><div class="stat-n">${p.rachaMejor}</div><div class="stat-l">Mejor racha seguida${p.rachaViva > 1 ? `<br><small>lleva ${p.rachaViva} en curso 🔥</small>` : ''}</div></div>` : ''}
    ${p.minutoMedio !== null ? `<div class="stat"><div class="stat-n">${hora(p.minutoMedio)}</div><div class="stat-l">Hora media de llegada</div></div>` : ''}`;
}

/** Aportación temporada a temporada: la respuesta a "¿cuánto lleva puesto?". */
function renderCuotas(p) {
  const cont = $('#perfil-cuotas');
  if (!cont) return;
  cont.innerHTML = `<table>
    <thead><tr><th>Temporada</th><th>Aportación</th><th>Pago</th><th>Estado</th></tr></thead>
    <tbody>${p.cuotas
      .map(
        (c) => `<tr>
        <td>${esc(c.temporada)}${c.temporada === TEMPORADA_ACTUAL ? ' <small style="color:var(--txt3)">(actual)</small>' : ''}</td>
        <td><strong>${euros(c.importe)}</strong></td>
        <td>${esc(c.metodoPago || '—')}</td>
        <td>${c.pagado ? '<span class="badge badge-ok">Cobrada</span>' : '<span class="badge badge-warn">Pendiente</span>'}</td>
      </tr>`,
      )
      .join('')}</tbody>
    <tfoot><tr>
      <td><strong>Total</strong></td>
      <td><strong>${euros(p.aportado + p.pendiente)}</strong></td>
      <td colspan="2"><small style="color:var(--txt3)">${euros(p.aportado)} cobrado · media ${euros(p.aportacionMedia)} por temporada</small></td>
    </tr></tfoot></table>`;
}

/** Partido a partido, más el resumen por competición y la comparación. */
function renderAsistenciaPerfil(p) {
  const cont = $('#perfil-historial');
  if (!p.jornadasConDatos) {
    cont.innerHTML = '<p class="empty">Todavía no se ha jugado ningún partido.</p>';
    return;
  }

  const resumen = `<p class="nota">
      Ha venido a <strong>${p.asistidos}</strong> de los ${p.jornadasConDatos} partidos jugados
      y ha faltado a <strong>${p.ausencias}</strong>.
      ${
        p.cuentaParaAsistencia && p.deCuantos > 1
          ? `Es el <strong>nº ${p.posicion}</strong> de ${p.deCuantos} socios; la media del club son ${p.mediaClub} partidos.`
          : 'Su abono no cuenta para las estadísticas de asistencia.'
      }
      ${p.primero ? `Vino por primera vez a <strong>${esc(p.primero.label)}</strong>${p.ultimo && p.ultimo !== p.primero ? ` y la última a <strong>${esc(p.ultimo.label)}</strong>` : ''}.` : ''}
    </p>`;

  const porCompeticion =
    p.porCompeticion.length > 1
      ? `<table style="margin-bottom:14px">
          <thead><tr><th>Competición</th><th>Asistidos</th><th>%</th></tr></thead>
          <tbody>${p.porCompeticion
            .map(
              (c) =>
                `<tr><td>${esc(c.competicion)}</td><td>${c.asistidos} de ${c.jugados}</td>
                 <td><span class="badge ${claseAsistencia(c.pct)}">${c.pct}%</span></td></tr>`,
            )
            .join('')}</tbody></table>`
      : '';

  const detalle = p.partidos.length
    ? `<table>
        <thead><tr><th>Partido</th><th>Entró</th></tr></thead>
        <tbody>${p.partidos
          .map(
            (x) => `<tr>
            <td>${esc(x.label.split(' - ')[1] || x.label)}</td>
            <td>${horaCorta(x.entrada)}</td>
          </tr>`,
          )
          .join('')}</tbody></table>`
    : '<p class="empty">Todavía no ha asistido a ningún partido.</p>';

  cont.innerHTML = resumen + porCompeticion + detalle;
}

/** Apunta la cuota de una temporada (la de renovación, normalmente). */
async function onRegistrarCuota() {
  if (!perfilActualId) return;
  const msg = $('#perfil-cuota-msg');
  const res = await socios.registrarCuota(perfilActualId, {
    temporada: $('#c-temporada').value.trim(),
    importe: $('#c-importe').value,
    metodoPago: $('#c-pago').value,
    pagado: $('#c-pagado').checked,
  });
  if (!res.ok) {
    msg.className = 'msg msg-err';
    msg.textContent = res.errores.join(' ');
    return;
  }
  msg.className = 'msg msg-ok';
  msg.textContent = 'Cuota registrada ✓';
  verPerfil(perfilActualId);
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
  $('#e-pago').value = s.metodoPago || METODOS_PAGO[0];
  // El importe se carga con el que REALMENTE tiene, no con la tarifa: si no,
  // abrir la edición y guardar sin tocar nada le cambiaría la cuota al socio.
  $('#e-importe').value = importeAbonoDe(s);
  const nota = $('#e-importe-nota');
  if (nota)
    nota.textContent = esAportacionLibre(s.tipo)
      ? 'Aportación libre: la cantidad la decide el socio.'
      : `Tarifa de «${s.tipo}»: ${euros(precioAbonoPorDefecto(s.tipo))}. Puedes cambiarla.`;
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
    metodoPago: $('#e-pago').value,
    importeAbono: $('#e-importe').value,
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

/** El CSV exporta SIEMPRE la lista completa, no la página que se está viendo. */
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
    'Importe abono',
    'Método de pago',
    'Pagado',
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
      importeAbonoDe(s),
      s.metodoPago,
      s.pagado ? 'Sí' : 'No',
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
