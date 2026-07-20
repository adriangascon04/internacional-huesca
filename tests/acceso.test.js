import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQr, comprobarToken } from '../src/services/acceso.service.js';

test('parseQr: recorta el prefijo', () => {
  assert.deepEqual(parseQr('HUESCA:5'), { id: '5', token: '', temporada: '' });
});

test('parseQr: insensible a mayúsculas (regresión del bug de recorte)', () => {
  assert.deepEqual(parseQr('huesca:5'), { id: '5', token: '', temporada: '' });
  assert.deepEqual(parseQr('Huesca:5'), { id: '5', token: '', temporada: '' });
});

test('parseQr: tolera espacios', () => {
  assert.deepEqual(parseQr('  HUESCA:5  '), { id: '5', token: '', temporada: '' });
});

test('parseQr: sin prefijo devuelve el texto tal cual (entrada manual)', () => {
  assert.deepEqual(parseQr('5'), { id: '5', token: '', temporada: '' });
});

test('parseQr: vacío y nulo no revientan', () => {
  assert.deepEqual(parseQr(''), { id: '', token: '', temporada: '' });
  assert.deepEqual(parseQr(null), { id: '', token: '', temporada: '' });
  assert.deepEqual(parseQr(undefined), { id: '', token: '', temporada: '' });
});

// --- v2: QR con token (Upgrades #5) ----------------------------------------

test('parseQr: separa id y token', () => {
  assert.deepEqual(parseQr('HUESCA:5:A7K9MNPQ2345'), {
    id: '5',
    token: 'A7K9MNPQ2345',
    temporada: '',
  });
});

test('parseQr: el token conserva las mayúsculas (no se normaliza el cuerpo)', () => {
  assert.equal(parseQr('huesca:5:A7K9MNPQ2345').token, 'A7K9MNPQ2345');
});

// --- v3: QR con temporada ----------------------------------------------------

test('parseQr: separa id, token y temporada', () => {
  assert.deepEqual(parseQr('HUESCA:5:A7K9MNPQ2345:2026-27'), {
    id: '5',
    token: 'A7K9MNPQ2345',
    temporada: '2026-27',
  });
});

// --- Validación del token: de esto depende que un carnet falso entre o no ---

const SOCIO = { id: '5', tokenQR: 'A7K9MNPQ2345' };
const OPCIONES = { temporadaActual: '2026-27' };

test('token: el carnet auténtico de la temporada actual pasa', () => {
  assert.equal(comprobarToken(SOCIO, 'A7K9MNPQ2345', '2026-27', OPCIONES), null);
});

test('token: un token inventado se rechaza', () => {
  assert.equal(comprobarToken(SOCIO, 'XXXXXXXXXXXX', '2026-27', OPCIONES), 'no_coincide');
});

test('token: distingue mayúsculas (no vale colar el token en minúsculas)', () => {
  assert.equal(comprobarToken(SOCIO, 'a7k9mnpq2345', '2026-27', OPCIONES), 'no_coincide');
});

test('token: entrada manual del personal no exige token', () => {
  assert.equal(comprobarToken(SOCIO, '', '', { manual: true }), null);
});

test('token: carnet viejo sin token se acepta SOLO si legacy está activo', () => {
  assert.equal(comprobarToken(SOCIO, '', '', { aceptaLegacy: true }), null);
  assert.equal(comprobarToken(SOCIO, '', '', { aceptaLegacy: false }), 'sin_token');
});

test('token: con legacy apagado, el "HUESCA:99" inventado ya no cuela', () => {
  const sinToken = { id: '99' };
  assert.equal(comprobarToken(sinToken, '', '', { aceptaLegacy: false }), 'sin_token');
});

test('token: un socio ya migrado rechaza su carnet viejo aunque legacy siga activo', () => {
  // Trae token pero no es el suyo -> carnet reemitido o falsificado.
  assert.equal(
    comprobarToken(SOCIO, 'VIEJO1234567', '', { aceptaLegacy: true }),
    'no_coincide',
  );
});

test('token: el carnet de la temporada pasada NO abre tras renumerar', () => {
  // Es la garantía de la que depende poder reutilizar los nº de carnet: el
  // nuevo socio nº 5 tiene otro token, así que el QR del antiguo nº 5 falla.
  const nuevoNumero5 = { id: '31', carnet: 5, tokenQR: 'TOKEN2027ABC' };
  assert.equal(comprobarToken(nuevoNumero5, 'A7K9MNPQ2345', '', OPCIONES), 'no_coincide');
});

test('token: QR de una temporada anterior se rechaza aunque el token coincida', () => {
  // Defensa en profundidad: aunque el token no se hubiera regenerado, la
  // temporada embebida en el QR ya lo invalida.
  assert.equal(
    comprobarToken(SOCIO, 'A7K9MNPQ2345', '2025-26', OPCIONES),
    'temporada_anterior',
  );
});

test('token: un QR v2 sin temporada (emitido antes de este cambio) se acepta por el token', () => {
  assert.equal(comprobarToken(SOCIO, 'A7K9MNPQ2345', '', OPCIONES), null);
});

test('token: la entrada manual no exige temporada tampoco', () => {
  assert.equal(comprobarToken(SOCIO, '', '2020-21', { manual: true, ...OPCIONES }), null);
});
