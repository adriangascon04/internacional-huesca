// ============================================================================
//  src/services/roles.service.js
//  Comodidad de UI encima de la seguridad real (firestore.rules).
//  Roles: admin | taquillero | control_acceso | lector.
// ============================================================================
import { session } from '../core/session.js';

export const ROLES = {
  ADMIN: 'admin',
  TAQUILLERO: 'taquillero',
  CONTROL: 'control_acceso',
  LECTOR: 'lector',
};

export const esAdmin = () => session.rol === ROLES.ADMIN;
export const puedeVender = () => [ROLES.ADMIN, ROLES.TAQUILLERO].includes(session.rol);
export const puedeEscanear = () => [ROLES.ADMIN, ROLES.CONTROL].includes(session.rol);
export const puedeGestionarSocios = () => esAdmin();
export const puedeHacerBackup = () => esAdmin();
