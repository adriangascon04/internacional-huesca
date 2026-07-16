import test from 'node:test';
import assert from 'node:assert/strict';
import {
  esDniValido,
  esEmailValido,
  esFechaValida,
  esTelefonoValido,
  esPasaporteValido,
  esDocumentoValido,
  normalizarDoc,
  validarSocio,
} from '../src/utils/validators.js';
import { esc } from '../src/utils/sanitize.js';

/** Socio válido mínimo; cada test rompe solo el campo que le interesa. */
const SOCIO_OK = {
  nombre: 'Ana',
  ap1: 'Pérez',
  ap2: 'Gil',
  dni: '12345678Z',
  fnac: '1990-01-01',
  tel: '600123456',
  email: 'a@b.com',
  tipo: 'Abono General',
};

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

test('fecha: acepta AAAA-MM-DD real y pasada', () => {
  assert.ok(esFechaValida('1990-01-01'));
  assert.ok(esFechaValida('2024-02-29')); // bisiesto
});

test('fecha: rechaza el número de serie de Excel (bug del importador)', () => {
  assert.ok(!esFechaValida('33970'));
});

test('fecha: rechaza fechas imposibles y formatos raros', () => {
  assert.ok(!esFechaValida('2024-02-31'));
  assert.ok(!esFechaValida('2023-02-29')); // no bisiesto
  assert.ok(!esFechaValida('01/01/1990'));
  assert.ok(!esFechaValida(''));
});

test('fecha: rechaza el futuro', () => {
  assert.ok(!esFechaValida('2099-01-01'));
});

test('sanitize: neutraliza el XSS del escáner', () => {
  assert.ok(!esc('<img src=x onerror="alert(1)">').includes('<img'));
  assert.ok(esc('a"b').includes('&quot;'));
});

test('validarSocio: socio completo no da errores', () => {
  assert.equal(validarSocio(SOCIO_OK).length, 0);
});

test('validarSocio: socio incompleto da errores', () => {
  assert.ok(validarSocio({ nombre: 'A' }).length > 0);
});

// --- Documentos internacionales ---------------------------------------------

test('doc: normaliza espacios, guiones y minúsculas', () => {
  assert.equal(normalizarDoc(' ab-123 456 '), 'AB123456');
  assert.equal(normalizarDoc(null), '');
});

test('pasaporte: acepta formatos de varios países', () => {
  assert.ok(esPasaporteValido('AB1234567')); // España
  assert.ok(esPasaporteValido('123456789')); // solo dígitos
  assert.ok(esPasaporteValido('ab-123 456')); // se normaliza antes de mirar
});

test('pasaporte: rechaza texto sin dígitos y longitudes absurdas', () => {
  assert.ok(!esPasaporteValido('PASAPORTE')); // la palabra en la casilla
  assert.ok(!esPasaporteValido('AB1')); // demasiado corto
  assert.ok(!esPasaporteValido('A12345678901234567')); // demasiado largo
  assert.ok(!esPasaporteValido(''));
});

test('doc: el tipo decide qué se comprueba', () => {
  // El mismo valor: inválido como DNI (letra mal), válido como pasaporte.
  assert.ok(!esDocumentoValido('12345678A', 'DNI / NIE'));
  assert.ok(esDocumentoValido('12345678A', 'Pasaporte'));
});

test('doc: sin tipo se asume DNI/NIE (socios anteriores al selector)', () => {
  assert.ok(esDocumentoValido('12345678Z'));
  assert.ok(!esDocumentoValido('12345678A'));
});

test('validarSocio: un pasaporte extranjero entra sin pelear con la letra', () => {
  const errores = validarSocio({
    ...SOCIO_OK,
    ap2: '',
    tipoDoc: 'Pasaporte',
    dni: 'C01X00T47',
  });
  assert.deepEqual(errores, []);
});

test('validarSocio: rechaza un tipo de documento inventado', () => {
  const errores = validarSocio({ ...SOCIO_OK, tipoDoc: 'Carnet de conducir' });
  assert.ok(errores.some((e) => e.includes('Tipo de documento desconocido')));
});

// --- Segundo apellido opcional ----------------------------------------------

test('validarSocio: sin segundo apellido es válido', () => {
  assert.deepEqual(validarSocio({ ...SOCIO_OK, ap2: '' }), []);
  const { ap2, ...sinCampo } = SOCIO_OK;
  assert.deepEqual(validarSocio(sinCampo), []);
});

test('validarSocio: el primer apellido SÍ sigue siendo obligatorio', () => {
  assert.ok(validarSocio({ ...SOCIO_OK, ap1: '' }).length > 0);
});

test('validarSocio: los errores nombran el campo en cristiano', () => {
  const errores = validarSocio({ ...SOCIO_OK, tel: '' });
  assert.ok(errores.some((e) => e.includes('Teléfono')));
  assert.ok(!errores.some((e) => e.includes('"tel"')));
});
