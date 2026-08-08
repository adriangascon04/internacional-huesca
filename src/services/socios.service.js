// ============================================================================
//  src/services/socios.service.js
//  Lógica de negocio de socios. La UI llama a estas funciones; nunca a Firestore.
//  Mejoras frente al original:
//   · Alta con validación de DNI/email/teléfono (Upgrades #7).
//   · ID no reutilizable vía contador monotónico (Upgrades #3).
//   · Metadatos de auditoría creadoPor/modificadoPor (Upgrades #4).
//
//  Ya NO hay baja de socio. Hubo un borrado lógico (`activo:false`) para no
//  reasignar carnets; se quitó porque el club no quiere el rastro y porque el
//  QR lleva el token del socio, que es lo que de verdad impide que un carnet
//  viejo abra la puerta (ver `eliminarSocio`). El filtro `activo !== false`
//  sigue en `getSociosActivos` por si queda alguna ficha marcada de antes.
// ============================================================================
import * as repo from '../repositories/socios.repository.js';
import { siguienteNumeroSocio } from '../repositories/contadores.repository.js';
import { validarSocio, normalizarDoc } from '../utils/validators.js';
import { generarTokenQR } from '../utils/token.js';
import {
  esGratuito,
  esAportacionLibre,
  carnetDe,
  TIPO_DOC_DNI,
  TEMPORADA_ACTUAL,
  temporadaDe,
  precioAbonoPorDefecto,
  METODOS_PAGO,
} from '../config/app.config.js';
import { session } from '../core/session.js';

let _socios = [];
export const getSocios = () => _socios;
export const getSociosActivos = () => _socios.filter((s) => s.activo !== false);

/** Busca por nº de CARNET (lo que va impreso y lo que teclea el portero). */
export const porCarnet = (carnet) =>
  getSociosActivos().find((s) => carnetDe(s) === Number(carnet));

/**
 * Busca por DNI/NIE (u otro documento). Fallback manual del escáner cuando el
 * lector no funciona y el portero no tiene a mano el nº de carnet: el nº de
 * socio puede variar de temporada a temporada, pero el documento no.
 */
export const porDni = (valor) => {
  const doc = normalizarDoc(valor);
  return doc ? getSociosActivos().find((s) => s.dni === doc) : undefined;
};

/** Siguiente nº de carnet libre: se pega al final de los que ya hay. */
const siguienteCarnet = () =>
  getSociosActivos().reduce((m, s) => Math.max(m, carnetDe(s)), 0) + 1;

/** Suscribe la lista de socios y notifica a la UI en cada cambio. */
export function iniciarSocios(onCambio) {
  return repo.suscribirSocios((lista) => {
    _socios = lista;
    onCambio(lista);
  });
}

/**
 * Resuelve el importe del abono a partir de lo tecleado.
 *
 * Un importe en blanco significa "cóbrale la tarifa de su abono", no 0 €: con
 * `??` a secas el '' de un <input> vacío pasaba a Number('') = 0 y el alta se
 * registraba como gratuita.
 *
 * Excepción: los abonos de APORTACIÓN LIBRE (el Socio Colaborador) no tienen
 * tarifa que heredar — su precio de referencia es 0 —, así que dejarlo en
 * blanco registraría un donativo de 0 € en silencio. Ahí el importe es
 * obligatorio.
 *
 * @returns {{importe:number, errores:string[]}}
 */
export function resolverImporteAbono(tipo, valor) {
  const indicado = String(valor ?? '').trim();
  if (indicado === '') {
    if (esAportacionLibre(tipo)) {
      return {
        importe: 0,
        errores: [
          `El abono «${tipo}» es de aportación libre: escribe cuánto aporta este socio.`,
        ],
      };
    }
    return { importe: precioAbonoPorDefecto(tipo), errores: [] };
  }
  const importe = Number(indicado);
  if (!Number.isFinite(importe) || importe < 0)
    return { importe: 0, errores: ['El importe del abono no es válido.'] };
  return { importe, errores: [] };
}

// ============================================================================
//  Cuotas por temporada
//
//  `importeAbono` guarda lo que paga el socio ESTA temporada, y con eso bastaba
//  mientras solo había una. Para responder a "¿cuánto ha aportado cada año?"
//  hace falta guardar una entrada por temporada, y eso es `cuotas`:
//
//     cuotas: [{ temporada, importe, metodoPago, pagado, fecha }]
//
//  Los socios dados de alta antes de que existiera el campo no lo tienen. No se
//  migran ni se les inventa historia: `cuotasDe` sintetiza sobre la marcha la
//  única cuota que se les puede atribuir con certeza — la de la temporada de su
//  alta, por el importe que tengan guardado. Así la ficha enseña algo cierto
//  desde el primer día, sin tocar un solo documento.
// ============================================================================

/**
 * Historial de cuotas del socio, ordenado de la más reciente a la más antigua.
 * @returns {Array<{temporada, importe, metodoPago, pagado, fecha}>}
 */
export function cuotasDe(socio) {
  if (!socio) return [];
  const guardadas = Array.isArray(socio.cuotas) ? socio.cuotas : [];
  if (guardadas.length) {
    return [...guardadas].sort((a, b) =>
      String(b.temporada).localeCompare(String(a.temporada)),
    );
  }
  return [
    {
      temporada: temporadaDe(socio.alta) || TEMPORADA_ACTUAL,
      importe: Number.isFinite(Number(socio.importeAbono))
        ? Number(socio.importeAbono)
        : precioAbonoPorDefecto(socio.tipo),
      metodoPago: socio.metodoPago || null,
      pagado: socio.pagado === true,
      fecha: socio.alta || null,
      sintetizada: true, // no está guardada: se deduce de la ficha
    },
  ];
}

/** Suma de lo REALMENTE cobrado en todas las temporadas. */
export const totalAportado = (socio) =>
  cuotasDe(socio)
    .filter((c) => c.pagado)
    .reduce((t, c) => t + Number(c.importe || 0), 0);

/**
 * Registra (o corrige) la cuota de una temporada. Si esa temporada ya estaba,
 * se reemplaza en su sitio en vez de duplicarse: un socio no puede tener dos
 * cuotas del mismo año, y permitirlo doblaría la recaudación sin avisar.
 *
 * La cuota de la temporada ACTUAL manda sobre `importeAbono` y `pagado`, que
 * siguen siendo la vista rápida que usan la lista y las estadísticas.
 */
export async function registrarCuota(id, { temporada, importe, metodoPago, pagado }) {
  const socio = obtener(id);
  if (!socio) return { ok: false, errores: ['Ese socio ya no existe.'] };

  const temp = String(temporada || '').trim();
  if (!/^\d{4}\/\d{2}$/.test(temp))
    return { ok: false, errores: ['La temporada no tiene el formato 2026/27.'] };

  const { importe: cantidad, errores } = resolverImporteAbono(socio.tipo, importe);
  if (errores.length) return { ok: false, errores };
  if (metodoPago && !METODOS_PAGO.includes(metodoPago))
    return { ok: false, errores: ['El método de pago no es válido.'] };

  const entrada = {
    temporada: temp,
    importe: cantidad,
    metodoPago: metodoPago || null,
    pagado: pagado === true,
    fecha: new Date().toISOString(),
  };
  // Se parte del historial actual —incluida la cuota sintetizada del alta, que
  // así queda guardada de verdad— y se sustituye la de esta temporada si ya
  // estaba. Duplicarla doblaría la aportación del socio sin avisar.
  const cuotas = cuotasDe(socio)
    .filter((c) => c.temporada !== temp)
    .map((c) => ({
      temporada: c.temporada,
      importe: Number(c.importe || 0),
      metodoPago: c.metodoPago || null,
      pagado: c.pagado === true,
      fecha: c.fecha || null,
    }))
    .concat(entrada)
    .sort((a, b) => String(a.temporada).localeCompare(String(b.temporada)));

  const campos = { cuotas, modificadoPor: session.email, modificadoEn: entrada.fecha };
  // La temporada en curso es además la que ve el resto de la aplicación.
  if (temp === TEMPORADA_ACTUAL) {
    campos.importeAbono = cantidad;
    campos.pagado = entrada.pagado;
    campos.metodoPago = entrada.metodoPago;
  }
  await repo.actualizarSocio(id, campos);
  return { ok: true };
}

/** Alta de socio. Devuelve { ok, id, carnet } o { ok:false, errores:[...] }. */
export async function altaSocio(datos) {
  datos = {
    ...datos,
    tipoDoc: datos.tipoDoc || TIPO_DOC_DNI,
    dni: normalizarDoc(datos.dni),
    ap2: String(datos.ap2 || '').trim(), // opcional: mucha gente no tiene
  };
  const errores = validarSocio(datos);
  const { importe: importeAbono, errores: erroresImporte } = resolverImporteAbono(
    datos.tipo,
    datos.importeAbono,
  );
  errores.push(...erroresImporte);
  if (datos.metodoPago && !METODOS_PAGO.includes(datos.metodoPago))
    errores.push('El método de pago no es válido.');
  if (errores.length) return { ok: false, errores };
  if (_socios.some((s) => s.dni === datos.dni && s.activo !== false)) {
    return { ok: false, errores: ['Ya existe un socio con ese documento.'] };
  }
  // Contador monotónico: nunca reutiliza IDs (arregla los "QR zombie"). Este es
  // el id INTERNO del socio, no el nº impreso en su carnet.
  const maxActual = _socios.reduce((m, s) => Math.max(m, s.numerico || 0), 0);
  const num = await siguienteNumeroSocio(maxActual);
  const id = String(num);
  const carnet = siguienteCarnet();
  const ahora = new Date().toISOString();
  await repo.guardarSocio(id, {
    ...datos,
    numerico: num,
    carnet, // nº visible; se recalcula al renumerar la temporada
    alta: ahora,
    // El importe queda congelado en el alta: una modificación futura de tarifas
    // no altera la recaudación histórica de socios. Sí se puede corregir a mano
    // desde la ficha del socio (ver `editarSocio`), porque el precio pactado no
    // siempre es la tarifa: descuentos, prorrateos y donativos.
    importeAbono,
    metodoPago: datos.metodoPago || null,
    pagado: esGratuito(datos.tipo) || datos.pagado === true,
    // Primera cuota de su historial. `importeAbono` sigue siendo la vista
    // rápida de la temporada en curso; `cuotas` es el año a año.
    cuotas: [
      {
        temporada: temporadaDe(ahora) || TEMPORADA_ACTUAL,
        importe: importeAbono,
        metodoPago: datos.metodoPago || null,
        pagado: esGratuito(datos.tipo) || datos.pagado === true,
        fecha: ahora,
      },
    ],
    activo: true,
    tokenQR: generarTokenQR(), // credencial del carnet (Upgrades #5)
    creadoPor: session.email, // auditoría
    creadoEn: ahora,
  });
  return { ok: true, id, carnet };
}

/**
 * Calcula la renumeración de una nueva temporada. Función PURA y exportada
 * aparte de la escritura para poder (a) enseñar el previo al admin antes de
 * que confirme y (b) testearla sin Firestore.
 *
 * Compacta los carnets de los socios activos a 1..N respetando su orden actual
 * (el veterano sigue teniendo número bajo) y le da a cada uno un token nuevo,
 * lo que invalida todos los carnets impresos de la temporada anterior.
 * El id interno NO se toca: el historial de entradas cuelga de él.
 */
export function calcularRenumeracion(socios = getSociosActivos()) {
  return [...socios]
    .sort((a, b) => carnetDe(a) - carnetDe(b))
    .map((s, i) => ({ socio: s, de: carnetDe(s), a: i + 1 }));
}

/**
 * Ejecuta la renumeración. Devuelve { ok, renumerados, huecos }.
 * `huecos` = cuántos números se han recuperado, que es lo que el club nota.
 */
export async function renumerarTemporada() {
  const plan = calcularRenumeracion();
  if (!plan.length) return { ok: false, errores: ['No hay socios activos.'] };

  const ahora = new Date().toISOString();
  await repo.aplicarRenumeracion(
    plan.map(({ socio, a }) => ({
      id: socio.id,
      campos: {
        carnet: a,
        // Token nuevo SIEMPRE, aunque el número no le cambie: si no, el carnet
        // viejo del socio que antes tenía ese número seguiría abriendo puerta.
        tokenQR: generarTokenQR(),
        modificadoPor: session.email,
        modificadoEn: ahora,
      },
    })),
  );

  const maxAnterior = plan.reduce((m, p) => Math.max(m, p.de), 0);
  return { ok: true, renumerados: plan.length, huecos: maxAnterior - plan.length };
}

/**
 * Devuelve el token del carnet, creándolo si el socio aún no lo tiene.
 * Es la migración de los socios anteriores a los QR firmados: se les asigna
 * token la primera vez que se genera su carnet nuevo.
 */
export async function asegurarTokenQR(id) {
  const s = obtener(id);
  if (!s) return null;
  if (s.tokenQR) return s.tokenQR;
  const tokenQR = generarTokenQR();
  await repo.actualizarSocio(id, {
    tokenQR,
    modificadoPor: session.email,
    modificadoEn: new Date().toISOString(),
  });
  return tokenQR;
}

/**
 * Edición de socio (Upgrades #2: antes NO se podía editar).
 *
 * `importeAbono` y `metodoPago` se editan como cualquier otro campo: el precio
 * del abono es una tarifa de referencia, no un precio cerrado — hay descuentos,
 * altas a mitad de temporada y, sobre todo, el Socio Colaborador, cuya cuota es
 * justo lo que decida aportar. Ese importe es el que suma en la recaudación de
 * socios, así que tiene que poder corregirse sin dar de alta al socio otra vez.
 */
export async function editarSocio(id, campos) {
  const datos = { ...obtener(id), ...campos };
  if (campos.dni) datos.dni = normalizarDoc(campos.dni);
  const errores = validarSocio(datos);

  // El importe solo se toca si viene en los campos: una edición que no lo
  // incluye (marcar pagado, guardar observaciones) no debe reescribirlo.
  let importeAbono;
  if ('importeAbono' in campos) {
    const r = resolverImporteAbono(datos.tipo, campos.importeAbono);
    errores.push(...r.errores);
    importeAbono = r.importe;
  }
  if (
    'metodoPago' in campos &&
    campos.metodoPago &&
    !METODOS_PAGO.includes(campos.metodoPago)
  )
    errores.push('El método de pago no es válido.');

  if (errores.length) return { ok: false, errores };
  // Mismo criterio que el alta: el documento no puede chocar con otro activo.
  if (_socios.some((s) => s.id !== id && s.dni === datos.dni && s.activo !== false)) {
    return { ok: false, errores: ['Ya existe otro socio con ese documento.'] };
  }
  const actualizado = {
    ...datos,
    ...(importeAbono === undefined ? {} : { importeAbono }),
  };
  await repo.actualizarSocio(id, {
    ...campos,
    // Después del spread: el documento se guarda normalizado, como en el alta.
    ...(campos.dni ? { dni: datos.dni } : {}),
    ...(importeAbono === undefined ? {} : { importeAbono }),
    // La cuota de la temporada en curso ES el importe del socio: si se
    // actualizara solo `importeAbono`, la ficha enseñaría 400 € arriba y 250 €
    // en la tabla del año a año, contradiciéndose consigo misma.
    cuotas: sincronizarCuotaActual(actualizado),
    modificadoPor: session.email,
    modificadoEn: new Date().toISOString(),
  });
  return { ok: true };
}

/**
 * Historial de cuotas con la entrada de la temporada en curso puesta al día a
 * partir de los campos "rápidos" del socio (`importeAbono`, `metodoPago`,
 * `pagado`). Si esa temporada aún no estaba en el historial, se añade.
 */
function sincronizarCuotaActual(socio) {
  const resto = cuotasDe(socio)
    .filter((c) => c.temporada !== TEMPORADA_ACTUAL)
    .map((c) => ({
      temporada: c.temporada,
      importe: Number(c.importe || 0),
      metodoPago: c.metodoPago || null,
      pagado: c.pagado === true,
      fecha: c.fecha || null,
    }));
  const previa = cuotasDe(socio).find((c) => c.temporada === TEMPORADA_ACTUAL);
  return [
    ...resto,
    {
      temporada: TEMPORADA_ACTUAL,
      importe: Number.isFinite(Number(socio.importeAbono))
        ? Number(socio.importeAbono)
        : precioAbonoPorDefecto(socio.tipo),
      metodoPago: socio.metodoPago || null,
      pagado: socio.pagado === true,
      fecha: previa?.fecha || socio.alta || new Date().toISOString(),
    },
  ].sort((a, b) => String(a.temporada).localeCompare(String(b.temporada)));
}

export function marcarPagado(id, pagado) {
  const socio = obtener(id);
  return repo.actualizarSocio(id, {
    pagado,
    // El estado de cobro es de una temporada concreta, no del socio para
    // siempre: se refleja en la cuota del año en curso.
    ...(socio ? { cuotas: sincronizarCuotaActual({ ...socio, pagado }) } : {}),
    modificadoPor: session.email,
  });
}

export const guardarObservaciones = (id, texto) =>
  repo.actualizarSocio(id, { observaciones: texto, modificadoPor: session.email });

/**
 * Elimina un socio DEFINITIVAMENTE.
 *
 * Antes existía la "baja de socio": un borrado lógico (`activo:false`) que
 * dejaba la ficha guardada para siempre. El club no la quiere — un socio que se
 * borra es casi siempre un alta equivocada, y el rastro solo servía para
 * ensuciar listas y estadísticas. Ahora se borra de verdad.
 *
 * Por qué esto NO reabre el viejo bug del "QR zombie": el nº de carnet visible
 * sí se reutiliza (el siguiente socio puede acabar con el número que quedó
 * libre), pero el QR no lleva solo el número, lleva además el token del socio,
 * que es aleatorio y distinto para cada uno. El carnet del socio borrado no
 * abre la puerta del que hereda su número. El id interno tampoco se reutiliza:
 * lo da un contador que solo sabe subir.
 *
 * El historial de accesos del socio borrado queda en `entradas` colgando de un
 * id que ya no existe; el escáner lo enseña como "(socio N)" y el reinicio de
 * datos de partido se lo lleva.
 */
export const eliminarSocio = (id) => repo.borrarSocio(id);

export const obtener = (id) => _socios.find((s) => s.id === id);
