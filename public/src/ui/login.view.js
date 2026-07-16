// ============================================================================
//  src/ui/login.view.js  ·  Pantalla de login.
// ============================================================================
import { login } from '../core/auth.js';
import { $, on } from '../utils/dom.js';

export function initLogin() {
  const form = $('#login-form');
  const msg = $('#login-msg');
  on(form, 'submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const btn = $('#login-btn');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    try {
      await login($('#l-email').value.trim(), $('#l-pass').value);
      // onAuthStateChanged se encarga del resto.
    } catch (err) {
      msg.textContent = 'Correo o contraseña incorrectos.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

export function mostrarLogin(mostrar) {
  $('#login-screen').style.display = mostrar ? 'flex' : 'none';
  $('#app-screen').style.display = mostrar ? 'none' : 'block';
}
