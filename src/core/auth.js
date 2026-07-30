// ============================================================================
//  src/core/auth.js
//  Autenticación y carga del rol. Envuelve Firebase Auth: ningún otro
//  módulo importa firebase-auth directamente.
// ============================================================================
import { auth } from '../config/firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { obtenerUsuario } from '../repositories/usuarios.repository.js';
import { setSession, clearSession } from './session.js';
import { normalizarRol } from './roles.js';

export const login = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);

/**
 * Observa el estado de sesión. Al entrar, lee el rol de /usuarios/{uid}.
 * @param {(user|null) => void} callback
 */
export function observarSesion(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      clearSession();
      return callback(null);
    }
    let rol = null;
    try {
      const snap = await obtenerUsuario(user.uid);
      rol = snap.exists() ? snap.data().rol : null;
    } catch (e) {
      console.error('No se pudo leer el rol del usuario:', e);
    }
    setSession({ uid: user.uid, email: user.email, rol: normalizarRol(rol) });
    callback(user);
  });
}
