// ============================================================================
//  src/config/firebase.js
//  Punto único de inicialización de Firebase (SDK modular v10).
//  Ningún otro archivo debe llamar a initializeApp: importan `auth` y `db`.
// ============================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ⚠️ Reemplaza estos valores con los de tu proyecto (Firebase Console → Config).
// La apiKey de una app web NO es un secreto: la seguridad real vive en
// firestore.rules. Aun así, para no exponer la lógica se recomienda repo privado.
export const firebaseConfig = {
  apiKey: 'REEMPLAZA_CON_TU_API_KEY',
  authDomain: 'internacional-huesca-nacho.firebaseapp.com',
  projectId: 'internacional-huesca-nacho',
  storageBucket: 'internacional-huesca-nacho.firebasestorage.app',
  messagingSenderId: 'REEMPLAZA',
  appId: 'REEMPLAZA',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
