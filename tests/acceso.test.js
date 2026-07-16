import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQr, comprobarToken, minutosEntre } from '../src/services/acceso.service.js';
import { duracion } from '../src/utils/format.js';

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

test('token: el carnet de la temporada pasada NO abre tras renumerar', () => {
  // Es la garantía de la que depende poder reutilizar los nº de carnet: el
  // nuevo socio nº 5 tiene otro token, así que el QR del antiguo nº 5 falla.
  const nuevoNumero5 = { id: '31', carnet: 5, tokenQR: 'TOKEN2027ABC' };
  assert.equal(comprobarToken(nuevoNumero5, 'A7K9MNPQ2345'), 'no_coincide');
});

// --- Tiempo dentro del campo ------------------------------------------------

test('minutosEntre: cuenta los minutos de estancia', () => {
  assert.equal(minutosEntre('2026-09-12T19:00:00', '2026-09-12T20:52:00'), 112);
});

test('minutosEntre: sale negativo si los fichajes van del revés', () => {
  // Dos puertas con el reloj descuadrado. No se corrige aquí: se detecta y
  // duracion() lo pinta como '—' en vez de un "-3min" sin sentido.
  assert.ok(minutosEntre('2026-09-12T20:00:00', '2026-09-12T19:57:00') < 0);
});

test('duracion: formatea horas y minutos en cristiano', () => {
  assert.equal(duracion(45), '45min');
  assert.equal(duracion(112), '1h 52min');
  assert.equal(duracion(120), '2h');
  assert.equal(duracion(0), '0min');
});

test('duracion: lo negativo o inválido se pinta como guion', () => {
  assert.equal(duracion(-5), '—');
  assert.equal(duracion(null), '—');
  assert.equal(duracion(undefined), '—');
});
