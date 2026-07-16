// ============================================================================
//  src/repositories/taquilla.repository.js  ·  Colección 'taquilla'.
//  Un documento por jornada: { general, menor, historial:[{tipo,hora}] }.
//
//  ATÓMICO: usa increment() y arrayUnion(), que resuelve el SERVIDOR. Dos
//  taquilleros vendiendo a la vez ya no se pisan el contador. Antes, con
//  getDoc -> +1 -> setDoc, dos ventas simultáneas contaban como una.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const ref = (jornadaKey) => doc(db, COLECCIONES.taquilla, jornadaKey);

export const obtenerTaquilla = (jornadaKey) => getDoc(ref(jornadaKey));

/** Suma 1 al contador del tipo y añade la venta al historial, atómicamente. */
export async function sumarVenta(jornadaKey, tipo, venta) {
  const cambios = { [tipo]: increment(1), historial: arrayUnion(venta) };
  try {
    await updateDoc(ref(jornadaKey), cambios);
  } catch {
    await setDoc(ref(jornadaKey), { general: 0, menor: 0 }, { merge: true });
    await updateDoc(ref(jornadaKey), cambios);
  }
}

/** Resta 1 y quita esa venta concreta del historial. */
export const restarVenta = (jornadaKey, tipo, venta) =>
  updateDoc(ref(jornadaKey), { [tipo]: increment(-1), historial: arrayRemove(venta) });

export function suscribirTaquilla(callback) {
  return onSnapshot(collection(db, COLECCIONES.taquilla), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}
