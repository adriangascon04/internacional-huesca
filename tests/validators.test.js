import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esDniValido,
  esEmailValido,
  esTelefonoValido,
  validarSocio,
} from '../public/src/utils/validators.js';
import { esc } from '../public/src/utils/sanitize.js';

test('DNI: valida la letra de control', () => {
  assert.ok(esDniValido('12345678Z'));
  assert.ok(!esDniValido('12345678A'));
});

test('DNI: acepta NIE', () => {
  assert.ok(esDniValido('X1234567L'));
});

test('DNI: rechaza basura y vacío', () => {
  assert.ok(!esDniValido('AAA'));
  assert.ok(!esDniValido(''));
});

test('email: exige TLD', () => {
  assert.ok(esEmailValido('a@b.com'));
  assert.ok(!esEmailValido('a@b'));
});

test('teléfono: 9 dígitos, admite +34', () => {
  assert.ok(esTelefonoValido('600123456'));
  assert.ok(esTelefonoValido('+34 600123456'));
  assert.ok(!esTelefonoValido('12345'));
});

test('sanitize: neutraliza el XSS del escáner', () => {
  assert.ok(!esc('<img src=x onerror="alert(1)">').includes('<img'));
  assert.ok(esc('a"b').includes('&quot;'));
});

test('validarSocio: socio completo no da errores', () => {
  assert.equal(
    validarSocio({
      nombre: 'Ana',
      ap1: 'Pérez',
      ap2: 'Gil',
      dni: '12345678Z',
      fnac: '1990-01-01',
      tel: '600123456',
      email: 'a@b.com',
      tipo: 'Abono General',
    }).length,
    0,
  );
});

test('validarSocio: socio incompleto da errores', () => {
  assert.ok(validarSocio({ nombre: 'A' }).length > 0);
});
