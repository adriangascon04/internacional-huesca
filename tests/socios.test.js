// ============================================================================
//  tests/socios.test.js
//  Cubre la edición de socios (Upgrades #2), que existía en el service pero
//  no la llamaba nadie y no la probaba nada.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { editarSocio } from '../src/services/socios.service.js';

// DNI real válido para las pruebas: 12345678Z.
const VALIDO = {
  nombre: 'Ana',
  ap1: 'Pérez',
  ap2: 'Gil',
  dni: '12345678Z',
  fnac: '1990-01-01',
  tel: '600123456',
  email: 'ana@ejemplo.com',
  tipo: 'General',
};

test('editarSocio: rechaza un DNI inválido', async () => {
  const res = await editarSocio('1', { ...VALIDO, dni: '00000000A' });
  assert.equal(res.ok, false);
  assert.ok(res.errores.some((e) => e.includes('DNI')));
});

test('editarSocio: rechaza un email inválido', async () => {
  const res = await editarSocio('1', { ...VALIDO, email: 'ana@sin-tld' });
  assert.equal(res.ok, false);
  assert.ok(res.errores.some((e) => e.includes('email')));
});

test('editarSocio: rechaza campos obligatorios vacíos', async () => {
  const res = await editarSocio('1', { ...VALIDO, nombre: '' });
  assert.equal(res.ok, false);
  // El error nombra el campo como lo ve el usuario ("Nombre"), no como se
  // llama el campo por dentro: los errores se le enseñan tal cual al admin.
  assert.ok(res.errores.some((e) => e.includes('Nombre')));
});

test('editarSocio: el segundo apellido ya no es obligatorio', async () => {
  const res = await editarSocio('1', { ...VALIDO, ap2: '' });
  assert.equal(res.ok, true);
});

test('editarSocio: acepta datos válidos', async () => {
  const res = await editarSocio('1', VALIDO);
  assert.equal(res.ok, true);
});

test('editarSocio: el DNI en minúsculas se acepta (se normaliza)', async () => {
  const res = await editarSocio('1', { ...VALIDO, dni: '12345678z' });
  assert.equal(res.ok, true);
});
