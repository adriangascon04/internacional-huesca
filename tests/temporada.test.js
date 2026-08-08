// ============================================================================
//  tests/temporada.test.js
//  Cómo va la temporada: lo jugado, la tendencia y la proyección. La tendencia
//  es la que más fácil miente, porque con pocos partidos cualquier variación
//  parece una señal.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularTemporada } from '../src/services/stats.service.js';

test('temporada: cuenta lo jugado, lo que queda y proyecta al ritmo actual', () => {
  const porJornada = [
    { totalAsistentes: 100, recaudacion: 100, nSocios: 80, nTaquilla: 20 },
    { totalAsistentes: 120, recaudacion: 140, nSocios: 90, nTaquilla: 30 },
    { totalAsistentes: 0, recaudacion: 0, nSocios: 0, nTaquilla: 0 },
    { totalAsistentes: 0, recaudacion: 0, nSocios: 0, nTaquilla: 0 },
  ];
  const t = calcularTemporada({ porJornada });
  assert.equal(t.jugados, 2);
  assert.equal(t.porJugar, 2);
  assert.equal(t.pctTemporada, 50);
  assert.equal(t.mediaRecaudacion, 120);
  assert.equal(t.proyeccionTaquilla, 240 + 120 * 2);
});

test('temporada: con menos de 4 partidos no se inventa una tendencia', () => {
  // Con dos partidos, "sube un 40%" es ruido disfrazado de dato.
  const t = calcularTemporada({
    porJornada: [
      { totalAsistentes: 100, recaudacion: 100, nSocios: 100, nTaquilla: 0 },
      { totalAsistentes: 140, recaudacion: 140, nSocios: 140, nTaquilla: 0 },
    ],
  });
  assert.equal(t.tendenciaAsistencia, null);
  assert.equal(t.tendenciaRecaudacion, null);
});

test('temporada: con partidos suficientes sí compara la segunda mitad con la primera', () => {
  const filas = [100, 100, 150, 150].map((n) => ({
    totalAsistentes: n,
    recaudacion: n,
    nSocios: n,
    nTaquilla: 0,
  }));
  const t = calcularTemporada({ porJornada: filas });
  assert.equal(t.tendenciaAsistencia, 50); // de 100 de media a 150
});

test('temporada: sin nada jugado no divide por cero', () => {
  const t = calcularTemporada({ porJornada: [] });
  assert.equal(t.jugados, 0);
  assert.equal(t.mediaAsistentes, 0);
  assert.equal(t.proyeccionTaquilla, 0);
  assert.equal(t.lleno, null);
});
