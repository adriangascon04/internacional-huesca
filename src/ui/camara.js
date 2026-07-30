// ============================================================================
//  src/ui/camara.js  ·  Captura de vídeo y lectura continua de QR.
//
//  RENDIMIENTO — por qué está escrito así. Decodificar un QR cuesta en
//  proporción al número de píxeles del fotograma, y jsQR es JavaScript puro
//  que corre en el hilo principal. Leyendo a resolución nativa (1080p ≈ 2 Mpx)
//  cada intento tarda cientos de ms: salían 2-6 intentos por segundo, el
//  portero apuntaba el carnet y tardaba uno o dos segundos en oír el pitido, y
//  la vista previa se trababa. La reducción del fotograma a `LADO_MAX` antes
//  de decodificar es lo que arregla eso: cuesta del orden de 10x menos y
//  siguen saliendo decenas de intentos por segundo.
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
//  El canvas solo se redimensiona cuando cambia el tamaño del vídeo: asignar
//  `canvas.width` reinicia el búfer y el estado del contexto, así que hacerlo
//  en cada fotograma tiraba por tierra el `willReadFrequently`.
//
//  El bucle es continuo: mientras la cámara está abierta se lee un QR tras
//  otro sin que el operador tenga que cerrar y reabrir nada. Solo para cuando
//  se llama a `pararCamara`.
// ============================================================================

let stream = null;
let rafId = null;
let ultimoTexto = '';
let ultimoTs = 0;

/** No se vuelve a avisar del MISMO código hasta que pasa este tiempo. */
const MS_ANTIRREBOTE = 2500;

// Lado mayor al que se reduce el fotograma antes de decodificar. 640 leía bien
// un carnet de papel a un palmo, pero se quedaba corto con el caso real de las
// pruebas (un QR en la pantalla de un móvil, delante de la webcam de un
// portátil): ahí el código ocupa poca parte del encuadre y al reducir se queda
// sin definición. 800 da margen y sigue costando ~6x menos que 1080p.
const LADO_MAX = 800;

export const camaraActiva = () => stream !== null;

/** Error de arranque que la interfaz sabe explicar tal cual al usuario. */
export class CamaraError extends Error {}

export async function iniciarCamara(video, canvas, onLeer) {
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
        const texto = leerConJsQr(ctx, canvas, video);
        // El aviso se espera a propósito: mientras se registra el acceso no
        // tiene sentido seguir quemando CPU decodificando, y así el fichaje
        // (que va a la red) no compite con el decodificador.
        if (texto) await emitir(texto, onLeer);
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
  ultimoTexto = '';
  ultimoTs = 0;
  if (video) video.srcObject = null;
}

/** Reduce el fotograma y lo decodifica. Devuelve '' si no hay nada que leer. */
function leerConJsQr(ctx, canvas, video) {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh) return '';

  const escala = Math.min(1, LADO_MAX / Math.max(vw, vh));
  const w = Math.round(vw * escala);
  const h = Math.round(vh * escala);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  // `attemptBoth`: un carnet impreso es oscuro sobre claro, pero un QR mostrado
  // en la pantalla de un móvil con el tema oscuro llega invertido y con
  // `dontInvert` no se leía. El coste del segundo intento solo se paga en los
  // fotogramas donde no hay nada que leer.
  return jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' })?.data || '';
}

/** Avisa de un código leído, saltándose las repeticiones del mismo QR. */
async function emitir(texto, onLeer) {
  const ahora = Date.now();
  if (texto === ultimoTexto && ahora - ultimoTs < MS_ANTIRREBOTE) return;
  ultimoTexto = texto;
  ultimoTs = ahora;
  await onLeer(texto);
}
