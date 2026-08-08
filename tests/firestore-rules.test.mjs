// ============================================================================
//  tests/firestore-rules.test.mjs
//  Comprueba firestore.rules ejecutándolas de verdad contra el emulador de
//  Firestore. No es lectura de código: cada caso hace la escritura real con el
//  rol que toca y mira si el servidor la deja pasar o la rechaza.
//
//  CÓMO SE EJECUTA:  npm run test:reglas     (necesita Java instalado)
//
//  Va aparte de `npm test` a propósito, y con extensión .mjs para quedar fuera
//  de su glob `tests/*.test.js`: el resto de tests corre sin instalar nada ni
//  descargar nada, y esa propiedad no se pierde por añadir este.
//
//  OJO con lo que esto prueba y lo que NO: prueba el FICHERO del repositorio.
//  Las reglas no se despliegan solas — hay que pegarlas en la consola de
//  Firebase —, así que que lo publicado sea idéntico a esto hay que mirarlo a
//  mano. Ver DESARROLLO.md.
// ============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

const REGLAS = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const CORREOS = {
  admin: 'admin@club.es',
  taquillero: 'taquilla@club.es',
  control: 'puerta@club.es',
  lector: 'lector@club.es',
};

let entorno;

const como = (quien) =>
  entorno
    .authenticatedContext(quien, { email: CORREOS[quien], email_verified: true })
    .firestore();
const sinLogin = () => entorno.unauthenticatedContext().firestore();

/** Escribe saltándose las reglas, para preparar el escenario de cada caso. */
const sembrar = (fn) => entorno.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

test.before(async () => {
  // El id de proyecto y el puerto tienen que cuadrar con package.json y
  // firebase.json: si no cuadran, la suite se queda esperando a un emulador
  // que no existe en vez de decir que no lo encuentra.
  entorno = await initializeTestEnvironment({
    projectId: 'internacional-huesca-reglas',
    firestore: { rules: REGLAS, host: '127.0.0.1', port: 8085 },
  });
});
test.after(async () => {
  await entorno?.cleanup();
});

test.beforeEach(async () => {
  await entorno.clearFirestore();
  await sembrar(async (db) => {
    await setDoc(doc(db, 'usuarios/admin'), { rol: 'admin' });
    await setDoc(doc(db, 'usuarios/taquillero'), { rol: 'taquillero' });
    await setDoc(doc(db, 'usuarios/control'), { rol: 'control_acceso' });
    await setDoc(doc(db, 'usuarios/lector'), { rol: 'lector' });
  });
});

// --- El cambio que se acaba de publicar --------------------------------------

test('socios: admin PUEDE borrar un socio (el cambio recién publicado)', async () => {
  await sembrar((db) => setDoc(doc(db, 'socios/1'), { nombre: 'Ana', activo: true }));
  await assertSucceeds(deleteDoc(doc(como('admin'), 'socios/1')));
});

test('socios: nadie más puede borrarlos', async () => {
  await sembrar((db) => setDoc(doc(db, 'socios/1'), { nombre: 'Ana', activo: true }));
  for (const quien of ['taquillero', 'control', 'lector']) {
    await assertFails(deleteDoc(doc(como(quien), 'socios/1')));
  }
  await assertFails(deleteDoc(doc(sinLogin(), 'socios/1')));
});

test('socios: el borrado masivo en lote también pasa (borrón y cuenta nueva)', async () => {
  await sembrar(async (db) => {
    for (let i = 1; i <= 5; i++)
      await setDoc(doc(db, `socios/${i}`), { nombre: 'X', activo: true });
  });
  const db = como('admin');
  const lote = writeBatch(db);
  for (let i = 1; i <= 5; i++) lote.delete(doc(db, `socios/${i}`));
  await assertSucceeds(lote.commit());
});

test('socios: un lote MIXTO con un no-admin dentro no cuela por ser lote', async () => {
  await sembrar((db) => setDoc(doc(db, 'socios/1'), { nombre: 'X', activo: true }));
  const db = como('taquillero');
  const lote = writeBatch(db);
  lote.delete(doc(db, 'socios/1'));
  await assertFails(lote.commit());
});

// --- Alta y edición de socios -------------------------------------------------

test('socios: admin da de alta con los campos que exige la regla', async () => {
  await assertSucceeds(
    setDoc(doc(como('admin'), 'socios/7'), {
      nombre: 'Ana',
      activo: true,
      numerico: 7,
      carnet: 7,
      creadoPor: CORREOS.admin,
    }),
  );
});

test('socios: no se puede firmar un alta con el correo de otro', async () => {
  await assertFails(
    setDoc(doc(como('admin'), 'socios/7'), {
      nombre: 'Ana',
      activo: true,
      numerico: 7,
      carnet: 7,
      creadoPor: 'otro@club.es',
    }),
  );
});

test('socios: admin puede cambiar el importe del abono y el método de pago', async () => {
  // Es lo que se acaba de añadir a la ficha del socio.
  await sembrar((db) =>
    setDoc(doc(db, 'socios/1'), {
      nombre: 'Ana',
      activo: true,
      numerico: 1,
      carnet: 1,
      importeAbono: 95,
      creadoPor: CORREOS.admin,
    }),
  );
  await assertSucceeds(
    updateDoc(doc(como('admin'), 'socios/1'), {
      importeAbono: 250,
      metodoPago: 'Bizum',
      modificadoPor: CORREOS.admin,
      modificadoEn: new Date().toISOString(),
    }),
  );
});

test('socios: el importe no se puede tocar sin ser admin', async () => {
  await sembrar((db) =>
    setDoc(doc(db, 'socios/1'), { nombre: 'Ana', activo: true, importeAbono: 95 }),
  );
  await assertFails(
    updateDoc(doc(como('taquillero'), 'socios/1'), {
      importeAbono: 0,
      modificadoPor: CORREOS.taquillero,
    }),
  );
});

test('socios: siguen protegidos los campos de auditoría e identidad', async () => {
  await sembrar((db) =>
    setDoc(doc(db, 'socios/1'), {
      nombre: 'Ana',
      activo: true,
      numerico: 1,
      carnet: 1,
      alta: '2026-08-01T10:00:00Z',
      creadoPor: CORREOS.admin,
    }),
  );
  const db = como('admin');
  await assertFails(
    updateDoc(doc(db, 'socios/1'), { numerico: 999, modificadoPor: CORREOS.admin }),
  );
  await assertFails(
    updateDoc(doc(db, 'socios/1'), { alta: '2020-01-01', modificadoPor: CORREOS.admin }),
  );
  // El carnet SÍ es mutable: se compacta al renumerar la temporada.
  await assertSucceeds(
    updateDoc(doc(db, 'socios/1'), { carnet: 3, modificadoPor: CORREOS.admin }),
  );
});

test('socios: renumerar en lote (carnet + token nuevos) pasa', async () => {
  await sembrar(async (db) => {
    for (let i = 1; i <= 3; i++)
      await setDoc(doc(db, `socios/${i}`), {
        nombre: 'X',
        activo: true,
        numerico: i,
        carnet: i * 2,
      });
  });
  const db = como('admin');
  const lote = writeBatch(db);
  for (let i = 1; i <= 3; i++)
    lote.update(doc(db, `socios/${i}`), {
      carnet: i,
      tokenQR: 'NUEVO' + i,
      modificadoPor: CORREOS.admin,
      modificadoEn: new Date().toISOString(),
    });
  await assertSucceeds(lote.commit());
});

// --- Taquilla: vender y anular ------------------------------------------------

const venta = (id, tipo = 'general') => ({
  id,
  tipo,
  nombreTipo: 'Entrada general',
  precio: 10,
  metodoPago: 'Efectivo',
  hora: new Date().toISOString(),
  vendidoPor: CORREOS.taquillero,
});

test('taquilla: el taquillero crea el documento vacío y vende', async () => {
  const db = como('taquillero');
  await assertSucceeds(
    setDoc(doc(db, 'taquilla/j1'), { general: 0, menor: 0, historial: [] }, { merge: true }),
  );
  await assertSucceeds(
    updateDoc(doc(db, 'taquilla/j1'), {
      general: increment(1),
      historial: arrayUnion(venta('v1')),
    }),
  );
});

test('taquilla: el taquillero puede ANULAR una venta suelta', async () => {
  // La función nueva: quitar del historial una venta que no es la última.
  const v1 = venta('v1');
  const v2 = venta('v2');
  const v3 = venta('v3');
  await sembrar((db) =>
    setDoc(doc(db, 'taquilla/j1'), { general: 3, menor: 0, historial: [v1, v2, v3] }),
  );
  await assertSucceeds(
    updateDoc(doc(como('taquillero'), 'taquilla/j1'), {
      general: increment(-1),
      historial: arrayRemove(v2),
    }),
  );
  // Y se ha ido la del medio, no otra: arrayRemove compara por valor exacto y
  // sin el id propio de cada venta dos ventas iguales se borrarían las dos.
  let historial;
  await sembrar(async (db) => {
    historial = (await getDoc(doc(db, 'taquilla/j1'))).data().historial;
  });
  assert.deepEqual(
    historial.map((v) => v.id),
    ['v1', 'v3'],
  );
});

test('taquilla: no se pueden colar varias ventas de golpe', async () => {
  await sembrar((db) =>
    setDoc(doc(db, 'taquilla/j1'), { general: 0, menor: 0, historial: [] }),
  );
  await assertFails(
    updateDoc(doc(como('taquillero'), 'taquilla/j1'), {
      general: increment(3),
      historial: arrayUnion(venta('a'), venta('b'), venta('c')),
    }),
  );
});

test('taquilla: con la jornada cerrada no se vende ni se anula', async () => {
  const v1 = venta('v1');
  await sembrar(async (db) => {
    await setDoc(doc(db, 'taquilla/j1'), { general: 1, menor: 0, historial: [v1] });
    await setDoc(doc(db, 'jornadas_bloqueadas/j1'), {
      bloqueada: true,
      bloqueadaPor: CORREOS.admin,
    });
  });
  const db = como('taquillero');
  await assertFails(
    updateDoc(doc(db, 'taquilla/j1'), {
      general: increment(1),
      historial: arrayUnion(venta('v2')),
    }),
  );
  await assertFails(
    updateDoc(doc(db, 'taquilla/j1'), {
      general: increment(-1),
      historial: arrayRemove(v1),
    }),
  );
});

test('taquilla: el portero no vende', async () => {
  await assertFails(
    setDoc(doc(como('control'), 'taquilla/j1'), { general: 0, menor: 0, historial: [] }),
  );
});

// --- Puerta: fichar y corregir ------------------------------------------------

test('entradas: el portero ficha, y solo puede AÑADIR', async () => {
  const db = como('control');
  await assertSucceeds(setDoc(doc(db, 'entradas/j1'), { 1: 'hora' }, { merge: true }));
  await assertSucceeds(updateDoc(doc(db, 'entradas/j1'), { 2: 'hora' }));
  // Borrar un fichaje es cosa de admin: corregir un error no es fichar.
  await assertFails(updateDoc(doc(db, 'entradas/j1'), { 1: deleteField() }));
});

test('entradas: admin SÍ borra un fichaje puesto por error', async () => {
  await sembrar((db) => setDoc(doc(db, 'entradas/j1'), { 1: 'hora', 2: 'hora' }));
  await assertSucceeds(updateDoc(doc(como('admin'), 'entradas/j1'), { 1: deleteField() }));
});

test('entradas: con la jornada cerrada no se ficha', async () => {
  await sembrar(async (db) => {
    await setDoc(doc(db, 'entradas/j1'), { 1: 'hora' });
    await setDoc(doc(db, 'jornadas_bloqueadas/j1'), {
      bloqueada: true,
      bloqueadaPor: CORREOS.admin,
    });
  });
  await assertFails(updateDoc(doc(como('control'), 'entradas/j1'), { 2: 'hora' }));
});

// --- Reinicio de datos --------------------------------------------------------

test('reinicio: admin borra jornadas de entradas, taquilla y bloqueos', async () => {
  await sembrar(async (db) => {
    await setDoc(doc(db, 'entradas/j1'), { 1: 'hora' });
    await setDoc(doc(db, 'taquilla/j1'), { general: 1, menor: 0, historial: [venta('v')] });
    await setDoc(doc(db, 'jornadas_bloqueadas/j1'), {
      bloqueada: true,
      bloqueadaPor: CORREOS.admin,
    });
  });
  const db = como('admin');
  // Ojo: se borran incluso con la jornada CERRADA. Es lo que tiene que pasar,
  // porque el reinicio es justo para dejarlo todo a cero.
  await assertSucceeds(deleteDoc(doc(db, 'entradas/j1')));
  await assertSucceeds(deleteDoc(doc(db, 'taquilla/j1')));
  await assertSucceeds(deleteDoc(doc(db, 'jornadas_bloqueadas/j1')));
});

test('reinicio: un no-admin no puede borrar jornadas enteras', async () => {
  await sembrar(async (db) => {
    await setDoc(doc(db, 'entradas/j1'), { 1: 'hora' });
    await setDoc(doc(db, 'taquilla/j1'), { general: 0, menor: 0, historial: [] });
  });
  await assertFails(deleteDoc(doc(como('control'), 'entradas/j1')));
  await assertFails(deleteDoc(doc(como('taquillero'), 'taquilla/j1')));
});

// --- Copias de seguridad ------------------------------------------------------

test('backups: solo admin, y firmados con su propio correo', async () => {
  await assertSucceeds(
    setDoc(doc(como('admin'), 'backups/b1'), {
      fecha: new Date().toISOString(),
      nSocios: 3,
      nJornadas: 1,
      contenido: '{}',
      creadoPor: CORREOS.admin,
    }),
  );
  await assertFails(
    setDoc(doc(como('taquillero'), 'backups/b2'), {
      fecha: 'x',
      contenido: '{}',
      creadoPor: CORREOS.taquillero,
    }),
  );
  // Contienen datos personales de todos los socios: nadie más los lee.
  await assertFails(getDoc(doc(como('lector'), 'backups/b1')));
  await assertSucceeds(getDoc(doc(como('admin'), 'backups/b1')));
});

// --- Contador de números de socio ---------------------------------------------

test('contadores: el nº de socio solo puede subir, ni con borrón y cuenta nueva', async () => {
  // Es lo que impide que un carnet viejo abra la puerta de un socio nuevo.
  await sembrar((db) => setDoc(doc(db, 'contadores/socios'), { ultimo: 50 }));
  const db = como('admin');
  await assertSucceeds(updateDoc(doc(db, 'contadores/socios'), { ultimo: 51 }));
  await assertFails(updateDoc(doc(db, 'contadores/socios'), { ultimo: 1 }));
  await assertFails(deleteDoc(doc(db, 'contadores/socios')));
});

// --- Roles y puerta de entrada -------------------------------------------------

test('sin sesión no se lee absolutamente nada', async () => {
  await sembrar((db) => setDoc(doc(db, 'socios/1'), { nombre: 'Ana', activo: true }));
  const db = sinLogin();
  await assertFails(getDoc(doc(db, 'socios/1')));
  await assertFails(getDoc(doc(db, 'competiciones/c1')));
});

test('nadie puede ascenderse a admin', async () => {
  await assertFails(
    setDoc(doc(como('lector'), 'usuarios/lector'), { rol: 'admin' }),
  );
});

test('competiciones y precios: solo admin escribe', async () => {
  await assertSucceeds(
    setDoc(doc(como('admin'), 'competiciones/c1'), { nombre: 'Liga', partidos: [] }),
  );
  await assertFails(
    setDoc(doc(como('taquillero'), 'competiciones/c1'), { nombre: 'Trampa' }),
  );
});

test('jornada actual: el portero la lee, solo admin la fija', async () => {
  await assertSucceeds(
    setDoc(doc(como('admin'), 'config/jornada_actual'), {
      jornada: 'j1',
      actualizadoPor: CORREOS.admin,
    }),
  );
  await assertSucceeds(getDoc(doc(como('control'), 'config/jornada_actual')));
  await assertFails(
    setDoc(doc(como('control'), 'config/jornada_actual'), {
      jornada: 'j9',
      actualizadoPor: CORREOS.control,
    }),
  );
});
