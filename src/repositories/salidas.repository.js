// ============================================================================
//  src/repositories/salidas.repository.js  ·  Colección 'salidas'.
//  Un documento por jornada: { <socioId>: <ISO fecha de salida> }.
//
//  Gemelo exacto de entradas.repository.js, y a propósito: la salida podría
//  haberse anidado dentro del registro de entrada ({ e: ..., s: ... }), pero eso
//  obligaba a migrar los documentos de 'entradas' que ya están grabados en
//  producción y a que el escáner supiera leer los dos formatos a la vez.
//  Una colección aparte no toca ni un byte de lo que ya hay.
//
//  Igual de ATÓMICO: cada fichaje escribe SOLO su campo (updateDoc + notación
//  de punto), así dos porteros en dos puertas no se pisan.
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

const ref = (jornadaKey) => doc(db, COLECCIONES.salidas, jornadaKey);

export const obtenerSalidas = (jornadaKey) => getDoc(ref(jornadaKey));

/** Registra la salida de UN socio sin tocar las demás. */
export async function registrarSalida(jornadaKey, socioId, iso) {
  try {
    await updateDoc(ref(jornadaKey), { [socioId]: iso });
  } catch {
    await setDoc(ref(jornadaKey), { [socioId]: iso }, { merge: true });
  }
}

/** Borra la salida de UN socio sin tocar las demás. */
export const borrarSalida = (jornadaKey, socioId) =>
  updateDoc(ref(jornadaKey), { [socioId]: deleteField() });

export function suscribirSalidas(callback) {
  return onSnapshot(collection(db, COLECCIONES.salidas), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}
