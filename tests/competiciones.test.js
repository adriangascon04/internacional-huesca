// ============================================================================
//  tests/competiciones.test.js
//  Calendario configurable: orden de los partidos, tarifas por partido y la
//  migración desde el calendario fijo anterior.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partidosDe,
  partidoPorId,
  etiquetaPartido,
  preciosDePartido,
  tiposDePartido,
  partidosDisponibles,
  calendarioInicial,
  tarifasPorDefecto,
} from '../src/services/competiciones.service.js';
import { getPartidos, getPartidosLabel } from '../src/config/app.config.js';

const liga = {
  id: 'c1',
  nombre: 'Liga',
  orden: 0,
  partidos: [
    { id: 'p2', nombre: 'Jornada 2', orden: 1 },
    { id: 'p1', nombre: 'Jornada 1', orden: 0 },
  ],
};
const copa = {
  id: 'c2',
  nombre: 'Copa',
  orden: 1,
  partidos: [{ id: 'p3', nombre: 'Final', orden: 0 }],
};

// --- Orden ---------------------------------------------------------------------

test('partidosDe: respeta el orden de la competición y del partido', () => {
  const p = partidosDe([copa, liga]); // se pasan desordenadas a propósito
  assert.deepEqual(
    p.map((x) => x.id),
    ['p1', 'p2', 'p3'],
  );
});

test('partidosDe: cada partido sabe a qué competición pertenece', () => {
  assert.equal(partidoPorId([liga], 'p1').competicion, 'Liga');
  assert.equal(etiquetaPartido([liga], 'p1'), 'Liga · Jornada 1');
});

test('etiquetaPartido: una clave desconocida se devuelve tal cual', () => {
  assert.equal(etiquetaPartido([liga], 'lo-que-sea'), 'lo-que-sea');
});

test('partidosDe: una competición sin partidos no revienta', () => {
  assert.deepEqual(partidosDe([{ id: 'c3', nombre: 'Vacía' }]), []);
});

// --- Precios por partido -------------------------------------------------------

test('precios: cada partido puede tener su propia tarifa sin tocar los demás', () => {
  const comp = {
    id: 'c1',
    nombre: 'Liga',
    partidos: [
      { id: 'p1', nombre: 'J1', orden: 0, precios: { general: 10, menor: 5 } },
      { id: 'p2', nombre: 'J2', orden: 1, precios: { general: 12, menor: 6 } },
    ],
  };
  assert.equal(preciosDePartido([comp], 'p1').general, 10);
  assert.equal(preciosDePartido([comp], 'p2').general, 12);
  assert.equal(preciosDePartido([comp], 'p2').menor, 6);
});

test('precios: un partido sin tarifa propia hereda la de por defecto', () => {
  assert.deepEqual(preciosDePartido([liga], 'p1'), tarifasPorDefecto());
});

test('tipos: un tipo nuevo en los precios se vuelve vendible sin tocar el código', () => {
  const comp = {
    id: 'c1',
    nombre: 'Liga',
    partidos: [{ id: 'p1', nombre: 'J1', orden: 0, precios: { general: 10, vip: 40 } }],
  };
  const tipos = tiposDePartido([comp], 'p1');
  const vip = tipos.find((t) => t.id === 'vip');
  assert.equal(vip.precio, 40);
  assert.equal(vip.nombre, 'vip'); // sin nombre configurado, se usa el id
  // Un tipo conocido sí toma su etiqueta legible de la configuración.
  assert.equal(tipos.find((t) => t.id === 'general').nombre, 'Entrada general');
});

// --- Datos históricos ----------------------------------------------------------

test('disponibles: una clave con datos que ya no está en el calendario sigue visible', () => {
  // Borrar un partido del calendario NO puede esconder su asistencia ni su
  // taquilla: se mantiene como histórico al final de la lista.
  const p = partidosDisponibles([liga], ['2026-27 - Jornada 09']);
  assert.equal(p.length, 3);
  assert.equal(p.at(-1).id, '2026-27 - Jornada 09');
});

test('disponibles: una jornada con fichajes Y ventas no sale dos veces', () => {
  // Quien llama junta las claves de `entradas` con las de `taquilla`, así que
  // la jornada donde se ha hecho de todo llega repetida. Salía dos veces en
  // los selectores y en la tabla de estadísticas.
  const p = partidosDisponibles([], ['2026-27 - Jornada 01', '2026-27 - Jornada 01']);
  assert.deepEqual(
    p.map((x) => x.id),
    ['2026-27 - Jornada 01'],
  );
});

test('disponibles: una clave que YA está configurada no se duplica', () => {
  const p = partidosDisponibles([liga], ['p1', 'p2']);
  assert.deepEqual(
    p.map((x) => x.id),
    ['p1', 'p2'],
  );
});

// --- Migración del calendario fijo ---------------------------------------------

test('migración: crea un partido por cada jornada del calendario fijo', () => {
  const cal = calendarioInicial([], getPartidos(), getPartidosLabel());
  assert.equal(cal.partidos.length, 17);
  assert.equal(cal.nombre, 'Liga');
});

test('migración: conserva la clave con la que ya están guardados los datos', () => {
  // Es lo que hace que adoptar el calendario no mueva ni un acceso: el id del
  // partido es la MISMA clave que ya usan los docs de entradas y taquilla.
  const claves = getPartidos();
  const cal = calendarioInicial(claves, claves, getPartidosLabel());
  assert.equal(cal.partidos[0].id, claves[0]);
  assert.equal(cal.partidos[0].nombre, getPartidosLabel()[0]);
  // Y quedan ordenados de la 1 a la 17, no alfabéticamente.
  assert.deepEqual(
    cal.partidos.map((p) => p.orden),
    claves.map((_, i) => i),
  );
});

test('migración: adopta también claves sueltas que no estaban en el calendario', () => {
  const cal = calendarioInicial(
    ['jornada-inventada'],
    getPartidos(),
    getPartidosLabel(),
  );
  assert.equal(cal.partidos.length, 18);
  assert.equal(cal.partidos.at(-1).id, 'jornada-inventada');
  assert.equal(cal.partidos.at(-1).nombre, 'jornada/inventada');
});

test('migración: los partidos nacen con las tarifas por defecto', () => {
  const cal = calendarioInicial([], getPartidos(), getPartidosLabel());
  assert.deepEqual(cal.partidos[0].precios, tarifasPorDefecto());
  assert.equal(cal.partidos[0].precios.general, 10);
  assert.equal(cal.partidos[0].precios.menor, 5);
});
