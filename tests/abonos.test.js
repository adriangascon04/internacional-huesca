// ============================================================================
//  tests/abonos.test.js
//  Los tipos de abono y de entrada, que son configuración de negocio pura y
//  aun así deciden cuánto cobra el club y a quién se cuenta como asistente.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_ABONO,
  TIPOS_ENTRADA_POR_DEFECTO,
  esAportacionLibre,
  esGratuito,
  asisteAlCampo,
  precioAbonoPorDefecto,
  etiquetaAbono,
  descripcionAbono,
  esTipoEntradaRetirado,
} from '../src/config/app.config.js';
import {
  tiposDePartido,
  preciosDePartido,
  preciosVendiblesDePartido,
  tarifasPorDefecto,
} from '../src/services/competiciones.service.js';
import { resolverImporteAbono } from '../src/services/socios.service.js';

// --- Socio Colaborador (aportación libre) ------------------------------------

test('Socio Colaborador: existe, asiste al campo y no es gratuito', () => {
  const t = TIPOS_ABONO.find((x) => x.id === 'Socio Colaborador');
  assert.ok(t, 'el tipo de abono tiene que existir');
  assert.equal(esAportacionLibre('Socio Colaborador'), true);
  assert.equal(asisteAlCampo('Socio Colaborador'), true);
  assert.equal(esGratuito('Socio Colaborador'), false);
});

test('resolverImporteAbono: con aportación libre el importe es obligatorio', () => {
  // Sin esto, dejar la casilla vacía registraba un donativo de 0 € en silencio:
  // su tarifa de referencia es 0 y se heredaría sin que nadie lo notara.
  const vacio = resolverImporteAbono('Socio Colaborador', '');
  assert.equal(vacio.errores.length, 1);
  assert.match(vacio.errores[0], /aportación libre/i);

  const conImporte = resolverImporteAbono('Socio Colaborador', '250');
  assert.deepEqual(conImporte, { importe: 250, errores: [] });
});

test('resolverImporteAbono: en blanco hereda la tarifa del abono, no 0 €', () => {
  assert.deepEqual(resolverImporteAbono('Abono General', ''), {
    importe: 95,
    errores: [],
  });
  assert.deepEqual(resolverImporteAbono('Abono General', '   '), {
    importe: 95,
    errores: [],
  });
});

test('resolverImporteAbono: se puede cobrar un importe distinto de la tarifa', () => {
  // El precio del abono es editable: descuentos, altas a mitad de temporada…
  assert.deepEqual(resolverImporteAbono('Abono General', '60'), {
    importe: 60,
    errores: [],
  });
  // Un 0 explícito es válido (una invitación), un negativo no.
  assert.deepEqual(resolverImporteAbono('Abono General', '0'), {
    importe: 0,
    errores: [],
  });
  assert.equal(resolverImporteAbono('Abono General', '-5').errores.length, 1);
  assert.equal(resolverImporteAbono('Abono General', 'gratis').errores.length, 1);
});

// --- Etiquetas: una sola por abono en toda la aplicación ---------------------

test('etiquetaAbono: el desplegable y la tabla de tarifas dicen lo mismo', () => {
  // El desplegable enseña el id; la tabla de tarifas enseñaba el nombre
  // comercial largo, así que "Abono Familiar" y "Pack Familiar (…)" parecían
  // dos abonos distintos.
  TIPOS_ABONO.forEach((t) => assert.equal(etiquetaAbono(t.id), t.id));
  assert.equal(descripcionAbono('Abono Familiar'), 'Pack familiar: 2 adultos + hasta 3 hijos');
  assert.equal(descripcionAbono('Abono Jubilado'), ''); // no tiene, y no pasa nada
});

test('precioAbonoPorDefecto: un tipo desconocido no revienta', () => {
  assert.equal(precioAbonoPorDefecto('Abono Inventado'), 0);
  assert.equal(asisteAlCampo('Abono Inventado'), true);
});

// --- Tipo de entrada "socio", retirado de taquilla ---------------------------

test('taquilla: ya no se vende la "entrada de socio"', () => {
  // Un abonado entra con su QR y ya se cuenta como asistente ahí: venderle
  // además una entrada de 0 € lo contaba dos veces.
  assert.equal(esTipoEntradaRetirado('socio'), true);
  assert.equal(
    TIPOS_ENTRADA_POR_DEFECTO.some((t) => t.id === 'socio'),
    false,
  );
  assert.equal('socio' in tarifasPorDefecto(), false);
});

test('taquilla: un partido antiguo con precio de "socio" tampoco lo ofrece', () => {
  // Los partidos ya creados guardan sus tarifas en Firestore, y los tipos
  // vendibles se derivan de esas claves: sin filtrar, el tipo retirado
  // reaparecía en el desplegable de cualquier partido anterior.
  const competiciones = [
    {
      id: 'liga',
      nombre: 'Liga',
      partidos: [
        {
          id: 'p1',
          nombre: 'J1',
          orden: 0,
          precios: { general: 10, menor: 5, socio: 0, invitacion: 0 },
        },
      ],
    },
  ];
  assert.deepEqual(
    tiposDePartido(competiciones, 'p1').map((t) => t.id),
    ['general', 'menor', 'invitacion'],
  );
  assert.equal('socio' in preciosVendiblesDePartido(competiciones, 'p1'), false);
  // Pero la pantalla de edición de precios sí lo sigue viendo, para poder
  // corregir un dato que existe de verdad en la base de datos.
  assert.equal(preciosDePartido(competiciones, 'p1').socio, 0);
});
