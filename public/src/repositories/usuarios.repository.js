// ============================================================================
//  src/repositories/usuarios.repository.js  ·  Colección 'usuarios' (roles).
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES } from '../config/app.config.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const obtenerUsuario = (uid) => getDoc(doc(db, COLECCIONES.usuarios, uid));
