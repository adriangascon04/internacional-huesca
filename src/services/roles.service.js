// ============================================================================
//  src/services/roles.service.js
//  Comodidad de UI encima de la seguridad real (firestore.rules).
//  Roles: admin | taquillero | control_acceso | lector.
// ============================================================================
import { session } from '../core/session.js';
import { normalizarRol } from '../core/roles.js';

export const ROLES = {
  ADMIN: 'admin',
  TAQUILLERO: 'taquillero',
  CONTROL: 'control_acceso',
  LECTOR: 'lector',
};

const rolActual = () => normalizarRol(session.rol);

export const esAdmin = () => rolActual() === ROLES.ADMIN;

// Todos los permisos DERIVAN de esAdmin en vez de volver a nombrarlo en una
// lista. Así un permiso nuevo no puede quedarse sin dárselo a admin/Main, que
// es de donde salían los avisos de "necesitas ser Main" con la sesión abierta.
// Mismo criterio que firestore.rules: si divergen, la UI enseña botones que el
// servidor rechaza (o los esconde pudiendo pulsarlos).
export const puedeVender = () => esAdmin() || rolActual() === ROLES.TAQUILLERO;
export const puedeEscanear = () => esAdmin() || rolActual() === ROLES.CONTROL;
export const puedeGestionarSocios = () => esAdmin();
export const puedeHacerBackup = () => esAdmin();
