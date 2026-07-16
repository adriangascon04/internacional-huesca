// ============================================================================
//  src/utils/dom.js  ·  Pequeños ayudantes de DOM.
// ============================================================================
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
export const on = (el, evt, fn) => el && el.addEventListener(evt, fn);
