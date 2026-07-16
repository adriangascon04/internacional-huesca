import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQr } from '../src/services/acceso.service.js';

test('parseQr: recorta el prefijo', () => {
  assert.equal(parseQr('HUESCA:5'), '5');
});

test('parseQr: insensible a mayúsculas (regresión del bug de recorte)', () => {
  assert.equal(parseQr('huesca:5'), '5');
  assert.equal(parseQr('Huesca:5'), '5');
});

test('parseQr: tolera espacios', () => {
  assert.equal(parseQr('  HUESCA:5  '), '5');
});

test('parseQr: sin prefijo devuelve el texto tal cual (entrada manual)', () => {
  assert.equal(parseQr('5'), '5');
});

test('parseQr: vacío y nulo no revientan', () => {
  assert.equal(parseQr(''), '');
  assert.equal(parseQr(null), '');
  assert.equal(parseQr(undefined), '');
});
