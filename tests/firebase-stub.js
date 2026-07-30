// ============================================================================
//  tests/firebase-stub.js
//  Sustituto de los módulos de Firebase servidos por CDN (https://...).
//  Node no sabe importar URLs http; el navegador sí. Este stub permite
//  ejecutar los tests de los services sin red y sin proyecto real.
//  Solo cubre lo que la app importa: si añades una función de Firebase nueva,
//  añádela aquí también o el test fallará con "is not a function".
// ============================================================================
const noop = () => {};
const fake =
  (nombre) =>
  (...args) => ({ __firebase: nombre, args });

export const initializeApp = fake('initializeApp');
export const getAuth = fake('getAuth');
export const getFirestore = fake('getFirestore');
export const initializeFirestore = fake('initializeFirestore');
export const signInWithEmailAndPassword = fake('signIn');
export const signOut = fake('signOut');
export const onAuthStateChanged = noop;

export const collection = fake('collection');
export const doc = fake('doc');
export const getDoc = fake('getDoc');
export const getDocs = fake('getDocs');
export const setDoc = fake('setDoc');
export const updateDoc = fake('updateDoc');
export const deleteDoc = fake('deleteDoc');
export const deleteField = fake('deleteField');
export const onSnapshot = noop;
export const query = fake('query');
export const orderBy = fake('orderBy');
export const limit = fake('limit');
export const increment = fake('increment');
export const arrayUnion = fake('arrayUnion');
export const arrayRemove = fake('arrayRemove');
export const runTransaction = fake('runTransaction');
export const serverTimestamp = fake('serverTimestamp');
export const writeBatch = () => ({
  update: noop,
  set: noop,
  delete: noop,
  commit: async () => {},
});
