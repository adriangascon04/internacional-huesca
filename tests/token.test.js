// ============================================================================
//  tests/token.test.js  ·  Token del carnet (Upgrades #5).
//  Es la credencial que abre el campo: si fuera predecible o repetido, el
//  arreglo del QR falsificable no serviría de nada.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { generarTokenQR } from '../src/utils/token.js';
import { QR_LONGITUD_TOKEN } from '../src/config/app.config.js';

test('token: longitud por defecto', () => {
  assert.equal(generarTokenQR().length, QR_LONGITUD_TOKEN);
});

test('token: solo usa el alfabeto sin caracteres confundibles', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generarTokenQR(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  }
});

test('token: no se repite (1000 tiradas, todas distintas)', () => {
  const vistos = new Set();
  for (let i = 0; i < 1000; i++) vistos.add(generarTokenQR());
  assert.equal(vistos.size, 1000);
});

test('token: respeta la longitud pedida', () => {
  assert.equal(generarTokenQR(24).length, 24);
});
