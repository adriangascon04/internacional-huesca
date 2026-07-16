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
import { validarSocio } from '../utils/validators.js';
import { esGratuito } from '../config/app.config.js';
import { session } from '../core/session.js';

let _socios = [];
export const getSocios = () => _socios;
export const getSociosActivos = () => _socios.filter((s) => s.activo !== false);

/** Suscribe la lista de socios y notifica a la UI en cada cambio. */
export function iniciarSocios(onCambio) {
  return repo.suscribirSocios((lista) => {
    _socios = lista;
    onCambio(lista);
  });
}

/** Alta de socio. Devuelve { ok, id } o { ok:false, errores:[...] }. */
export async function altaSocio(datos) {
  datos = {
    ...datos,
    dni: String(datos.dni || '')
      .trim()
      .toUpperCase(),
  };
  const errores = validarSocio(datos);
  if (errores.length) return { ok: false, errores };
  if (_socios.some((s) => s.dni === datos.dni && s.activo !== false)) {
    return { ok: false, errores: ['Ya existe un socio con ese DNI.'] };
  }
  // Contador monotónico: nunca reutiliza IDs (arregla los "QR zombie").
  const maxActual = _socios.reduce((m, s) => Math.max(m, s.numerico || 0), 0);
  const num = await siguienteNumeroSocio(maxActual);
  const id = String(num);
  const ahora = new Date().toISOString();
  await repo.guardarSocio(id, {
    ...datos,
    numerico: num,
    alta: ahora,
    pagado: esGratuito(datos.tipo),
    activo: true,
    creadoPor: session.email, // auditoría
    creadoEn: ahora,
  });
  return { ok: true, id };
}

/** Edición de socio (Upgrades #2: antes NO se podía editar). */
export async function editarSocio(id, campos) {
  const errores = validarSocio({ ...obtener(id), ...campos });
  if (errores.length) return { ok: false, errores };
  await repo.actualizarSocio(id, {
    ...campos,
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
