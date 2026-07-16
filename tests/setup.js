// ============================================================================
//  tests/setup.js  ·  Arranque de los tests.
//   1. Registra el loader que sustituye los imports de Firebase por CDN.
//   2. Stub de localStorage (app.config.js lo lee al importarse).
// ============================================================================
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./loader.js', pathToFileURL('./tests/'));

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
