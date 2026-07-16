// ============================================================================
//  src/config/app.config.js
//  TODA la configuración de negocio vive aquí (antes estaba dispersa y
//  duplicada en el HTML/JS). Cambiar precios, temporada o jornadas = editar
//  SOLO este archivo. Ver Upgrades #9 (configuración hardcodeada).
// ============================================================================

// --- Temporada activa (antes en un <option> y en localStorage) -------------
export const TEMPORADA_ACTUAL = localStorage.getItem('hue_temporada') || '2026/27';

// --- Jornadas ---------------------------------------------------------------
export const NUM_JORNADAS = 17;

// Firestore no admite '/' en los IDs de documento: por eso se sustituye por '-'.
export const jKey = (j) => j.replace(/\//g, '-');

/** Etiquetas visibles de las jornadas: "2026/27 - Jornada 01" */
export function getPartidosLabel(temporada = TEMPORADA_ACTUAL) {
  return Array.from(
    { length: NUM_JORNADAS },
    (_, i) => `${temporada} - Jornada ${String(i + 1).padStart(2, '0')}`,
  );
}

/** IDs de jornada (clave de Firestore, con '/' -> '-') */
export function getPartidos(temporada = TEMPORADA_ACTUAL) {
  return getPartidosLabel(temporada).map(jKey);
}

// --- Precios de taquilla (antes: window.PRECIOS y texto en el HTML) ---------
export const PRECIOS_TAQUILLA = { general: 10, menor: 5 };

// --- Tipos de abono ---------------------------------------------------------
// El "Abono Academia" es gratuito -> se marca pagado automáticamente al alta.
// El "Abono Internacional" no asiste al campo -> se excluye de las stats de asistencia.
// Los precios son de referencia (verifícalos con el club); no se usaban en la
// lógica original salvo como texto, así que quedan centralizados aquí.
export const TIPOS_ABONO = [
  { id: 'Abono Familiar', precio: 170, asiste: true, gratuito: false },
  { id: 'Abono General', precio: 95, asiste: true, gratuito: false },
  { id: 'Abono Internacional', precio: 80, asiste: false, gratuito: false },
  { id: 'Abono Academia', precio: 0, asiste: true, gratuito: true },
  { id: 'Abono Jubilado', precio: 75, asiste: true, gratuito: false },
  { id: 'Abono -16 años', precio: 50, asiste: true, gratuito: false },
];

export const esGratuito = (tipo) =>
  TIPOS_ABONO.find((t) => t.id === tipo)?.gratuito === true;
export const asisteAlCampo = (tipo) =>
  TIPOS_ABONO.find((t) => t.id === tipo)?.asiste !== false;

// --- Socio Fundador (antes DUPLICADO en líneas 680 y 884) -------------------
// Fundador = dado de alta antes del 30/05/2027 (fin de temporada 26/27).
export const FECHA_LIMITE_FUNDADOR = new Date('2027-05-30T23:59:59');
export const esFundador = (socio) =>
  !!socio?.alta && new Date(socio.alta) <= FECHA_LIMITE_FUNDADOR;

// --- Formato del QR (Upgrades #5) -------------------------------------------
// v1: texto plano "HUESCA:<id>" (compatibilidad con carnets ya impresos).
// TODO seguridad: migrar a "HUESCA:<id>:<hmac>" firmando en Cloud Function.
export const QR_PREFIX = 'HUESCA:';

// --- Colecciones de Firestore (evita strings mágicos repetidos) -------------
export const COLECCIONES = {
  socios: 'socios',
  entradas: 'entradas',
  taquilla: 'taquilla',
  jornadasBloqueadas: 'jornadas_bloqueadas',
  backups: 'backups',
  usuarios: 'usuarios',
  contadores: 'contadores',
};

export const MAX_BACKUPS = 7; // rotación de copias de seguridad
