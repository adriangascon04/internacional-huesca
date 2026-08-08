// ============================================================================
//  src/config/app.config.js
//  TODA la configuración de negocio vive aquí (antes estaba dispersa y
//  duplicada en el HTML/JS). Cambiar precios, temporada o jornadas = editar
//  SOLO este archivo. Ver Upgrades #9 (configuración hardcodeada).
// ============================================================================

// --- Temporada activa (antes en un <option> y en localStorage) -------------
export const TEMPORADA_ACTUAL = localStorage.getItem('hue_temporada') || '2026/27';

// --- Temporadas ------------------------------------------------------------
// Una temporada va de julio a junio: el socio que se apunta en agosto de 2026 y
// el que se apunta en marzo de 2027 están en la MISMA, la 2026/27. Contar por
// año natural partiría cada temporada en dos y diría que un socio de un año
// lleva "dos temporadas".
export const MES_INICIO_TEMPORADA = 6; // julio (0 = enero)

/** Temporada ('2026/27') a la que pertenece una fecha. */
export function temporadaDe(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  const inicio =
    d.getMonth() >= MES_INICIO_TEMPORADA ? d.getFullYear() : d.getFullYear() - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, '0')}`;
}

/** Año en el que empieza una temporada: '2026/27' -> 2026. */
export const anioInicioTemporada = (temporada) =>
  Number(String(temporada || '').slice(0, 4)) || 0;

/**
 * Todas las temporadas desde `desde` hasta `hasta`, ambas incluidas.
 * Es lo que responde a "¿cuántas temporadas lleva con nosotros?": de la de su
 * alta a la de hoy, contando las dos.
 */
export function temporadasEntre(desde, hasta = TEMPORADA_ACTUAL) {
  const a = anioInicioTemporada(desde);
  const b = anioInicioTemporada(hasta);
  if (!a || !b || b < a) return [];
  return Array.from(
    { length: b - a + 1 },
    (_, i) => `${a + i}/${String((a + i + 1) % 100).padStart(2, '0')}`,
  );
}

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
  { id: 'invitacion', nombre: 'Invitación', precio: 0 },
];

// Tipos de entrada que YA NO se venden en taquilla pero que siguen existiendo
// en los datos guardados. Un abonado entra con su QR por la puerta y ya se
// cuenta como asistente ahí: cobrarle además una "entrada de socio" de 0 € en
// taquilla lo contaba DOS veces (una como abonado y otra como entrada vendida).
//
// No basta con quitarlo de la lista de arriba: los partidos ya creados guardan
// sus propias tarifas en Firestore (`precios: {general, menor, socio, ...}`) y
// los tipos vendibles se derivan de esas claves, así que el tipo retirado
// reaparecería en el desplegable de cualquier partido antiguo. Se filtra por
// nombre al construir la lista de venta (ver competiciones.service.js).
//
// Las ventas históricas de estos tipos NO se tocan: conservan su `nombreTipo`
// y siguen apareciendo en las estadísticas tal y como se cobraron.
export const TIPOS_ENTRADA_RETIRADOS = ['socio'];
export const esTipoEntradaRetirado = (id) => TIPOS_ENTRADA_RETIRADOS.includes(id);

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
// Campos de cada tipo:
//   · id        NOMBRE OFICIAL del abono. Es lo que se ve en el desplegable, en
//               la tabla de tarifas, en las listas y en las estadísticas: una
//               sola etiqueta en toda la aplicación. `descripcion` es texto de
//               apoyo, nunca sustituye al nombre.
//   · precio    Tarifa de referencia. Es un valor por DEFECTO, no un precio
//               cerrado: cada alta guarda el importe que realmente se cobró
//               (`importeAbono`) y ese importe se puede editar después.
//   · asiste    false -> sus socios no cuentan para la asistencia. El "Abono
//               Internacional" es de apoyo al club desde fuera: su dinero SÍ
//               entra en la recaudación, pero prácticamente nunca vienen al
//               campo y meterlos en la base del % de asistencia lo hundía sin
//               que eso significara nada.
//   · gratuito  true -> el alta se marca pagada automáticamente.
//   · libre     true -> no hay tarifa: el importe lo decide quien aporta y es
//               obligatorio teclearlo en el alta.
export const TIPOS_ABONO = [
  {
    id: 'Abono Familiar',
    descripcion: 'Pack familiar: 2 adultos + hasta 3 hijos',
    precio: 170,
    asiste: true,
    gratuito: false,
  },
  {
    id: 'Abono General',
    descripcion: 'Abono normal de temporada',
    precio: 95,
    asiste: true,
    gratuito: false,
  },
  {
    id: 'Abono Internacional',
    descripcion: 'Apoyo desde fuera: no cuenta para la asistencia',
    precio: 80,
    asiste: false,
    gratuito: false,
  },
  {
    id: 'Abono Academia',
    descripcion: 'Jugadores de la escuela',
    precio: 0,
    asiste: true,
    gratuito: true,
  },
  { id: 'Abono Jubilado', precio: 75, asiste: true, gratuito: false },
  { id: 'Abono -16 años', precio: 50, asiste: true, gratuito: false },
  {
    id: 'Socio Colaborador',
    descripcion: 'Aportación libre: la cantidad la decide el socio',
    precio: 0,
    asiste: true,
    gratuito: false,
    libre: true,
  },
];

export const tipoAbonoPorId = (tipo) => TIPOS_ABONO.find((t) => t.id === tipo);

/**
 * Etiqueta de un abono. Es su id, siempre y en todas las pantallas: antes el
 * desplegable enseñaba "Abono Familiar" y la tabla de tarifas de al lado
 * "Pack Familiar (2 adultos + hasta 3 hijos)", así que parecían dos cosas.
 */
export const etiquetaAbono = (tipo) => tipo;
/** Texto de apoyo del abono ('' si no tiene). Nunca sustituye a la etiqueta. */
export const descripcionAbono = (tipo) => tipoAbonoPorId(tipo)?.descripcion || '';

export const esGratuito = (tipo) => tipoAbonoPorId(tipo)?.gratuito === true;
export const precioAbonoPorDefecto = (tipo) => tipoAbonoPorId(tipo)?.precio ?? 0;
export const asisteAlCampo = (tipo) => tipoAbonoPorId(tipo)?.asiste !== false;
/** ¿El importe lo pone quien se da de alta (donativo) en vez de la tarifa? */
export const esAportacionLibre = (tipo) => tipoAbonoPorId(tipo)?.libre === true;

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

// --- Listado de socios -------------------------------------------------------
// La tabla de la primera pestaña se pinta entera en el DOM. Con 30 socios de
// pruebas daba igual; con los cientos que tendrá el club en temporada, la
// página crece sin fin, el móvil se arrastra al hacer scroll y encontrar a
// alguien es imposible. Se pagina: el buscador sigue filtrando sobre TODOS los
// socios, no solo sobre la página que se está viendo.
export const SOCIOS_POR_PAGINA = 25;

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
