// ============================================================================
//  src/repositories/entradas.repository.js  ·  Colección 'entradas'.
//  Un documento por jornada: { <socioId>: <ISO fecha de acceso> }.
//
//  ATÓMICO: nunca se reescribe el documento entero. Antes hacíamos
//  getDoc -> modificar en memoria -> setDoc, y dos porteros escaneando a la
//  vez se pisaban: el último setDoc borraba la entrada del otro.
//  Ahora cada acceso escribe SOLO su campo con updateDoc + notación de punto.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const ref = (jornadaKey) => doc(db, COLECCIONES.entradas, jornadaKey);

export const obtenerEntradas = (jornadaKey) => getDoc(ref(jornadaKey));

/**
 * Registra el acceso de UN socio sin tocar los demás campos.
 * Si el documento de la jornada aún no existe, updateDoc falla -> lo creamos
 * con merge (que también es no destructivo).
 */
export async function registrarEntrada(jornadaKey, socioId, iso) {
  try {
    await updateDoc(ref(jornadaKey), { [socioId]: iso });
  } catch {
    await setDoc(ref(jornadaKey), { [socioId]: iso }, { merge: true });
  }
}

/** Borra el acceso de UN socio sin tocar los demás. */
export const borrarEntrada = (jornadaKey, socioId) =>
  updateDoc(ref(jornadaKey), { [socioId]: deleteField() });

export function suscribirEntradas(callback) {
  return onSnapshot(collection(db, COLECCIONES.entradas), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}
