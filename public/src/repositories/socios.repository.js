// ============================================================================
//  src/repositories/socios.repository.js
//  Único punto que accede a la colección 'socios' en Firestore.
//  La UI NUNCA importa firestore directamente (Upgrades #8).
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const col = () => collection(db, COLECCIONES.socios);
const ref = (id) => doc(db, COLECCIONES.socios, String(id));

export const socioRef = ref;
export const guardarSocio = (id, datos) => setDoc(ref(id), datos);
export const actualizarSocio = (id, campos) => updateDoc(ref(id), campos);
export const obtenerSocio = (id) => getDoc(ref(id));

/**
 * Suscripción en tiempo real a TODOS los socios.
 * OJO: antes usábamos query(col(), orderBy('numerico')). Firestore EXCLUYE de
 * los resultados los documentos que no tienen el campo del orderBy, así que
 * cualquier socio heredado sin 'numerico' desaparecía de la app sin ningún
 * aviso. Ahora traemos todo y ordenamos en el cliente (son cientos de docs,
 * no millones).
 */
export function suscribirSocios(callback) {
  return onSnapshot(col(), (snap) => {
    const lista = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    lista.sort((a, b) => (Number(a.numerico) || 0) - (Number(b.numerico) || 0));
    callback(lista);
  });
}
