// ============================================================================
//  tests/stats.test.js
//  Historial individual, facturación y asistencia. Las horas se construyen
//  con `new Date(a,m,d,h,min)` = hora LOCAL, como las lee la app.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  historialSocio,
  calcularFacturacion,
  calcularAsistencia,
  calcularDemografia,
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

// --- Facturación --------------------------------------------------------------

test('facturacion: separa cuotas cobradas de pendientes por tipo de abono', () => {
  const socios = [
    { id: '1', activo: true, tipo: 'Abono General', pagado: true },
    { id: '2', activo: true, tipo: 'Abono General', pagado: false },
    { id: '3', activo: true, tipo: 'Abono Familiar', pagado: true },
  ];
  const f = calcularFacturacion({ socios, taquilla: {}, porJornada: [] });
  assert.equal(f.cuotasCobradas, 95 + 170);
  assert.equal(f.cuotasPendientes, 95);
  assert.equal(f.totalEstimado, f.cuotasCobradas); // sin taquilla
});

test('facturacion: ignora socios dados de baja', () => {
  const socios = [{ id: '1', activo: false, tipo: 'Abono General', pagado: true }];
  const f = calcularFacturacion({ socios, taquilla: {}, porJornada: [] });
  assert.equal(f.cuotasCobradas, 0);
});

test('facturacion: encuentra la jornada de mejor y peor taquilla', () => {
  const porJornada = [
    { jornada: J[0], label: 'J1', recaudacion: 100 },
    { jornada: J[1], label: 'J2', recaudacion: 40 },
  ];
  const f = calcularFacturacion({ socios: [], taquilla: {}, porJornada });
  assert.equal(f.jornadaMax.label, 'J1');
  assert.equal(f.jornadaMin.label, 'J2');
  assert.equal(f.recaudacionTaquilla, 140);
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

test('facturacion: ticket medio y morosidad', () => {
  const socios = [
    { id: '1', activo: true, tipo: 'Abono General', pagado: true }, // 95 cobrado
    { id: '2', activo: true, tipo: 'Abono General', pagado: false }, // 95 pendiente
  ];
  const porJornada = [{ jornada: J[0], label: 'J1', recaudacion: 100, nTaquilla: 10 }];
  const f = calcularFacturacion({ socios, porJornada });
  assert.equal(f.ticketMedioTaquilla, 10); // 100€ / 10 entradas
  assert.equal(f.morosidadPct, 50); // 95 pendiente de 190 total
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
