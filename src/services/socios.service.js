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
  await repo.actualizarSocio(id, {
    ...campos,
    // Después del spread: el documento se guarda normalizado, como en el alta.
    ...(campos.dni ? { dni: datos.dni } : {}),
    ...(importeAbono === undefined ? {} : { importeAbono }),
    modificadoPor: session.email,
    modificadoEn: new Date().toISOString(),
  });
  return { ok: true };
}

export const marcarPagado = (id, pagado) =>
  repo.actualizarSocio(id, { pagado, modificadoPor: session.email });

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
