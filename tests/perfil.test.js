// ============================================================================
//  tests/perfil.test.js
//  La ficha individual del socio: temporadas, aportación año a año y el
//  retrato de asistencia. Es lo que se enseña al abrir un perfil, así que un
//  error aquí se lo cuenta la aplicación al club sobre una persona concreta.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  temporadaDe,
  temporadasEntre,
  anioInicioTemporada,
} from '../src/config/app.config.js';
import { cuotasDe, totalAportado } from '../src/services/socios.service.js';
import { perfilSocio } from '../src/services/stats.service.js';

// --- Temporadas ---------------------------------------------------------------

test('temporadaDe: la temporada va de julio a junio, no por año natural', () => {
  // Los dos son de la MISMA temporada aunque cambie el año.
  assert.equal(temporadaDe('2026-08-15'), '2026/27');
  assert.equal(temporadaDe('2027-03-01'), '2026/27');
  // Julio ya es la siguiente.
  assert.equal(temporadaDe('2027-07-01'), '2027/28');
  assert.equal(temporadaDe('2027-06-30'), '2026/27');
});

test('temporadaDe: una fecha inservible no inventa una temporada', () => {
  assert.equal(temporadaDe(''), '');
  assert.equal(temporadaDe('vete a saber'), '');
});

test('temporadaDe: el año que acaba en 00 se escribe con dos cifras', () => {
  assert.equal(temporadaDe('2099-08-01'), '2099/00');
  assert.equal(anioInicioTemporada('2099/00'), 2099);
});

test('temporadasEntre: cuenta las dos puntas, que es como se dice en el club', () => {
  // Quien entró en la 2026/27 y sigue en la 2028/29 lleva TRES temporadas.
  assert.deepEqual(temporadasEntre('2026/27', '2028/29'), [
    '2026/27',
    '2027/28',
    '2028/29',
  ]);
  assert.equal(temporadasEntre('2026/27', '2026/27').length, 1);
  // Al revés no se inventa nada.
  assert.deepEqual(temporadasEntre('2028/29', '2026/27'), []);
});

// --- Historial de cuotas -------------------------------------------------------

test('cuotasDe: un socio sin historial no se queda sin ficha económica', () => {
  // Los socios anteriores a que existiera `cuotas` tienen que enseñar algo
  // cierto: la cuota de la temporada de su alta, con el importe que guardaron.
  const c = cuotasDe({
    tipo: 'Abono General',
    importeAbono: 80,
    metodoPago: 'Bizum',
    pagado: true,
    alta: '2026-08-01T10:00:00.000Z',
  });
  assert.equal(c.length, 1);
  assert.equal(c[0].temporada, '2026/27');
  assert.equal(c[0].importe, 80);
  assert.equal(c[0].sintetizada, true);
});

test('cuotasDe: sin importe guardado cae a la tarifa de su abono', () => {
  const c = cuotasDe({ tipo: 'Abono General', alta: '2026-08-01T10:00:00.000Z' });
  assert.equal(c[0].importe, 95);
});

test('cuotasDe: con historial, manda el historial y va de nueva a vieja', () => {
  const c = cuotasDe({
    tipo: 'Abono General',
    importeAbono: 95,
    cuotas: [
      { temporada: '2026/27', importe: 95, pagado: true },
      { temporada: '2028/29', importe: 110, pagado: false },
      { temporada: '2027/28', importe: 100, pagado: true },
    ],
  });
  assert.deepEqual(
    c.map((x) => x.temporada),
    ['2028/29', '2027/28', '2026/27'],
  );
  assert.ok(!c.some((x) => x.sintetizada));
});

test('totalAportado: solo cuenta lo COBRADO, no lo comprometido', () => {
  const socio = {
    tipo: 'Socio Colaborador',
    cuotas: [
      { temporada: '2026/27', importe: 250, pagado: true },
      { temporada: '2027/28', importe: 300, pagado: true },
      { temporada: '2028/29', importe: 400, pagado: false }, // aún no ha pagado
    ],
  };
  assert.equal(totalAportado(socio), 550);
});

// --- Retrato del socio ----------------------------------------------------------

const COMPETICIONES = [
  {
    id: 'liga',
    nombre: 'Liga',
    partidos: Array.from({ length: 5 }, (_, i) => ({
      id: 'p' + (i + 1),
      nombre: 'Jornada ' + (i + 1),
      orden: i,
    })),
  },
];
const h = (dia, hora, min) => new Date(2026, 8, dia, hora, min).toISOString();

test('perfilSocio: asistencia, ausencias y porcentaje sobre lo JUGADO', () => {
  const entradas = {
    p1: { 1: h(6, 19, 0), 2: h(6, 19, 5) },
    p2: { 2: h(13, 19, 0) },
    p3: { 1: h(20, 19, 0), 2: h(20, 19, 0) },
  }; // p4 y p5 no se han jugado
  const p = perfilSocio({
    socio: { id: '1', tipo: 'Abono General', alta: '2026-08-01T10:00:00.000Z' },
    entradas,
    competiciones: COMPETICIONES,
    socios: [
      { id: '1', tipo: 'Abono General' },
      { id: '2', tipo: 'Abono General' },
    ],
  });
  assert.equal(p.jornadasConDatos, 3);
  assert.equal(p.asistidos, 2);
  assert.equal(p.ausencias, 1);
  assert.equal(p.pct, 67);
});

test('perfilSocio: la racha viva solo cuenta si vino al ÚLTIMO partido', () => {
  // Fue a p1 y p2 pero faltó a p3: su racha está rota, aunque llevara dos.
  const entradas = { p1: { 1: h(6, 19, 0) }, p2: { 1: h(13, 19, 0) }, p3: { 2: h(20, 19, 0) } };
  const p = perfilSocio({
    socio: { id: '1', tipo: 'Abono General' },
    entradas,
    competiciones: COMPETICIONES,
    socios: [{ id: '1', tipo: 'Abono General' }],
  });
  assert.equal(p.rachaMejor, 2);
  assert.equal(p.rachaViva, 0);
});

test('perfilSocio: la racha viva se enseña cuando sigue en pie', () => {
  const entradas = { p1: { 2: h(6, 19, 0) }, p2: { 1: h(13, 19, 0) }, p3: { 1: h(20, 19, 0) } };
  const p = perfilSocio({
    socio: { id: '1', tipo: 'Abono General' },
    entradas,
    competiciones: COMPETICIONES,
    socios: [{ id: '1', tipo: 'Abono General' }],
  });
  assert.equal(p.rachaViva, 2);
});

test('perfilSocio: sitúa al socio frente al resto del club', () => {
  const entradas = {
    p1: { 1: h(6, 19, 0), 2: h(6, 19, 0), 3: h(6, 19, 0) },
    p2: { 2: h(13, 19, 0), 3: h(13, 19, 0) },
    p3: { 3: h(20, 19, 0) },
  };
  const socios = [
    { id: '1', tipo: 'Abono General' },
    { id: '2', tipo: 'Abono General' },
    { id: '3', tipo: 'Abono General' },
  ];
  const tercero = perfilSocio({ socio: socios[2], entradas, competiciones: COMPETICIONES, socios });
  assert.equal(tercero.posicion, 1); // fue a los 3
  const primero = perfilSocio({ socio: socios[0], entradas, competiciones: COMPETICIONES, socios });
  assert.equal(primero.posicion, 3); // fue a 1, es el que menos
  assert.equal(primero.deCuantos, 3);
  assert.equal(primero.mediaClub, 2); // (1+2+3)/3
});

test('perfilSocio: al Internacional se le dice que no computa, no se le miente', () => {
  const p = perfilSocio({
    socio: { id: '1', tipo: 'Abono Internacional' },
    entradas: { p1: { 1: h(6, 19, 0) } },
    competiciones: COMPETICIONES,
    socios: [{ id: '1', tipo: 'Abono Internacional' }],
  });
  assert.equal(p.cuentaParaAsistencia, false);
  assert.equal(p.asistidos, 1); // su fichaje existe y se ve
});

test('perfilSocio: el coste por partido usa lo aportado y lo asistido', () => {
  const p = perfilSocio({
    socio: { id: '1', tipo: 'Abono General' },
    cuotas: [{ temporada: '2026/27', importe: 90, pagado: true }],
    entradas: { p1: { 1: h(6, 19, 0) }, p2: { 1: h(13, 19, 0) }, p3: { 1: h(20, 19, 0) } },
    competiciones: COMPETICIONES,
    socios: [{ id: '1', tipo: 'Abono General' }],
  });
  assert.equal(p.aportado, 90);
  assert.equal(p.costePorPartido, 30);
});

test('perfilSocio: un socio nuevo sin partidos no revienta ni divide por cero', () => {
  const p = perfilSocio({
    socio: { id: '9', tipo: 'Abono General' },
    entradas: {},
    competiciones: COMPETICIONES,
    socios: [],
  });
  assert.equal(p.asistidos, 0);
  assert.equal(p.pct, 0);
  assert.equal(p.costePorPartido, 0);
  assert.equal(p.minutoMedio, null);
  assert.equal(p.primero, null);
});
