// ============================================================================
//  src/repositories/jornadas.repository.js  ·  Colección 'jornadas_bloqueadas'.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const bloquearJornada = (jornadaKey, bloqueada) =>
  setDoc(doc(db, COLECCIONES.jornadasBloqueadas, jornadaKey), {
    bloqueada,
    fecha: new Date().toISOString(),
  });

export function suscribirBloqueos(callback) {
  return onSnapshot(collection(db, COLECCIONES.jornadasBloqueadas), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data().bloqueada === true;
    });
    callback(map);
  });
}
