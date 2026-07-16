// ============================================================================
//  src/repositories/backups.repository.js  ·  Colección 'backups'.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const col = () => collection(db, COLECCIONES.backups);

export const guardarBackup = (id, data) => setDoc(doc(db, COLECCIONES.backups, id), data);
export const borrarBackup = (id) => deleteDoc(doc(db, COLECCIONES.backups, id));
export const listarBackups = () => getDocs(query(col(), orderBy('fecha', 'desc')));

export function suscribirBackups(callback) {
  return onSnapshot(query(col(), orderBy('fecha', 'desc')), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
