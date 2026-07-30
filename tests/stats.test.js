// ============================================================================
//  tests/stats.test.js
//  Historial individual, facturación y asistencia. Las horas se construyen
//  con `new Date(a,m,d,h,min)` = hora LOCAL, como las lee la app.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  historialSocio,
  calcularEconomiaEntradas,
  calcularAsistencia,
  calcularDemografia,
  calcularStats,
  calcularAltasSocios,
  edadDe,
} from '../src/services/stats.service.js';
import { getPartidos } from '../src/config/app.config.js';

const J = getPartidos(); // J[0] = jornada 01
const t = (h, min) => new Date(2026, 8, 12, h, min).toISOString();

// --- Historial individual ---------------------------------------------------

test('historial: lista los partidos con entrada', () => {
  const h = historialSocio({ socioId: '7', entradas: { [J[0]]: { 7: t(19, 0) } } });
  assert.equal(h.partidos.length, 1);
  assert.equal(h.partidos[0].jornada, J[0]);
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
  const h = historialSocio({ socioId: '7', entradas: {} });
  assert.deepEqual(h.partidos, []);
  assert.equal(h.pct, 0);
});

test('historial: se indexa por id interno, así que renumerar no lo descoloca', () => {
  // El socio interno '7' pasa a tener el carnet nº 1: su historial sigue
  // colgando del '7' y no se mueve.
  const h = historialSocio({ socioId: '7', entradas: { [J[0]]: { 7: t(19, 0) } } });
  assert.equal(h.asistidos, 1);
});

// --- Economía de la venta de entradas ----------------------------------------

test('economia: encuentra la jornada de mejor y peor taquilla', () => {
  const porJornada = [
    { jornada: J[0], label: 'J1', recaudacion: 100 },
    { jornada: J[1], label: 'J2', recaudacion: 40 },
  ];
  const e = calcularEconomiaEntradas({ porJornada });
  assert.equal(e.jornadaMax.label, 'J1');
  assert.equal(e.jornadaMin.label, 'J2');
  assert.equal(e.recaudacionTaquilla, 140);
});

test('economia: las jornadas sin recaudar no cuentan como "peor taquilla"', () => {
  const porJornada = [
    { jornada: J[0], label: 'J1', recaudacion: 100 },
    { jornada: J[1], label: 'J2 sin jugar', recaudacion: 0 },
  ];
  const e = calcularEconomiaEntradas({ porJornada });
  assert.equal(e.jornadaMin.label, 'J1');
  assert.equal(e.recaudacionMediaJornada, 100); // media de LO jugado
});

test('economia: ticket medio y reparto del ingreso frente a las altas', () => {
  const porJornada = [{ jornada: J[0], label: 'J1', recaudacion: 100, nTaquilla: 10 }];
  const e = calcularEconomiaEntradas({ porJornada, ingresoAltas: 300 });
  assert.equal(e.ticketMedioTaquilla, 10); // 100 € / 10 entradas
  assert.equal(e.ingresoTotal, 400);
  assert.equal(e.pctIngresoAltas, 75);
  assert.equal(e.pctIngresoTaquilla, 25);
});

test('economia: sin datos no divide por cero', () => {
  const e = calcularEconomiaEntradas();
  assert.equal(e.ingresoTotal, 0);
  assert.equal(e.ticketMedioTaquilla, 0);
  assert.equal(e.pctIngresoAltas, 0);
  assert.equal(e.jornadaMax, null);
});

// --- Asistencia ----------------------------------------------------------------

test('asistencia: ranking ordena por nº de jornadas asistidas', () => {
  const socios = [
    { id: '1', activo: true, tipo: 'Abono General', nombre: 'A', ap1: 'Uno' },
    { id: '2', activo: true, tipo: 'Abono General', nombre: 'B', ap1: 'Dos' },
  ];
  const entradas = { [J[0]]: { 1: t(19, 0), 2: t(19, 0) }, [J[1]]: { 1: t(19, 0) } };
  const a = calcularAsistencia({ socios, entradas, porJornada: [] });
  assert.equal(a.ranking[0].socio.id, '1');
  assert.equal(a.ranking[0].asistidas, 2);
  assert.equal(a.ranking[1].asistidas, 1);
});

test('asistencia: encuentra la jornada de mayor y menor asistencia de socios', () => {
  const porJornada = [
    { jornada: J[0], label: 'J1', nSocios: 10, nTaquilla: 0 },
    { jornada: J[1], label: 'J2', nSocios: 3, nTaquilla: 0 },
  ];
  const a = calcularAsistencia({ socios: [], entradas: {}, porJornada });
  assert.equal(a.jornadaMax.label, 'J1');
  assert.equal(a.jornadaMin.label, 'J2');
});

test('asistencia: distribución de fidelidad y absentistas', () => {
  const socios = [
    { id: '1', activo: true, tipo: 'Abono General', nombre: 'A', ap1: 'x' },
    { id: '2', activo: true, tipo: 'Abono General', nombre: 'B', ap1: 'x' },
    { id: '3', activo: true, tipo: 'Abono General', nombre: 'C', ap1: 'x' }, // no viene
  ];
  const entradas = { [J[0]]: { 1: t(19, 0), 2: t(19, 0) }, [J[1]]: { 1: t(19, 0) } };
  const a = calcularAsistencia({ socios, entradas, porJornada: [] });
  assert.equal(a.absentistas, 1); // el socio 3
  assert.equal(a.fieles, 1); // el socio 1 (2 de 2 jugadas)
  // distribucionFidelidad[k] = socios que fueron a exactamente k jornadas
  assert.equal(a.distribucionFidelidad[0].socios, 1); // 0 jornadas: socio 3
  assert.equal(a.distribucionFidelidad[2].socios, 1); // 2 jornadas: socio 1
});

test('asistencia: franjas horarias y hora punta', () => {
  const socios = [{ id: '1', activo: true, tipo: 'Abono General', nombre: 'A', ap1: 'x' }];
  const entradas = { [J[0]]: { 1: t(19, 0) }, [J[1]]: { 1: t(19, 30) } };
  const a = calcularAsistencia({ socios, entradas, porJornada: [] });
  assert.equal(a.totalFichajes, 2);
  assert.equal(a.horaPico.hora, 19);
  assert.equal(a.horaPico.n, 2);
});

test('stats: agrupa recaudación y asistentes por tipo de entrada y competición', () => {
  const competiciones = [{ id: 'liga', nombre: 'Liga', partidos: [{ id: 'p1', nombre: 'Jornada 1', orden: 0 }] }];
  const s = calcularStats({ socios: [], entradas: {}, competiciones, taquilla: { p1: { historial: [
    { tipo: 'general', nombreTipo: 'General', precio: 12 },
    { tipo: 'invitacion', nombreTipo: 'Invitación', precio: 0 },
  ] } } });
  assert.equal(s.recaudacionTotal, 12);
  assert.deepEqual(s.tiposEntrada.map((t) => [t.tipo, t.asistentes, t.recaudacion]), [['general', 1, 12], ['invitacion', 1, 0]]);
  assert.equal(s.porCompeticion[0].competicion, 'Liga');
  assert.equal(s.porCompeticion[0].asistentes, 2);
});

test('stats: los abonados cuentan como asistentes pero no como recaudación', () => {
  // Es la diferencia entre los dos gráficos: quien llena el campo no es quien
  // lo paga. Un abonado con su QR suma persona y 0 €; y el "Abono
  // Internacional" no asiste, así que no suma ni siquiera persona.
  const competiciones = [{ id: 'liga', nombre: 'Liga', partidos: [{ id: 'p1', nombre: 'Jornada 1', orden: 0 }] }];
  const socios = [
    { id: '1', tipo: 'Abono General', activo: true },
    { id: '2', tipo: 'Abono Internacional', activo: true },
  ];
  const s = calcularStats({
    socios,
    competiciones,
    entradas: { p1: { 1: t(19, 0), 2: t(19, 5) } },
    taquilla: { p1: { historial: [{ tipo: 'general', nombreTipo: 'General', precio: 10 }] } },
  });
  const jornada = s.porJornada[0];
  assert.equal(jornada.nSocios, 1); // el Internacional no cuenta como asistencia
  assert.equal(jornada.totalAsistentes, 2);
  assert.deepEqual(
    jornada.asistentesPorTipo.map((f) => [f.tipo, f.asistentes]),
    [['abonado', 1], ['general', 1]],
  );
  // El abonado aparece en asistencia y NO en el desglose de dinero.
  assert.deepEqual(s.tiposAsistencia.map((f) => [f.tipo, f.asistentes]), [['abonado', 1], ['general', 1]]);
  assert.deepEqual(s.tiposEntrada.map((f) => f.tipo), ['general']);
  assert.equal(s.recaudacionTotal, 10);
});

test('stats: una jornada sin abonados no inventa una franja de abonados', () => {
  const competiciones = [{ id: 'liga', nombre: 'Liga', partidos: [{ id: 'p1', nombre: 'Jornada 1', orden: 0 }] }];
  const s = calcularStats({
    socios: [],
    competiciones,
    entradas: {},
    taquilla: { p1: { historial: [{ tipo: 'general', nombreTipo: 'General', precio: 10 }] } },
  });
  assert.deepEqual(s.porJornada[0].asistentesPorTipo.map((f) => f.tipo), ['general']);
});

test('altas: conserva el importe cobrado y no mezcla taquilla', () => {
  const altas = calcularAltasSocios({ socios: [
    { tipo: 'Abono General', importeAbono: 80, pagado: true, alta: '2026-08-02T10:00:00Z' },
    { tipo: 'Abono General', importeAbono: 95, pagado: false, alta: '2026-08-05T10:00:00Z' },
  ] });
  assert.equal(altas.nuevosSocios, 2);
  assert.equal(altas.ingresos, 80);
  assert.equal(altas.pendientes, 95);
  assert.deepEqual(altas.evolucion, [{ mes: '2026-08', socios: 2, ingresos: 80 }]);
});

test('altas: un socio anterior a importeAbono cae a la tarifa de su abono', () => {
  // Socios dados de alta antes de que se guardara el importe: no tienen el
  // campo, y su cuota debe valorarse con el precio de referencia de su tipo.
  const altas = calcularAltasSocios({
    socios: [{ tipo: 'Abono General', pagado: true }],
  });
  assert.equal(altas.ingresos, 95);
});

test('altas: un importe de 0 € se respeta y no se confunde con "sin dato"', () => {
  const altas = calcularAltasSocios({
    socios: [{ tipo: 'Abono General', importeAbono: 0, pagado: true }],
  });
  assert.equal(altas.ingresos, 0);
});

// --- Demografía ----------------------------------------------------------------

test('edadDe: calcula la edad y devuelve null sin fecha', () => {
  assert.equal(edadDe(''), null);
  const hace20 = new Date();
  hace20.setFullYear(hace20.getFullYear() - 20);
  assert.equal(edadDe(hace20.toISOString().slice(0, 10)), 20);
});

test('demografia: cuenta activos, bajas, contacto y morosidad', () => {
  const socios = [
    { id: '1', activo: true, tipo: 'Abono General', pagado: true, email: 'a@b.c', tel: '600100200' },
    { id: '2', activo: true, tipo: 'Abono General', pagado: false, email: '', tel: '600100201' },
    { id: '3', activo: false, tipo: 'Abono General', pagado: true },
  ];
  const d = calcularDemografia({ socios });
  assert.equal(d.totalActivos, 2);
  assert.equal(d.bajas, 1);
  assert.equal(d.conEmail, 1);
  assert.equal(d.conTel, 2);
  assert.equal(d.pendientes, 1);
  assert.equal(d.morosidadPct, 50);
});
