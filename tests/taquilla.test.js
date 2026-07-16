import test from 'node:test';
import assert from 'node:assert/strict';
import { recaudacion } from '../public/src/services/taquilla.service.js';

test('recaudacion: general 10€ y menor 5€', () => {
  assert.equal(recaudacion({ general: 3, menor: 2 }), 40);
});

test('recaudacion: documento vacío no revienta', () => {
  assert.equal(recaudacion(), 0);
  assert.equal(recaudacion({}), 0);
});
