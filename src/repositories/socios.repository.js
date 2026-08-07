// ============================================================================
//  src/repositories/socios.repository.js
//  Único punto que accede a la colección 'socios' en Firestore.
//  La UI NUNCA importa firestore directamente (Upgrades #8).
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES, carnetDe } from '../config/app.config.js';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const TAMANO_LOTE = 450; // margen bajo el límite duro de 500 de Firestore

const col = () => collection(db, COLECCIONES.socios);
const ref = (id) => doc(db, COLECCIONES.socios, String(id));

export const guardarSocio = (id, datos) => setDoc(ref(id), datos);
export const actualizarSocio = (id, campos) => updateDoc(ref(id), campos);

/** Borrado real de un socio. Ya no hay baja lógica (ver socios.service.js). */
export const borrarSocio = (id) => deleteDoc(ref(id));

/**
 * Borra varios socios en lotes. Lo usa el reinicio total de la aplicación.
 * En lote y no en un bucle de deleteDoc: son cientos de escrituras y así se
 * envían en unas pocas peticiones en vez de una por socio.
 * @param {string[]} ids
 */
export async function borrarSocios(ids = []) {
  for (let i = 0; i < ids.length; i += TAMANO_LOTE) {
    const lote = writeBatch(db);
    for (const id of ids.slice(i, i + TAMANO_LOTE)) lote.delete(ref(id));
    await lote.commit();
  }
}

/**
 * Aplica de golpe la renumeración de carnets.
 * En lote (writeBatch) y no en un bucle de updateDoc: o se renumeran TODOS o no
 * se renumera ninguno. Un fallo a mitad dejaría dos socios con el mismo número
 * de carnet, y entonces el escáner no sabría a quién validar.
 * Firestore limita el lote a 500 escrituras -> se trocea.
 * @param {Array<{id:string, campos:object}>} cambios
 */
export async function aplicarRenumeracion(cambios) {
  for (let i = 0; i < cambios.length; i += TAMANO_LOTE) {
    const lote = writeBatch(db);
    for (const { id, campos } of cambios.slice(i, i + TAMANO_LOTE)) {
      lote.update(ref(id), campos);
    }
    await lote.commit();
  }
}

/**
 * Suscripción en tiempo real a TODOS los socios.
 * OJO: antes usábamos query(col(), orderBy('numerico')). Firestore EXCLUYE de
 * los resultados los documentos que no tienen el campo del orderBy, así que
 * cualquier socio heredado sin 'numerico' desaparecía de la app sin ningún
 * aviso. Ahora traemos todo y ordenamos en el cliente (son cientos de docs,
 * no millones).
 * Se ordena por nº de CARNET, que es el que ve el club; `id` es la identidad
 * interna y ya no tiene por qué coincidir con él.
 */
export function suscribirSocios(callback) {
  return onSnapshot(col(), (snap) => {
    const lista = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    lista.sort((a, b) => carnetDe(a) - carnetDe(b));
    callback(lista);
  });
}
