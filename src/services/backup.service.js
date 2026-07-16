// ============================================================================
//  src/services/backup.service.js
//  Copias de seguridad con rotación (máx. 7). Contiene datos personales:
//  solo admin (garantizado por firestore.rules). Registra quién la crea
//  (Upgrades #4 y #6).
// ============================================================================
import * as repo from '../repositories/backups.repository.js';
import { MAX_BACKUPS } from '../config/app.config.js';
import { session } from '../core/session.js';
import { getSocios } from './socios.service.js';

export function iniciarBackups(onCambio) {
  return repo.suscribirBackups(onCambio);
}

export async function crearBackup(entradas, taquilla, salidas = {}) {
  const socios = getSocios();
  const contenido = {
    socios,
    entradas,
    salidas,
    taquilla,
    generado: new Date().toISOString(),
  };
  const fecha = new Date().toISOString();
  const id = `backup_${Date.now()}`;
  await repo.guardarBackup(id, {
    fecha,
    nSocios: socios.length,
    nJornadas: Object.keys(entradas).length,
    contenido: JSON.stringify(contenido),
    creadoPor: session.email, // auditoría de exportaciones
  });
  // Rotación
  const todas = await repo.listarBackups();
  const ids = todas.docs.map((d) => d.id);
  for (const viejo of ids.slice(MAX_BACKUPS)) await repo.borrarBackup(viejo);
  return { nSocios: socios.length, nJornadas: Object.keys(entradas).length };
}

/** Descarga un backup como archivo JSON (el contenido ya está en memoria). */
export function descargarBackup(backup) {
  const blob = new Blob([backup.contenido], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_internacional_huesca_${backup.fecha.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
