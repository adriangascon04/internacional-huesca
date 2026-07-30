// ============================================================================
//  src/repositories/jornadas.repository.js  ·  Colección 'jornadas_bloqueadas'.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import { session } from '../core/session.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const bloquearJornada = (jornadaKey, bloqueada) =>
  setDoc(doc(db, COLECCIONES.jornadasBloqueadas, jornadaKey), {
    bloqueada,
    fecha: new Date().toISOString(),
    // Auditoría (Upgrades #4): cerrar o reabrir un acta es la acción más
    // sensible del sistema; sin esto no se sabía quién la había reabierto.
    bloqueadaPor: session.email ?? null,
  });

/** Quita el cierre de una jornada dejándola como si nunca se hubiera cerrado. */
export const borrarBloqueo = (jornadaKey) =>
  deleteDoc(doc(db, COLECCIONES.jornadasBloqueadas, jornadaKey));

export function suscribirBloqueos(callback) {
  return onSnapshot(collection(db, COLECCIONES.jornadasBloqueadas), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data().bloqueada === true;
    });
    callback(map);
  });
}
