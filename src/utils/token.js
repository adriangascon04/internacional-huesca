// ============================================================================
//  src/utils/token.js
//  Token del carnet (Upgrades #5). El QR era "HUESCA:<id>": con adivinar el
//  número de socio cualquiera se fabricaba un carnet válido desde internet.
//  Ahora cada socio lleva un token aleatorio que solo está en su ficha.
// ============================================================================
import { QR_LONGITUD_TOKEN } from '../config/app.config.js';

// Sin I, O, 0 ni 1: si alguien tiene que teclear el token a mano, no se
// confunden. 32 símbolos -> 256 % 32 == 0, así que `b % 32` reparte uniforme
// y no hay sesgo de módulo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Token imprevisible para el carnet de un socio.
 * Usa crypto.getRandomValues, NUNCA Math.random: este valor es la credencial
 * que da acceso al campo, y Math.random es predecible.
 */
export function generarTokenQR(longitud = QR_LONGITUD_TOKEN) {
  const bytes = new Uint8Array(longitud);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}
