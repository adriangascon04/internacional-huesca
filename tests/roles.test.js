import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarRol } from '../src/core/roles.js';

test('roles: Main se normaliza siempre a administrador', () => {
  assert.equal(normalizarRol('Main'), 'admin');
  assert.equal(normalizarRol(' MAIN '), 'admin');
  assert.equal(normalizarRol('ADMIN'), 'admin');
});
