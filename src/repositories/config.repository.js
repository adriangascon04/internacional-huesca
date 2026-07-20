// ============================================================================
//  src/repositories/config.repository.js  ·  Documento config/jornada_actual.
//  Cuál es la jornada "de hoy": el portero (control_acceso) solo puede
//  escanear en ella; el admin puede elegir cualquier otra pero ve un aviso.
// ============================================================================
import { db } from '../config/firebase.js';
import { COLECCIONES, DOC_JORNADA_ACTUAL } from '../config/app.config.js';
import { session } from '../core/session.js';
import {
  doc,
  setDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const ref = () => doc(db, COLECCIONES.config, DOC_JORNADA_ACTUAL);

export const fijarJornadaActual = (jornadaKey) =>
  setDoc(ref(), {
    jornada: jornadaKey,
    fecha: new Date().toISOString(),
    // Auditoría: quién marcó esta jornada como la actual.
    actualizadoPor: session.email ?? null,
  });

export function suscribirJornadaActual(callback) {
  return onSnapshot(ref(), (snap) => {
    callback(snap.exists() ? snap.data().jornada || '' : '');
  });
}
