// ============================================================================
//  tests/mantenimiento.test.js
//  El resumen previo al reinicio. Es lo único que el usuario lee antes de
//  confirmar un borrado irreversible, así que si miente, miente en el peor
//  momento posible.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { resumenReinicio } from '../src/services/mantenimiento.service.js';

test('resumen: cuenta fichajes, ventas y jornadas cerradas', () => {
  const r = resumenReinicio({
    entradas: {
      j1: { 1: '2026-09-12T19:00:00Z', 2: '2026-09-12T19:05:00Z' },
      j2: { 1: '2026-09-19T19:00:00Z' },
    },
    taquilla: {
      j1: { general: 2, historial: [{ tipo: 'general' }, { tipo: 'menor' }] },
    },
    jornadasBloqueadas: { j1: true, j2: false },
  });

  assert.equal(r.jornadasConFichajes, 2);
  assert.equal(r.fichajes, 3);
  assert.equal(r.jornadasConVentas, 1);
  assert.equal(r.ventas, 2);
  assert.equal(r.jornadasCerradas, 1); // j2 está desbloqueada, no cuenta
});

test('resumen: sin datos no anuncia ningún borrado', () => {
  const r = resumenReinicio({});
  assert.deepEqual(r, {
    jornadasConFichajes: 0,
    fichajes: 0,
    jornadasConVentas: 0,
    ventas: 0,
    jornadasCerradas: 0,
  });
});

test('resumen: una jornada de taquilla sin historial no revienta el recuento', () => {
  // Los documentos anteriores al historial solo tienen contadores. Si esto
  // lanzara, el usuario no vería el resumen y no podría confirmar nada.
  const r = resumenReinicio({ taquilla: { j1: { general: 5, menor: 2 } } });
  assert.equal(r.jornadasConVentas, 1);
  assert.equal(r.ventas, 0);
});
