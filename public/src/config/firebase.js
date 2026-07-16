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
  apiKey: "AIzaSyD6AbT7wEDOsDJh4ANY9ZBAt1hyI9i065Y",
  authDomain: "internacional-huesca-nacho.firebaseapp.com",
  projectId: "internacional-huesca-nacho",
  storageBucket: "internacional-huesca-nacho.firebasestorage.app",
  messagingSenderId: "422376516762",
  appId: "1:422376516762:web:37c871cb0f9dfe1cd68323",
  measurementId: "G-DJD42BPTKM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
