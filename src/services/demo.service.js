// ============================================================================
//  src/services/demo.service.js
//  Una temporada de mentira para enseñar cómo son las estadísticas cuando
//  todavía no hay datos reales.
//
//  REGLA QUE NO SE PUEDE ROMPER: esto NO escribe en Firestore ni toca el estado
//  de la aplicación. Genera objetos en memoria con la misma forma que los reales
//  y la página de estadísticas los usa EN LUGAR de los de verdad mientras el
//  modo demostración está encendido. Al apagarlo no hay nada que limpiar, porque
//  no se ha guardado nada en ninguna parte.
//
//  Por eso tampoco se recuerda entre recargas: un modo demostración pegajoso es
//  la forma más fácil de que alguien lea 8.000 € de recaudación inventados y se
//  los crea. Se apaga solo al recargar la página.
//
//  Los números son SIEMPRE los mismos (generador con semilla fija). Un demo que
//  cambia de cifras cada vez que se pulsa el botón parece que está roto.
// ============================================================================
import { TIPOS_ABONO, precioAbonoPorDefecto } from '../config/app.config.js';
import { tarifasPorDefecto } from './competiciones.service.js';

/**
 * Generador pseudoaleatorio con semilla (mulberry32). `Math.random()` daría
 * unas estadísticas distintas en cada pulsación.
 */
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nombres deliberadamente inventados y reconocibles como tales: si alguien ve
// esta lista tiene que saber al instante que no son socios del club.
const NOMBRES = [
  'Ejemplo',
  'Muestra',
  'Prueba',
  'Demo',
  'Modelo',
  'Ficticio',
  'Simulado',
  'Supuesto',
];
const APELLIDOS = [
  'de Prueba',
  'Ficticio',
  'Inventado',
  'de Muestra',
  'Simulado',
  'Imaginario',
];

/** Reparto de abonos parecido al que tendrá el club de verdad. */
const REPARTO = [
  ['Abono General', 42],
  ['Abono Familiar', 26],
  ['Abono -16 años', 18],
  ['Abono Jubilado', 14],
  ['Abono Academia', 12],
  ['Abono Internacional', 9],
  ['Socio Colaborador', 7],
];

/** Aportaciones típicas de un socio colaborador: de un detalle a un padrinazgo. */
const APORTACIONES = [20, 30, 50, 60, 100, 120, 200, 250, 500];

export const PREFIJO_DEMO = 'demo';
export const NOMBRE_COMPETICION_DEMO = 'Liga de ejemplo';

/**
 * Fecha/hora de un fichaje o una venta: jornada `j`, `hora` en punto más
 * `minutos`. Se construye en hora LOCAL (no en UTC) porque las estadísticas
 * leen la hora local: con una 'Z' al final, un partido de tarde salía de
 * madrugada en el gráfico de franjas horarias.
 */
function instante(j, hora, minutos) {
  const d = new Date(2026, 8, 6 + j * 3, hora, 0, 0); // septiembre = mes 8
  d.setMinutes(d.getMinutes() + minutos);
  return d.toISOString();
}

/** Partidos de la temporada de ejemplo: 12 en el calendario, 8 ya jugados. */
const N_PARTIDOS = 12;
const N_JUGADOS = 8;

/**
 * Temporada completa de ejemplo, con la misma forma que los datos reales.
 *
 * @returns {{socios:Array, entradas:object, taquilla:object,
 *            competiciones:Array, resumen:{socios:number, partidos:number}}}
 */
export function generarDatosDemo() {
  const rnd = aleatorio(20260807);

  // --- Socios ---------------------------------------------------------------
  const socios = [];
  let n = 0;
  for (const [tipo, cuantos] of REPARTO) {
    for (let i = 0; i < cuantos; i++) {
      n++;
      const gratuito = TIPOS_ABONO.find((t) => t.id === tipo)?.gratuito === true;
      const libre = tipo === 'Socio Colaborador';
      // Alta repartida por los meses de pretemporada, para que el gráfico de
      // evolución tenga forma en vez de ser una sola barra.
      const mes = 5 + Math.floor(rnd() * 4); // mayo … agosto
      const dia = 1 + Math.floor(rnd() * 27);
      socios.push({
        id: `${PREFIJO_DEMO}-s${n}`,
        numerico: n,
        carnet: n,
        nombre: NOMBRES[n % NOMBRES.length],
        ap1: APELLIDOS[n % APELLIDOS.length],
        ap2: '',
        tipoDoc: 'DNI / NIE',
        dni: `00000000${n}`.slice(-8) + 'X',
        // Edades repartidas de los 8 a los 78 para que el desglose demográfico
        // enseñe algo en todas las franjas.
        fnac: `${1948 + Math.floor(rnd() * 70)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`,
        tel: rnd() < 0.8 ? `6000000${String(n % 100).padStart(2, '0')}` : '',
        email: rnd() < 0.65 ? `ejemplo${n}@demostracion.invalid` : '',
        tipo,
        importeAbono: libre
          ? APORTACIONES[Math.floor(rnd() * APORTACIONES.length)]
          : precioAbonoPorDefecto(tipo),
        metodoPago: ['Bizum', 'TPV', 'Efectivo'][Math.floor(rnd() * 3)],
        // Un 12 % sin pagar: la morosidad en cero no enseña para qué sirve esa
        // tarjeta, y el club va a tener morosos.
        pagado: gratuito || rnd() > 0.12,
        alta: `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T11:00:00.000Z`,
        activo: true,
        tokenQR: `DEMO${n}`,
        demo: true,
      });
    }
  }

  // --- Calendario -----------------------------------------------------------
  const competiciones = [
    {
      id: `${PREFIJO_DEMO}-comp`,
      nombre: NOMBRE_COMPETICION_DEMO,
      orden: 0,
      partidos: Array.from({ length: N_PARTIDOS }, (_, i) => ({
        id: `${PREFIJO_DEMO}-p${i + 1}`,
        nombre: `Jornada ${String(i + 1).padStart(2, '0')}`,
        orden: i,
        precios: tarifasPorDefecto(),
      })),
    },
  ];

  // --- Asistencia y taquilla, jornada a jornada -----------------------------
  //
  // A cada socio se le da una "fidelidad" fija: hay quien no falta a una y
  // quien no aparece jamás. Sortear cada jornada por separado daría a todo el
  // mundo la misma asistencia media y el ranking y la curva de fidelidad —que
  // son justo dos de las tarjetas— saldrían planos y sin sentido.
  const fidelidad = new Map(
    socios.map((s) => [
      s.id,
      // Los del Abono Internacional casi no vienen: es lo que ese abono
      // significa, y así se ve para qué sirve excluirlos del % de asistencia.
      s.tipo === 'Abono Internacional' ? rnd() * 0.1 : 0.15 + rnd() * 0.85,
    ]),
  );

  const entradas = {};
  const taquilla = {};
  for (let j = 0; j < N_JUGADOS; j++) {
    const partido = competiciones[0].partidos[j];
    // Tirón del partido: hay jornadas con derbi y jornadas de martes lluvioso.
    const tiron = 0.55 + rnd() * 0.45;

    const fichajes = {};
    socios.forEach((s) => {
      if (rnd() > fidelidad.get(s.id) * tiron) return;
      // Puertas a las 17:00 y saque a las 19:00: la gente entra a lo largo de
      // esas dos horas y pico, apelotonada al final. Repartirlo por varias
      // horas no es un adorno — es lo único que hace legible el gráfico de
      // franjas horarias, que existe para dimensionar el personal de puerta.
      fichajes[s.id] = instante(j, 17, Math.floor(140 * Math.pow(rnd(), 1.7)));
    });
    entradas[partido.id] = fichajes;

    const nVentas = Math.round((18 + rnd() * 34) * tiron);
    const tarifas = tarifasPorDefecto();
    const historial = Array.from({ length: nVentas }, (_, v) => {
      const dado = rnd();
      const tipo = dado < 0.68 ? 'general' : dado < 0.93 ? 'menor' : 'invitacion';
      return {
        id: `${PREFIJO_DEMO}-v${j}-${v}`,
        tipo,
        nombreTipo:
          tipo === 'general'
            ? 'Entrada general'
            : tipo === 'menor'
              ? 'Entrada infantil'
              : 'Invitación',
        precio: tarifas[tipo] ?? 0,
        metodoPago: ['Efectivo', 'Bizum', 'TPV'][Math.floor(rnd() * 3)],
        hora: instante(j, 17, Math.floor(140 * Math.pow(rnd(), 1.6))),
        vendidoPor: 'demostracion@ejemplo.invalid',
      };
    });
    taquilla[partido.id] = { general: 0, menor: 0, historial };
  }

  return {
    socios,
    entradas,
    taquilla,
    competiciones,
    resumen: { socios: socios.length, partidos: N_JUGADOS },
  };
}
