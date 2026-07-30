// ============================================================================
//  src/config/app.config.js
//  TODA la configuración de negocio vive aquí (antes estaba dispersa y
//  duplicada en el HTML/JS). Cambiar precios, temporada o jornadas = editar
//  SOLO este archivo. Ver Upgrades #9 (configuración hardcodeada).
// ============================================================================

// --- Temporada activa (antes en un <option> y en localStorage) -------------
export const TEMPORADA_ACTUAL = localStorage.getItem('hue_temporada') || '2026/27';

// Solo compatibilidad de migración para documentos y pruebas de la versión
// anterior. La aplicación ya no usa esta lista para configurar su calendario.
export const jKey = (j) => j.replace(/\//g, '-');
export const getPartidosLabel = (temporada = TEMPORADA_ACTUAL) =>
  Array.from(
    { length: 17 },
    (_, i) => `${temporada} - Jornada ${String(i + 1).padStart(2, '0')}`,
  );
export const getPartidos = (temporada = TEMPORADA_ACTUAL) =>
  getPartidosLabel(temporada).map(jKey);

// --- Precios por defecto ----------------------------------------------------
// Son valores iniciales, no una lista cerrada: cada partido guarda su propia
// tarifa y cada venta conserva el importe que realmente se cobró.
export const TIPOS_ENTRADA_POR_DEFECTO = [
  { id: 'general', nombre: 'Entrada general', precio: 10, nota: 'incluye sorteo' },
  { id: 'menor', nombre: 'Entrada infantil', precio: 5 },
  { id: 'socio', nombre: 'Socio con entrada incluida', precio: 0 },
  { id: 'invitacion', nombre: 'Invitación', precio: 0 },
];
export const METODOS_PAGO = ['Bizum', 'TPV', 'Efectivo'];
export const PRECIOS_TAQUILLA = { general: 10, menor: 5 }; // compatibilidad legacy
export const tipoEntradaPorId = (id) =>
  TIPOS_ENTRADA_POR_DEFECTO.find((tipo) => tipo.id === id);

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
  {
    id: 'Abono Familiar',
    nombre: 'Pack Familiar (2 adultos + hasta 3 hijos)',
    precio: 170,
    asiste: true,
    gratuito: false,
  },
  {
    id: 'Abono General',
    nombre: 'Abono Normal',
    precio: 95,
    asiste: true,
    gratuito: false,
  },
  {
    id: 'Abono Internacional',
    nombre: 'Internacional',
    precio: 80,
    asiste: false,
    gratuito: false,
  },
  {
    id: 'Abono Academia',
    nombre: 'Jugadores de la escuela',
    precio: 0,
    asiste: true,
    gratuito: true,
  },
  { id: 'Abono Jubilado', precio: 75, asiste: true, gratuito: false },
  { id: 'Abono -16 años', precio: 50, asiste: true, gratuito: false },
];

/** Etiqueta legible de un abono. Varios tipos no traen `nombre`: su id ya lo es. */
export const nombreAbono = (tipo) =>
  TIPOS_ABONO.find((t) => t.id === tipo)?.nombre || tipo;

export const esGratuito = (tipo) =>
  TIPOS_ABONO.find((t) => t.id === tipo)?.gratuito === true;
export const precioAbonoPorDefecto = (tipo) =>
  TIPOS_ABONO.find((t) => t.id === tipo)?.precio ?? 0;
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
// v1: "HUESCA:<id>"                     -> falsificable: basta adivinar el
//     nº de socio.
// v2: "HUESCA:<id>:<token>"              -> el token es aleatorio y vive en
//     la ficha del socio, así que ya no se puede fabricar un carnet desde
//     fuera.
// v3: "HUESCA:<id>:<token>:<temporada>"  -> añade la temporada en la que se
//     emitió el carnet. Aunque el token no cambiara al renumerar, un QR de
//     una temporada anterior se rechaza igualmente (ver comprobarToken en
//     acceso.service.js). Cambiar de formato en producción implica reemitir
//     y reimprimir todos los carnets (pestaña QR -> "Descargar todos ZIP").
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
  taquilla: 'taquilla',
  jornadasBloqueadas: 'jornadas_bloqueadas',
  backups: 'backups',
  usuarios: 'usuarios',
  competiciones: 'competiciones',
  contadores: 'contadores',
  // Documento único (config/jornada_actual): cuál es la jornada "de hoy". El
  // portero solo puede escanear en ella; el admin puede elegir cualquiera
  // pero ve un aviso si no coincide (ver jornadas.page.js / scanner.page.js).
  config: 'config',
};

export const DOC_JORNADA_ACTUAL = 'jornada_actual';

export const MAX_BACKUPS = 7; // rotación de copias de seguridad

// --- Números de carnet (renumeración por temporada) --------------------------
// Hay DOS números por socio y no son el mismo:
//
//   · id del documento -> IDENTIDAD INTERNA. La asigna el contador, es
//     monotónica, no se reutiliza JAMÁS y el socio la conserva de por vida.
//     Es la clave con la que se guarda su historial de entradas, así que
//     sobrevive a cualquier renumeración. No se enseña en la UI.
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
