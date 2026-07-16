// ============================================================================
//  tests/renumeracion.test.js
//  La renumeración de temporada compacta los nº de carnet tapando los huecos
//  que dejan las bajas. Es la operación con más capacidad de destrozo de la
//  app: si se equivoca, dos socios comparten número y el escáner no sabe a
//  quién validar. De ahí que el cálculo sea puro y esté testeado aparte de la
//  escritura en Firestore.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularRenumeracion } from '../src/services/socios.service.js';
import { carnetDe } from '../src/config/app.config.js';

const socio = (id, carnet) => ({ id: String(id), carnet, activo: true });

test('renumeración: compacta los huecos a 1..N', () => {
  // Bajas del 2 y el 4: quedan los carnets 1, 3, 5.
  const plan = calcularRenumeracion([socio('1', 1), socio('3', 3), socio('5', 5)]);
  assert.deepEqual(
    plan.map((p) => p.a),
    [1, 2, 3],
  );
});

test('renumeración: respeta la antigüedad (el veterano no pierde su sitio)', () => {
  const plan = calcularRenumeracion([socio('9', 9), socio('1', 1), socio('5', 5)]);
  // Entra desordenado y sale ordenado por su carnet anterior.
  assert.deepEqual(
    plan.map((p) => [p.de, p.a]),
    [
      [1, 1],
      [5, 2],
      [9, 3],
    ],
  );
});

test('renumeración: el id interno NO se toca (es la clave del historial)', () => {
  const plan = calcularRenumeracion([socio('7', 3), socio('2', 1)]);
  assert.deepEqual(
    plan.map((p) => p.socio.id),
    ['2', '7'],
  );
});

test('renumeración: sin huecos, cada socio conserva su número', () => {
  const plan = calcularRenumeracion([socio('1', 1), socio('2', 2), socio('3', 3)]);
  assert.deepEqual(
    plan.map((p) => p.a),
    [1, 2, 3],
  );
  assert.ok(plan.every((p) => p.de === p.a));
});

test('renumeración: no genera números repetidos', () => {
  const socios = Array.from({ length: 50 }, (_, i) => socio(i + 1, (i + 1) * 3));
  const nuevos = calcularRenumeracion(socios).map((p) => p.a);
  assert.equal(new Set(nuevos).size, nuevos.length);
});

test('renumeración: lista vacía no revienta', () => {
  assert.deepEqual(calcularRenumeracion([]), []);
});

// --- carnetDe: la compatibilidad con los socios anteriores al campo `carnet` -

test('carnetDe: usa `carnet` cuando existe', () => {
  assert.equal(carnetDe({ id: '7', numerico: 7, carnet: 3 }), 3);
});

test('carnetDe: cae a `numerico` y luego al id en socios heredados', () => {
  // Socios dados de alta antes de que existiera el nº de carnet: su número
  // visible era su id. Sin este fallback saldrían todos como "0".
  assert.equal(carnetDe({ id: '7', numerico: 7 }), 7);
  assert.equal(carnetDe({ id: '7' }), 7);
});

test('carnetDe: lo que no es número da 0, no NaN', () => {
  assert.equal(carnetDe(null), 0);
  assert.equal(carnetDe({ id: 'abc' }), 0);
});

test('renumeración: los socios heredados sin `carnet` también se ordenan bien', () => {
  const plan = calcularRenumeracion([
    { id: '5', numerico: 5 }, // heredado: su número es el 5
    { id: '2', carnet: 1 }, // ya renumerado
  ]);
  assert.deepEqual(
    plan.map((p) => [p.socio.id, p.a]),
    [
      ['2', 1],
      ['5', 2],
    ],
  );
});
