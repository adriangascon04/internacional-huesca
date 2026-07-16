// ============================================================================
//  tests/afluencia.test.js
//  Curva de afluencia (a qué hora entra y sale la gente) e historial por socio.
//  Las horas se construyen con `new Date(a,m,d,h,min)` = hora LOCAL, que es
//  como las lee la app: el campo está en Huesca, no en UTC.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularAfluencia, historialSocio } from '../src/services/stats.service.js';
import { getPartidos } from '../src/config/app.config.js';

const J = getPartidos(); // J[0] = jornada 01
const t = (h, min) => new Date(2026, 8, 12, h, min).toISOString();

test('afluencia: agrupa los fichajes en franjas de 15 minutos', () => {
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 2), 2: t(19, 13), 3: t(19, 16) } },
    jornadas: [J[0]],
  });
  // 19:02 y 19:13 caen en la franja 19:00; 19:16 en la de 19:15.
  assert.deepEqual(
    a.franjas.map((f) => [f.label, f.entradas]),
    [
      ['19:00', 2],
      ['19:15', 1],
    ],
  );
});

test('afluencia: "dentro" es un acumulado de entradas menos salidas', () => {
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 0), 2: t(19, 0), 3: t(19, 30) } },
    salidas: { [J[0]]: { 1: t(19, 30) } },
    jornadas: [J[0]],
  });
  const dentro = Object.fromEntries(a.franjas.map((f) => [f.label, f.dentro]));
  assert.equal(dentro['19:00'], 2); // entran dos
  assert.equal(dentro['19:30'], 2); // entra uno y sale otro
});

test('afluencia: el pico es la franja con más gente dentro', () => {
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 0), 2: t(19, 30), 3: t(19, 30) } },
    salidas: { [J[0]]: { 1: t(20, 0), 2: t(20, 0), 3: t(20, 0) } },
    jornadas: [J[0]],
  });
  assert.equal(a.pico.label, '19:30');
  assert.equal(a.pico.dentro, 3);
});

test('afluencia: rellena las franjas vacías intermedias', () => {
  // Sin esto, el gráfico pegaría las 19:00 con las 20:00 como si fueran
  // contiguas y la curva mentiría sobre cuánto duró el llenado.
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 0), 2: t(20, 0) } },
    jornadas: [J[0]],
  });
  assert.deepEqual(
    a.franjas.map((f) => f.label),
    ['19:00', '19:15', '19:30', '19:45', '20:00'],
  );
  assert.equal(a.franjas[1].entradas, 0);
  assert.equal(a.franjas[1].dentro, 1); // el que entró sigue dentro
});

test('afluencia: quien no ficha salida se queda contado dentro', () => {
  // Comportamiento asumido y avisado en la UI: la cola de la curva se queda
  // alta mientras el fichaje de salida no sea sistemático.
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 0) } },
    salidas: {},
    jornadas: [J[0]],
  });
  assert.equal(a.franjas.at(-1).dentro, 1);
  assert.equal(a.totalSalidas, 0);
});

test('afluencia: suma varias jornadas y cuenta solo las que tienen datos', () => {
  const a = calcularAfluencia({
    entradas: { [J[0]]: { 1: t(19, 0) }, [J[1]]: { 1: t(19, 0), 2: t(19, 0) } },
    jornadas: [J[0], J[1], J[2]], // la 3 no se ha jugado
    salidas: {},
  });
  assert.equal(a.nJornadas, 2);
  assert.equal(a.totalEntradas, 3);
});

test('afluencia: sin datos devuelve vacío en vez de reventar', () => {
  const a = calcularAfluencia({ entradas: {}, salidas: {}, jornadas: J });
  assert.deepEqual(a.franjas, []);
  assert.equal(a.pico, null);
  assert.equal(a.nJornadas, 0);
});

// --- Historial individual ---------------------------------------------------

test('historial: lista los partidos con entrada, salida y minutos dentro', () => {
  const h = historialSocio({
    socioId: '7',
    entradas: { [J[0]]: { 7: t(19, 0) } },
    salidas: { [J[0]]: { 7: t(20, 52) } },
  });
  assert.equal(h.partidos.length, 1);
  assert.equal(h.partidos[0].minutos, 112);
  assert.equal(h.minutosMedios, 112);
});

test('historial: sin salida fichada, minutos a null (no se inventa una hora)', () => {
  const h = historialSocio({
    socioId: '7',
    entradas: { [J[0]]: { 7: t(19, 0) } },
    salidas: {},
  });
  assert.equal(h.partidos[0].salida, null);
  assert.equal(h.partidos[0].minutos, null);
  assert.equal(h.minutosMedios, null);
});

test('historial: el % se calcula sobre lo JUGADO, no sobre las 17 jornadas', () => {
  // En la jornada 2, quien ha ido a las dos tiene un 100%, no un 12%.
  const h = historialSocio({
    socioId: '7',
    entradas: { [J[0]]: { 7: t(19, 0) }, [J[1]]: { 7: t(19, 0) } },
  });
  assert.equal(h.jornadasConDatos, 2);
  assert.equal(h.pct, 100);
});

test('historial: cuenta las jornadas jugadas aunque él no fuera', () => {
  const h = historialSocio({
    socioId: '7',
    entradas: { [J[0]]: { 7: t(19, 0) }, [J[1]]: { 99: t(19, 0) } },
  });
  assert.equal(h.asistidos, 1);
  assert.equal(h.jornadasConDatos, 2);
  assert.equal(h.pct, 50);
});

test('historial: un socio sin partidos no revienta ni divide por cero', () => {
  const h = historialSocio({ socioId: '7', entradas: {}, salidas: {} });
  assert.deepEqual(h.partidos, []);
  assert.equal(h.pct, 0);
  assert.equal(h.minutosMedios, null);
});

test('historial: se indexa por id interno, así que renumerar no lo descoloca', () => {
  // El socio interno '7' pasa a tener el carnet nº 1: su historial sigue
  // colgando del '7' y no se mueve.
  const h = historialSocio({ socioId: '7', entradas: { [J[0]]: { 7: t(19, 0) } } });
  assert.equal(h.asistidos, 1);
});
