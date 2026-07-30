import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { state } from '../../core/state.js';
import * as roles from '../../services/roles.service.js';
import * as repo from '../../repositories/competiciones.repository.js';
import { getPartidos, getPartidosLabel } from '../../config/app.config.js';
import {
  tarifasPorDefecto,
  preciosDePartido,
  calendarioInicial,
} from '../../services/competiciones.service.js';

const nuevoId = (prefijo) =>
  `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const ordenar = (partidos) =>
  [...(partidos || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
const conOrden = (partidos) => partidos.map((p, orden) => ({ ...p, orden }));

export function initCompeticiones() {
  on($('#btn-crear-competicion'), 'click', crearCompeticion);
  on($('#btn-anadir-partido'), 'click', anadirPartido);
  on($('#btn-migrar-calendario'), 'click', migrarCalendario);
}

/**
 * Adopta el calendario fijo anterior como una competición editable. Es la vía
 * de migración desde la versión con 17 jornadas cerradas: los partidos nacen
 * con la MISMA clave con la que ya están guardados los accesos y la taquilla,
 * así que ningún dato cambia de sitio ni se pierde.
 */
async function migrarCalendario() {
  const clavesEnUso = [
    ...Object.keys(state.entradas || {}),
    ...Object.keys(state.taquilla || {}),
  ];
  const calendario = calendarioInicial(clavesEnUso, getPartidos(), getPartidosLabel());
  if (
    !confirm(
      `Se creará la competición «${calendario.nombre}» con ${calendario.partidos.length} partidos, ` +
        `conservando los accesos y la taquilla ya registrados. Después podrás renombrarlos, ` +
        `reordenarlos, borrarlos o cambiarles el precio. ¿Continuar?`,
    )
  )
    return;
  await repo.guardarCompeticion(nuevoId('comp'), calendario);
}

async function crearCompeticion() {
  const nombre = $('#competicion-nombre').value.trim();
  if (!nombre) return alert('Indica un nombre para la competición.');
  await repo.guardarCompeticion(nuevoId('comp'), {
    nombre,
    orden: state.competiciones.length,
    partidos: [],
  });
  $('#competicion-nombre').value = '';
}

async function anadirPartido() {
  const comp = state.competiciones.find((c) => c.id === $('#competicion-sel').value);
  const nombre = $('#partido-nombre').value.trim();
  if (!comp || !nombre) return alert('Selecciona una competición e indica el partido.');
  await repo.guardarCompeticion(comp.id, {
    partidos: [
      ...ordenar(comp.partidos),
      {
        id: nuevoId('partido'),
        nombre,
        orden: (comp.partidos || []).length,
        precios: tarifasPorDefecto(),
      },
    ],
  });
  $('#partido-nombre').value = '';
}

async function editarCompeticion(comp) {
  const nombre = prompt('Nombre de la competición:', comp.nombre);
  if (nombre?.trim()) await repo.guardarCompeticion(comp.id, { nombre: nombre.trim() });
}
async function borrarCompeticion(id) {
  if (
    confirm(
      '¿Eliminar esta competición? Los registros de asistencia y taquilla no se borrarán.',
    )
  )
    await repo.borrarCompeticion(id);
}
async function borrarPartido(comp, id) {
  await repo.guardarCompeticion(comp.id, {
    partidos: conOrden(ordenar(comp.partidos).filter((p) => p.id !== id)),
  });
}
async function moverPartido(comp, id, delta) {
  const partidos = ordenar(comp.partidos);
  const i = partidos.findIndex((p) => p.id === id);
  if (i < 0 || !partidos[i + delta]) return;
  [partidos[i], partidos[i + delta]] = [partidos[i + delta], partidos[i]];
  await repo.guardarCompeticion(comp.id, { partidos: conOrden(partidos) });
}
async function editarPartido(comp, partido) {
  const nombre = prompt('Nombre del partido:', partido.nombre);
  if (nombre === null) return;
  await repo.guardarCompeticion(comp.id, {
    partidos: ordenar(comp.partidos).map((p) =>
      p.id === partido.id ? { ...p, nombre: nombre.trim() || p.nombre } : p,
    ),
  });
}
async function guardarPrecios(comp, partido, bloque) {
  const precios = { ...preciosDePartido(state.competiciones, partido.id) };
  bloque.querySelectorAll('[data-precio]').forEach((input) => {
    const valor = Number(input.value);
    if (Number.isFinite(valor) && valor >= 0) precios[input.dataset.precio] = valor;
  });
  await repo.guardarCompeticion(comp.id, {
    partidos: ordenar(comp.partidos).map((p) =>
      p.id === partido.id ? { ...p, precios } : p,
    ),
  });
}
async function nuevoTipo(comp, partido) {
  const id = prompt('Identificador del tipo (ej. vip):')
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  if (!id) return;
  const precio = Number(prompt('Precio por defecto para este partido (€):', '0'));
  if (!Number.isFinite(precio) || precio < 0) return alert('El precio no es válido.');
  const precios = { ...preciosDePartido(state.competiciones, partido.id), [id]: precio };
  await repo.guardarCompeticion(comp.id, {
    partidos: ordenar(comp.partidos).map((p) =>
      p.id === partido.id ? { ...p, precios } : p,
    ),
  });
}

export function render() {
  const root = $('#competiciones-lista');
  if (!root) return;
  const admin = roles.esAdmin();
  $('#gestion-competiciones').style.display = admin ? 'block' : 'none';
  // La migración solo se ofrece mientras no haya calendario: una vez creado,
  // volver a pulsarla duplicaría los partidos.
  const migrar = $('#bloque-migrar-calendario');
  if (migrar)
    migrar.style.display = admin && !state.competiciones.length ? 'block' : 'none';
  $('#competicion-sel').innerHTML = state.competiciones
    .map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`)
    .join('');
  root.innerHTML = state.competiciones.length
    ? state.competiciones
        .map((c) => {
          const partidos = ordenar(c.partidos);
          return `<div class="card"><div class="row"><h2 style="flex:1">${esc(c.nombre)}</h2>${admin ? `<button class="btn" data-editar-comp="${esc(c.id)}">Editar</button><button class="btn btn-danger" data-borrar-comp="${esc(c.id)}">Eliminar</button>` : ''}</div>
      ${
        partidos.length
          ? partidos
              .map((p, i) => {
                const precios = preciosDePartido(state.competiciones, p.id);
                return `<div class="card" data-partido="${esc(c.id)}:${esc(p.id)}" style="margin:12px 0;background:var(--panel-2)"><div class="row"><strong style="flex:1">${i + 1}. ${esc(p.nombre)}</strong>${admin ? `<button class="btn" data-mover="-1">↑</button><button class="btn" data-mover="1">↓</button><button class="btn" data-editar-partido>Editar</button><button class="btn btn-danger" data-borrar-partido>Eliminar</button>` : ''}</div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap">${Object.entries(precios)
          .map(
            ([tipo, precio]) =>
              `<label>${esc(tipo)} <input data-precio="${esc(tipo)}" type="number" min="0" step="0.01" value="${Number(precio)}" style="width:84px"></label>`,
          )
          .join(
            '',
          )}</div>${admin ? `<div class="row" style="margin-top:8px"><button class="btn btn-primary" data-guardar-precios>Guardar precios</button><button class="btn" data-nuevo-tipo>+ Tipo de entrada</button></div>` : ''}</div>`;
              })
              .join('')
          : '<p class="empty">Sin partidos</p>'
      }</div>`;
        })
        .join('')
    : '<p class="empty">Crea la primera competición.</p>';

  root
    .querySelectorAll('[data-editar-comp]')
    .forEach((b) =>
      on(b, 'click', () =>
        editarCompeticion(state.competiciones.find((c) => c.id === b.dataset.editarComp)),
      ),
    );
  root
    .querySelectorAll('[data-borrar-comp]')
    .forEach((b) => on(b, 'click', () => borrarCompeticion(b.dataset.borrarComp)));
  root.querySelectorAll('[data-partido]').forEach((bloque) => {
    const [compId, partidoId] = bloque.dataset.partido.split(':');
    const comp = state.competiciones.find((c) => c.id === compId);
    const partido = comp && (comp.partidos || []).find((p) => p.id === partidoId);
    if (!comp || !partido) return;
    on($('[data-mover="-1"]', bloque), 'click', () => moverPartido(comp, partidoId, -1));
    on($('[data-mover="1"]', bloque), 'click', () => moverPartido(comp, partidoId, 1));
    on($('[data-editar-partido]', bloque), 'click', () => editarPartido(comp, partido));
    on($('[data-borrar-partido]', bloque), 'click', () => borrarPartido(comp, partidoId));
    on($('[data-guardar-precios]', bloque), 'click', () =>
      guardarPrecios(comp, partido, bloque),
    );
    on($('[data-nuevo-tipo]', bloque), 'click', () => nuevoTipo(comp, partido));
  });
}
