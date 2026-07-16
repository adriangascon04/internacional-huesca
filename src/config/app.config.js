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

// --- Documento identificativo -----------------------------------------------
// El club admite socios extranjeros, así que el DNI/NIE no puede ser el único
// documento. Solo el DNI/NIE tiene letra de control comprobable; para los demás
// se valida la forma y se confía en quien lo teclea (ver utils/validators.js).
export const TIPO_DOC_DNI = 'DNI / NIE';
export const TIPOS_DOCUMENTO = [TIPO_DOC_DNI, 'Pasaporte', 'Otro'];
// Los socios dados de alta antes de que existiera el selector no tienen el
// campo: todos ellos eran DNI/NIE, así que ese es el valor por defecto.
export const tipoDocDe = (socio) => socio?.tipoDoc || TIPO_DOC_DNI;

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

// --- Umbrales de asistencia (Upgrades #9) -----------------------------------
// Estaban hardcodeados en stats.page.js: `pct > 70 ? ok : pct > 30 ? warn : no`.
// % de socios (sobre los que asisten al campo) a partir del cual la jornada se
// pinta en verde / ámbar. Por debajo del mínimo, en rojo.
export const UMBRALES_ASISTENCIA = { bueno: 70, medio: 30 };

/** Clase CSS del badge de asistencia según el % de la jornada. */
export const claseAsistencia = (pct) =>
  pct > UMBRALES_ASISTENCIA.bueno
    ? 'badge-ok'
    : pct > UMBRALES_ASISTENCIA.medio
      ? 'badge-warn'
      : 'badge-no';

// --- Formato del QR (Upgrades #5) -------------------------------------------
// v1: "HUESCA:<id>"          -> falsificable: basta adivinar el nº de socio.
// v2: "HUESCA:<id>:<token>"  -> el token es aleatorio y vive en la ficha del
//     socio, así que ya no se puede fabricar un carnet desde fuera.
export const QR_PREFIX = 'HUESCA:';
export const QR_SEPARADOR = ':';
export const QR_LONGITUD_TOKEN = 12; // 32^12 ≈ 2^60 combinaciones

// ⚠️ INTERRUPTOR DE LA MIGRACIÓN.
//   true  -> se siguen aceptando los carnets v1 (sin token). OJO: mientras esté
//            en true el agujero SIGUE ABIERTO, porque un "HUESCA:99" inventado
//            se acepta igual.
//   false -> un QR sin token se rechaza.
// Se pone en false porque no hay ningún carnet v1 impreso: todos los carnets se
// emiten ya con token. La vía de escape cuando un QR no lee sigue siendo la
// entrada manual del escáner, que no exige token (ver comprobarToken).
export const QR_ACEPTA_LEGACY = false;

// --- Colecciones de Firestore (evita strings mágicos repetidos) -------------
export const COLECCIONES = {
  socios: 'socios',
  entradas: 'entradas',
  // Las salidas van en su propia colección, con la misma forma que 'entradas'
  // ({ <socioId>: <ISO> }), en vez de anidarse dentro de cada entrada. Así los
  // datos de entradas ya grabados no hay que migrarlos ni se pueden romper.
  salidas: 'salidas',
  taquilla: 'taquilla',
  jornadasBloqueadas: 'jornadas_bloqueadas',
  backups: 'backups',
  usuarios: 'usuarios',
  contadores: 'contadores',
};

export const MAX_BACKUPS = 7; // rotación de copias de seguridad

// --- Afluencia (estadísticas de horas de entrada/salida) --------------------
// Ancho de la franja en la que se agrupan los fichajes. 15 min da una curva
// legible sin que cada barra sea una anécdota; 60 aplanaría el pico de llegada,
// que es justo lo que se quiere ver.
export const FRANJA_MINUTOS = 15;

// --- Números de carnet (renumeración por temporada) --------------------------
// Hay DOS números por socio y no son el mismo:
//
//   · id del documento -> IDENTIDAD INTERNA. La asigna el contador, es
//     monotónica, no se reutiliza JAMÁS y el socio la conserva de por vida.
//     Es la clave con la que se guardan sus entradas y salidas, así que su
//     historial sobrevive a cualquier renumeración. No se enseña en la UI.
//
//   · campo `carnet` -> NÚMERO VISIBLE. Es el que va impreso en el carnet, el
//     que se ve en las listas y el que teclea el portero. Al empezar temporada
//     se compacta (1..N) para tapar los huecos que dejan las bajas.
//
// Reutilizar el número visible sería el viejo bug del "QR zombie" si el QR solo
// llevara el número. No lo es porque el QR lleva además el token del socio: el
// carnet del antiguo nº 3 no abre la puerta del nuevo nº 3, porque su token no
// coincide. Por eso renumerar OBLIGA a regenerar tokens y reimprimir carnets.
export const carnetDe = (socio) =>
  Number(socio?.carnet ?? socio?.numerico ?? socio?.id) || 0;
