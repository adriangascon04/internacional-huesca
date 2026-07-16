import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQr, comprobarToken } from '../src/services/acceso.service.js';

test('parseQr: recorta el prefijo', () => {
  assert.deepEqual(parseQr('HUESCA:5'), { id: '5', token: '' });
});

test('parseQr: insensible a mayúsculas (regresión del bug de recorte)', () => {
  assert.deepEqual(parseQr('huesca:5'), { id: '5', token: '' });
  assert.deepEqual(parseQr('Huesca:5'), { id: '5', token: '' });
});

test('parseQr: tolera espacios', () => {
  assert.deepEqual(parseQr('  HUESCA:5  '), { id: '5', token: '' });
});

test('parseQr: sin prefijo devuelve el texto tal cual (entrada manual)', () => {
  assert.deepEqual(parseQr('5'), { id: '5', token: '' });
});

test('parseQr: vacío y nulo no revientan', () => {
  assert.deepEqual(parseQr(''), { id: '', token: '' });
  assert.deepEqual(parseQr(null), { id: '', token: '' });
  assert.deepEqual(parseQr(undefined), { id: '', token: '' });
});

// --- v2: QR con token (Upgrades #5) ----------------------------------------

test('parseQr: separa id y token', () => {
  assert.deepEqual(parseQr('HUESCA:5:A7K9MNPQ2345'), {
    id: '5',
    token: 'A7K9MNPQ2345',
  });
});

test('parseQr: el token conserva las mayúsculas (no se normaliza el cuerpo)', () => {
  assert.equal(parseQr('huesca:5:A7K9MNPQ2345').token, 'A7K9MNPQ2345');
});

// --- Validación del token: de esto depende que un carnet falso entre o no ---

const SOCIO = { id: '5', tokenQR: 'A7K9MNPQ2345' };

test('token: el carnet auténtico pasa', () => {
  assert.equal(comprobarToken(SOCIO, 'A7K9MNPQ2345'), null);
});

test('token: un token inventado se rechaza', () => {
  assert.equal(comprobarToken(SOCIO, 'XXXXXXXXXXXX'), 'no_coincide');
});

test('token: distingue mayúsculas (no vale colar el token en minúsculas)', () => {
  assert.equal(comprobarToken(SOCIO, 'a7k9mnpq2345'), 'no_coincide');
});

test('token: entrada manual del personal no exige token', () => {
  assert.equal(comprobarToken(SOCIO, '', { manual: true }), null);
});

test('token: carnet viejo sin token se acepta SOLO si legacy está activo', () => {
  assert.equal(comprobarToken(SOCIO, '', { aceptaLegacy: true }), null);
  assert.equal(comprobarToken(SOCIO, '', { aceptaLegacy: false }), 'sin_token');
});

test('token: con legacy apagado, el "HUESCA:99" inventado ya no cuela', () => {
  const sinToken = { id: '99' };
  assert.equal(comprobarToken(sinToken, '', { aceptaLegacy: false }), 'sin_token');
});

test('token: un socio ya migrado rechaza su carnet viejo aunque legacy siga activo', () => {
  // Trae token pero no es el suyo -> carnet reemitido o falsificado.
  assert.equal(
    comprobarToken(SOCIO, 'VIEJO1234567', { aceptaLegacy: true }),
    'no_coincide',
  );
});
