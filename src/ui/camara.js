// ============================================================================
//  src/ui/camara.js  ·  Captura de vídeo y lectura continua de QR.
//
//  QUÉ SE MIRA EN CADA FOTOGRAMA. El coste de jsQR es proporcional a los
//  píxeles que se le pasan, así que no se le puede dar el fotograma entero a
//  resolución nativa: a 1080p cada intento tarda cientos de ms, salen 2-6
//  intentos por segundo y la vista previa se traba. Pero recortar tampoco es
//  gratis, y ahí se falló antes: analizando SOLO el cuadrado central, un QR
//  grande y pegado a la cámara se sale del recorte y no hay manera de leerlo;
//  analizando SOLO el fotograma reducido, un QR pequeño o lejano pierde
//  definición y tampoco entra.
//
//  Por eso se alternan dos miradas, una por fotograma:
//    · COMPLETO — todo el encuadre reducido. Pilla el QR grande, o el que está
//      en una esquina porque el operador no apunta fino.
//    · CENTRAL  — el cuadrado central, que al reducirse menos conserva más
//      detalle. Pilla el QR pequeño o lejano.
//  Cada una cubre el punto ciego de la otra y solo se paga UNA decodificación
//  por fotograma, así que la velocidad no cambia.
//
//  La inversión (QR claro sobre fondo oscuro, típico de una pantalla de móvil
//  en tema oscuro) se prueba en uno de cada `CADA_CUANTOS_INVIERTE` fotogramas.
//  Probar las dos polaridades siempre duplica el coste de todos los fotogramas
//  en los que no hay nada que leer, que son la inmensa mayoría.
//
//  POR QUÉ NO SE USA `BarcodeDetector`. Se intentó (decodifica fuera del hilo
//  principal y acepta el <video> sin pasar por canvas) y dejó el escáner MUDO:
//  hay navegadores que lo exponen pero no lo tienen operativo — en Android
//  depende de un módulo de Google Play Services que puede no estar instalado.
//  En ese caso `detect()` no lanza ninguna excepción, simplemente resuelve
//  vacío en cada fotograma, así que no había forma de detectar el fallo para
//  caer al camino de reserva: cámara abierta, vista previa perfecta y ni una
//  lectura. Un único camino que funciona en todas partes vale más que un
//  camino rápido que a veces no lee, sobre todo con el partido empezando.
//
//  El canvas solo se redimensiona cuando cambia el tamaño de lo que se analiza:
//  asignar `canvas.width` reinicia el búfer y el estado del contexto, así que
//  hacerlo en cada fotograma tiraba por tierra el `willReadFrequently`.
//
//  El bucle es continuo: mientras la cámara está abierta se lee un QR tras
//  otro sin que el operador tenga que cerrar y reabrir nada. Solo para cuando
//  se llama a `pararCamara`.
// ============================================================================

let stream = null;
let rafId = null;
let ultimoTexto = '';
let ultimoTs = 0;
let fotogramas = 0;

// Contexto de la captura en curso, para que `leerFotogramaActual` (el botón
// "Leer ahora") pueda trabajar sobre la misma cámara sin recibirlo todo otra vez.
let captura = null;

/** No se vuelve a avisar del MISMO código hasta que pasa este tiempo. */
const MS_ANTIRREBOTE = 2500;

/** Lado mayor al que se reduce lo que se analiza en cada fotograma. */
const LADO_ANALISIS = 480;

/** Uno de cada cuántos fotogramas se prueba con la imagen invertida. */
const CADA_CUANTOS_INVIERTE = 4;

/** Cada cuánto se informa del ritmo de lectura a la interfaz. */
const MS_DIAGNOSTICO = 1000;

export const camaraActiva = () => stream !== null;

/** Error de arranque que la interfaz sabe explicar tal cual al usuario. */
export class CamaraError extends Error {}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {(texto:string)=>Promise<void>} onLeer
 * @param {(estado:{intentosPorSegundo:number})=>void} [onEstado]
 *   Ritmo real de lectura, una vez por segundo. Sirve para que la pantalla
 *   pueda demostrar que el lector está vivo: sin esto, "no lee" y "no está
 *   mirando" se ven exactamente igual desde fuera.
 */
export async function iniciarCamara(video, canvas, onLeer, onEstado) {
  if (stream) return;

  // jsQR llega por CDN con `defer`. Si el CDN está caído o bloqueado, el bucle
  // se quedaría girando sin leer nunca y sin decir por qué: mejor negarse a
  // abrir la cámara y explicarlo.
  if (typeof jsQR !== 'function') {
    throw new CamaraError(
      'No se ha podido cargar el lector de QR (jsQR). Comprueba la conexión a ' +
        'internet y recarga la página. Mientras tanto puedes validar tecleando ' +
        'el número de carnet a mano.',
    );
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      // Pedir 720p evita que el móvil entregue 1080p/4K, que no aporta nada
      // para leer un QR y multiplica el coste de cada intento.
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  video.srcObject = stream;
  await video.play();

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  captura = { video, canvas, ctx, onLeer };
  fotogramas = 0;

  let intentos = 0;
  let tsDiagnostico = Date.now();

  const tick = async () => {
    rafId = null;
    if (!stream) return;

    // Todo el cuerpo va protegido: si el fichaje falla (red caída, permisos)
    // la excepción se comía el `requestAnimationFrame` de abajo y el bucle
    // moría en silencio — la cámara seguía viéndose y ya no leía nada más.
    try {
      // `HAVE_ENOUGH_DATA` estricto es frágil: hay cámaras que se quedan en
      // `HAVE_CURRENT_DATA` y el fotograma ya es perfectamente decodificable.
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        const n = ++fotogramas;
        const img =
          n % 2 === 0
            ? recorteCentral(ctx, canvas, video, LADO_ANALISIS)
            : fotogramaReducido(ctx, canvas, video, LADO_ANALISIS);
        const invertir = n % CADA_CUANTOS_INVIERTE === 0;
        const texto = decodificar(img, invertir ? 'onlyInvert' : 'dontInvert');
        intentos++;

        // El aviso se espera a propósito: mientras se registra el acceso no
        // tiene sentido seguir quemando CPU decodificando, y así el fichaje
        // (que va a la red) no compite con el decodificador.
        if (texto) await emitir(texto, onLeer);
      }

      if (onEstado && Date.now() - tsDiagnostico >= MS_DIAGNOSTICO) {
        const transcurrido = (Date.now() - tsDiagnostico) / 1000;
        onEstado({ intentosPorSegundo: Math.round(intentos / transcurrido) });
        intentos = 0;
        tsDiagnostico = Date.now();
      }
    } catch (e) {
      console.error('Error leyendo el QR:', e);
    }

    // Puede haberse parado la cámara durante los `await` de arriba.
    if (stream) rafId = requestAnimationFrame(tick);
  };
  tick();
}

export function pararCamara(video) {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  captura = null;
  ultimoTexto = '';
  ultimoTs = 0;
  if (video) video.srcObject = null;
}

/**
 * Intento único "a lo bruto" sobre el fotograma actual: el encuadre completo, a
 * resolución NATIVA y probando las dos polaridades. Es lo que hay detrás del
 * botón "Leer ahora": cuesta bastante más que un intento del bucle, por eso no
 * se hace en continuo, pero rescata los casos que el camino rápido no pilla.
 *
 * Se salta el antirrebote: si el operador lo pide expresamente, se le responde.
 * @returns {Promise<boolean>} true si ha leído algo.
 */
export async function leerFotogramaActual() {
  if (!stream || !captura) return false;
  const { video, canvas, ctx, onLeer } = captura;
  if (video.readyState < video.HAVE_CURRENT_DATA) return false;

  const img = fotogramaCompleto(ctx, canvas, video);
  const texto = decodificar(img, 'attemptBoth');
  if (!texto) return false;

  ultimoTexto = '';
  await emitir(texto, onLeer);
  return true;
}

function decodificar(img, inversionAttempts) {
  if (!img) return '';
  return jsQR(img.data, img.width, img.height, { inversionAttempts })?.data || '';
}

/** Todo el encuadre, reducido a `lado` px de lado mayor. */
function fotogramaReducido(ctx, canvas, video, lado) {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return null;

  const escala = Math.min(1, lado / Math.max(vw, vh));
  const w = Math.round(vw * escala);
  const h = Math.round(vh * escala);
  redimensionar(canvas, w, h);
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Cuadrado central del encuadre, reducido a `lado` px. */
function recorteCentral(ctx, canvas, video, lado) {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return null;

  const origen = Math.min(vw, vh);
  const destino = Math.min(lado, origen);
  redimensionar(canvas, destino, destino);
  ctx.drawImage(
    video,
    (vw - origen) / 2,
    (vh - origen) / 2,
    origen,
    origen,
    0,
    0,
    destino,
    destino,
  );
  return ctx.getImageData(0, 0, destino, destino);
}

/** Fotograma entero a resolución nativa (solo para el intento manual). */
function fotogramaCompleto(ctx, canvas, video) {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return null;

  redimensionar(canvas, vw, vh);
  ctx.drawImage(video, 0, 0, vw, vh);
  return ctx.getImageData(0, 0, vw, vh);
}

function redimensionar(canvas, w, h) {
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

/** Avisa de un código leído, saltándose las repeticiones del mismo QR. */
async function emitir(texto, onLeer) {
  const ahora = Date.now();
  if (texto === ultimoTexto && ahora - ultimoTs < MS_ANTIRREBOTE) return;
  ultimoTexto = texto;
  ultimoTs = ahora;
  await onLeer(texto);
}
