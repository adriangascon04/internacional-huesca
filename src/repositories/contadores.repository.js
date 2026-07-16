// ============================================================================
//  src/repositories/contadores.repository.js  ·  Colección 'contadores'.
//  Contador monotónico para el arreglo del bug de reutilización de IDs
//  (Upgrades #3). Usa transacción para evitar carreras.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  doc,
  runTransaction,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const ref = () => doc(db, COLECCIONES.contadores, 'socios');

/**
 * Devuelve el siguiente número de socio SIN reutilizar nunca uno anterior.
 * @param {number} minimoInicial  Valor de arranque si el contador no existe.
 */
export async function siguienteNumeroSocio(minimoInicial = 0) {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref());
    const actual = snap.exists() ? snap.data().ultimo || 0 : minimoInicial;
    const siguiente = actual + 1;
    tx.set(ref(), { ultimo: siguiente });
    return siguiente;
  });
}
