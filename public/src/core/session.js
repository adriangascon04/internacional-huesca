// ============================================================================
//  src/core/session.js
//  Estado de sesión del usuario (uid, email, rol). Objeto único importable.
//  OJO: el rol aquí es SOLO para comodidad de la UI (ocultar botones).
//  La seguridad real la imponen las reglas de Firestore en el servidor.
// ============================================================================
export const session = {
  uid: null,
  email: null,
  rol: null,
};

export function setSession({ uid, email, rol }) {
  session.uid = uid;
  session.email = email;
  session.rol = rol;
}

export function clearSession() {
  session.uid = null;
  session.email = null;
  session.rol = null;
}
