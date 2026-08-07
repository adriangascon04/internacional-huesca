// ============================================================================
//  tests/demo.test.js
//  Los datos de ejemplo de las estadísticas. Lo que se comprueba aquí no es
//  que "haya datos", sino las dos cosas que hacen que el modo demostración sea
//  seguro y útil: que sea SIEMPRE el mismo y que llene de verdad la pantalla.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { generarDatosDemo, PREFIJO_DEMO } from '../src/services/demo.service.js';
import {
  calcularStats,
  calcularAltasSocios,
  calcularAsistencia,
  calcularDemografia,
} from '../src/services/stats.service.js';
import { TIPOS_ABONO } from '../src/config/app.config.js';

test('demo: dos llamadas dan exactamente lo mismo', () => {
  // Con Math.random(), las cifras cambiarían cada vez que se pulsa el botón y
  // parecería que la aplicación está rota.
  assert.deepEqual(generarDatosDemo(), generarDatosDemo());
});

test('demo: todo lo que genera va marcado, para no confundirlo con lo real', () => {
  const d = generarDatosDemo();
  assert.ok(d.socios.every((s) => s.id.startsWith(PREFIJO_DEMO) && s.demo === true));
  assert.ok(Object.keys(d.entradas).every((j) => j.startsWith(PREFIJO_DEMO)));
  assert.ok(Object.keys(d.taquilla).every((j) => j.startsWith(PREFIJO_DEMO)));
  assert.ok(d.competiciones.every((c) => c.id.startsWith(PREFIJO_DEMO)));
});

test('demo: hay socios de TODOS los tipos de abono', () => {
  // Si faltara uno, la tabla de reparto por abono enseñaría una foto falsa de
  // para qué sirve cada uno — y el Socio Colaborador es justo el que hay que
  // poder enseñar, porque su cuota no es la tarifa.
  const d = generarDatosDemo();
  const presentes = new Set(d.socios.map((s) => s.tipo));
  for (const t of TIPOS_ABONO) assert.ok(presentes.has(t.id), `falta ${t.id}`);
});

test('demo: los socios colaboradores aportan cantidades distintas', () => {
  const d = generarDatosDemo();
  const importes = new Set(
    d.socios.filter((s) => s.tipo === 'Socio Colaborador').map((s) => s.importeAbono),
  );
  assert.ok(importes.size > 1, 'todos aportarían lo mismo y la cuota media no diría nada');
});

test('demo: llena las cuatro subpestañas con datos que se ven', () => {
  const d = generarDatosDemo();
  const socios = d.socios;
  const s = calcularStats({
    socios,
    entradas: d.entradas,
    taquilla: d.taquilla,
    competiciones: d.competiciones,
  });

  assert.ok(s.totalSocios > 50);
  assert.equal(s.jornadasConDatos, d.resumen.partidos);
  assert.ok(s.recaudacionTotal > 0);
  // Más de un tipo de entrada y más de un método de pago: si no, las tablas de
  // "por tipo" y "cómo se cobra" saldrían con una sola fila.
  assert.ok(s.tiposEntrada.length > 1);
  assert.ok(s.porMetodoPago.length > 1);

  const altas = calcularAltasSocios({ socios });
  assert.ok(altas.ingresos > 0);
  assert.ok(altas.pendientes > 0, 'sin morosos, la tarjeta de morosidad sale a cero');
  assert.ok(altas.ingresosNoAsisten > 0, 'hace falta dinero del Abono Internacional');
  assert.ok(altas.evolucion.length > 1, 'el gráfico de evolución necesita varios meses');

  const dem = calcularDemografia({ socios });
  assert.ok(dem.edadMedia > 0);
  assert.ok(dem.noAsisten > 0);
  assert.ok(dem.porDoc.length > 0);
  // Que haya varias franjas de edad pobladas: si no, el desglose es una barra.
  assert.ok(dem.edades.filter((g) => g.socios > 0).length >= 3);

  const a = calcularAsistencia({ socios, entradas: d.entradas, porJornada: s.porJornada });
  assert.ok(a.asistenciaMedia > 0);
  assert.ok(a.franjasHorarias.length > 1, 'el gráfico de horarios necesita varias horas');
  // Fidelidad repartida: si todo el mundo asistiera lo mismo, el gráfico de
  // fidelidad sería una sola columna y el ranking no ordenaría nada.
  assert.ok(a.distribucionFidelidad.filter((f) => f.socios > 0).length > 2);
  assert.ok(a.ranking[0].asistidas > a.ranking.at(-1).asistidas);
});

test('demo: los que no asisten al campo casi no fichan, pero sí pagan', () => {
  // Es el comportamiento que el modo demostración tiene que dejar ver.
  const d = generarDatosDemo();
  const internacionales = d.socios.filter((s) => s.tipo === 'Abono Internacional');
  const fichajes = Object.values(d.entradas).reduce(
    (n, jornada) => n + internacionales.filter((s) => jornada[s.id]).length,
    0,
  );
  const posibles = internacionales.length * Object.keys(d.entradas).length;
  assert.ok(fichajes / posibles < 0.15, 'vienen demasiado para lo que es ese abono');
  assert.ok(internacionales.every((s) => s.importeAbono > 0));
});
