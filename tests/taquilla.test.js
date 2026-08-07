// ============================================================================
//  tests/taquilla.test.js
//  Recaudación y, sobre todo, qué pasa cuando se BORRA una venta: una entrada
//  cobrada por error tiene que dejar de contar en el momento en que se anula,
//  tanto en el número de entradas como en el dinero.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { recaudacion, ventasDe, ventasOrdenadas } from '../src/services/taquilla.service.js';
import { calcularStats } from '../src/services/stats.service.js';

const venta = (tipo, precio, hora, id) => ({
  id,
  tipo,
  nombreTipo: tipo,
  precio,
  hora,
});

test('recaudacion: documento antiguo sin historial usa las tarifas de entonces', () => {
  assert.equal(recaudacion({ general: 3, menor: 2 }), 40);
});

test('recaudacion: documento vacío no revienta', () => {
  assert.equal(recaudacion(), 0);
  assert.equal(recaudacion({}), 0);
});

test('recaudacion: suma el importe realmente cobrado de cada venta', () => {
  const d = {
    general: 2,
    historial: [venta('general', 12, '2026-09-12T18:00:00Z', 'a'), venta('general', 8, '2026-09-12T18:05:00Z', 'b')],
  };
  assert.equal(recaudacion(d), 20);
});

// --- Anulación de ventas ------------------------------------------------------

test('anular la última venta la quita de verdad: no reaparece por los contadores', () => {
  // Este era el fallo: al quedarse el historial vacío se caía al contador
  // legacy `general`, así que la venta anulada volvía a contar como 10 €.
  const traslaAnulacion = { general: 0, menor: 0, historial: [] };
  assert.deepEqual(ventasDe(traslaAnulacion), []);
  assert.equal(recaudacion(traslaAnulacion), 0);
});

test('una venta anulada deja de contar en las estadísticas', () => {
  const competiciones = [
    { id: 'liga', nombre: 'Liga', partidos: [{ id: 'p1', nombre: 'J1', orden: 0 }] },
  ];
  const conError = {
    p1: {
      historial: [
        venta('general', 10, '2026-09-12T18:00:00Z', 'a'),
        venta('general', 10, '2026-09-12T18:01:00Z', 'b'), // cobrada por error
        venta('menor', 5, '2026-09-12T18:02:00Z', 'c'),
      ],
    },
  };
  const antes = calcularStats({ socios: [], entradas: {}, competiciones, taquilla: conError });
  assert.equal(antes.porJornada[0].nTaquilla, 3);
  assert.equal(antes.recaudacionTotal, 25);

  // Anular = sacar esa venta del historial (lo que hace arrayRemove).
  const corregido = {
    p1: { historial: conError.p1.historial.filter((v) => v.id !== 'b') },
  };
  const despues = calcularStats({
    socios: [],
    entradas: {},
    competiciones,
    taquilla: corregido,
  });
  assert.equal(despues.porJornada[0].nTaquilla, 2);
  assert.equal(despues.recaudacionTotal, 15);
  assert.equal(despues.tiposEntrada.find((t) => t.tipo === 'general').asistentes, 1);
});

test('ventasOrdenadas: la más reciente primero, y sin tocar el original', () => {
  const historial = [
    venta('general', 10, '2026-09-12T18:00:00Z', 'a'),
    venta('menor', 5, '2026-09-12T19:30:00Z', 'c'),
    venta('general', 10, '2026-09-12T18:45:00Z', 'b'),
  ];
  const d = { historial };
  assert.deepEqual(
    ventasOrdenadas(d).map((v) => v.id),
    ['c', 'b', 'a'],
  );
  assert.deepEqual(
    historial.map((v) => v.id),
    ['a', 'c', 'b'],
  );
});

test('ventasOrdenadas: una venta antigua sin hora no revienta el orden', () => {
  const d = { historial: [venta('general', 10, undefined, 'sin-hora'), venta('menor', 5, '2026-09-12T19:00:00Z', 'con-hora')] };
  assert.deepEqual(
    ventasOrdenadas(d).map((v) => v.id),
    ['con-hora', 'sin-hora'],
  );
});
