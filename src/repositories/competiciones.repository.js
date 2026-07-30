import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const col = () => collection(db, COLECCIONES.competiciones);
export const guardarCompeticion = (id, datos) =>
  setDoc(doc(db, COLECCIONES.competiciones, id), datos, { merge: true });
export const borrarCompeticion = (id) =>
  deleteDoc(doc(db, COLECCIONES.competiciones, id));
export const suscribirCompeticiones = (callback) =>
  onSnapshot(col(), (snap) =>
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    ),
  );
