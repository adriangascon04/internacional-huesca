// ============================================================================
//  src/services/socios.service.js
//  Lógica de negocio de socios. La UI llama a estas funciones; nunca a Firestore.
//  Mejoras frente al original:
//   · Alta con validación de DNI/email/teléfono (Upgrades #7).
//   · ID no reutilizable vía contador monotónico (Upgrades #3).
//   · Borrado LÓGICO (activo:false) en vez de físico -> no reasigna carnets.
//   · Metadatos de auditoría creadoPor/modificadoPor (Upgrades #4).
// ============================================================================
import * as repo from '../repositories/socios.repository.js';
import { siguienteNumeroSocio } from '../repositories/contadores.repository.js';
import { validarSocio, normalizarDoc } from '../utils/validators.js';
import { generarTokenQR } from '../utils/token.js';
import {
  esGratuito,
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

/** Alta de socio. Devuelve { ok, id, carnet } o { ok:false, errores:[...] }. */
export async function altaSocio(datos) {
  datos = {
    ...datos,
    tipoDoc: datos.tipoDoc || TIPO_DOC_DNI,
    dni: normalizarDoc(datos.dni),
    ap2: String(datos.ap2 || '').trim(), // opcional: mucha gente no tiene
  };
  const errores = validarSocio(datos);
  // Un importe en blanco significa "cóbrale la tarifa de su abono", no 0 €.
  // Con `??` a secas el '' del <input> vacío pasaba a Number('') = 0 y el alta
  // se registraba como gratuita.
  const importeIndicado = String(datos.importeAbono ?? '').trim();
  const importeAbono =
    importeIndicado === ''
      ? precioAbonoPorDefecto(datos.tipo)
      : Number(importeIndicado);
  if (!Number.isFinite(importeAbono) || importeAbono < 0)
    errores.push('El importe del abono no es válido.');
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
    // El importe y método quedan congelados en el alta. Así una modificación
    // futura de tarifas no altera la recaudación histórica de socios.
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

/** Edición de socio (Upgrades #2: antes NO se podía editar). */
export async function editarSocio(id, campos) {
  const datos = { ...obtener(id), ...campos };
  if (campos.dni) datos.dni = normalizarDoc(campos.dni);
  const errores = validarSocio(datos);
  if (errores.length) return { ok: false, errores };
  // Mismo criterio que el alta: el documento no puede chocar con otro activo.
  if (_socios.some((s) => s.id !== id && s.dni === datos.dni && s.activo !== false)) {
    return { ok: false, errores: ['Ya existe otro socio con ese documento.'] };
  }
  await repo.actualizarSocio(id, {
    ...campos,
    // Después del spread: el documento se guarda normalizado, como en el alta.
    ...(campos.dni ? { dni: datos.dni } : {}),
    modificadoPor: session.email,
    modificadoEn: new Date().toISOString(),
  });
  return { ok: true };
}

export const marcarPagado = (id, pagado) =>
  repo.actualizarSocio(id, { pagado, modificadoPor: session.email });

export const guardarObservaciones = (id, texto) =>
  repo.actualizarSocio(id, { observaciones: texto, modificadoPor: session.email });

/** Baja LÓGICA: el carnet/QR deja de ser válido pero el ID no se reasigna. */
export const bajaSocio = (id) =>
  repo.actualizarSocio(id, {
    activo: false,
    bajaPor: session.email,
    bajaEn: new Date().toISOString(),
  });

export const obtener = (id) => _socios.find((s) => s.id === id);
