// ============================================================================
//  src/ui/pages/importar.page.js
//  Importación masiva desde Excel (SheetJS por CDN).
//  Mejora clave (Upgrades #7): ahora se VALIDA cada fila antes de escribir y
//  se muestra un informe previo. El original insertaba sin validar.
// ============================================================================
import { $, on } from '../../utils/dom.js';
import { esc } from '../../utils/sanitize.js';
import { validarSocio } from '../../utils/validators.js';
import { TIPOS_ABONO } from '../../config/app.config.js';
import * as socios from '../../services/socios.service.js';

let filasValidas = [];

export function initImportar() {
  on($('#file-excel'), 'change', analizar);
  on($('#btn-importar'), 'click', importar);
}

/** Lee el Excel y separa filas válidas de filas con errores. */
async function analizar(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const msg = $('#import-msg');
  msg.textContent = 'Analizando archivo…';
  filasValidas = [];

  try {
    const buf = await file.arrayBuffer();
    // eslint-disable-next-line no-undef
    const wb = XLSX.read(buf, { type: 'array' });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    // eslint-disable-next-line no-undef
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

    const errores = [];
    const dnisExistentes = new Set(socios.getSocios().map((s) => s.dni));
    const dnisEnArchivo = new Set();

    filas.forEach((f, i) => {
      const datos = normalizar(f);
      const errs = validarSocio(datos);
      if (!TIPOS_ABONO.some((t) => t.id === datos.tipo)) {
        errs.push(`Tipo de abono desconocido: "${datos.tipo}"`);
      }
      if (dnisExistentes.has(datos.dni)) errs.push('DNI ya existe en la base de datos.');
      if (dnisEnArchivo.has(datos.dni)) errs.push('DNI duplicado dentro del archivo.');
      dnisEnArchivo.add(datos.dni);

      if (errs.length) errores.push({ fila: i + 2, errs });
      else filasValidas.push(datos);
    });

    $('#import-informe').innerHTML = `
      <p><strong>${filasValidas.length}</strong> filas listas para importar ·
         <strong>${errores.length}</strong> con errores.</p>
      ${
        errores.length
          ? `<table><thead><tr><th>Fila</th><th>Problemas</th></tr></thead><tbody>${errores
              .map(
                (e2) => `<tr><td>${e2.fila}</td><td>${esc(e2.errs.join(' '))}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : ''
      }`;
    $('#btn-importar').disabled = filasValidas.length === 0;
    msg.textContent = '';
  } catch (err) {
    msg.textContent = 'No se pudo leer el archivo. ¿Es un Excel válido?';
  }
}

/** Mapea las cabeceras del Excel a nuestro modelo. Ajusta aquí si cambian. */
function normalizar(f) {
  const get = (...claves) => {
    for (const k of claves) {
      const encontrada = Object.keys(f).find((c) => c.toLowerCase().trim() === k);
      if (encontrada && String(f[encontrada]).trim()) return String(f[encontrada]).trim();
    }
    return '';
  };
  return {
    nombre: get('nombre'),
    ap1: get('apellido 1', 'apellido1', 'ap1', 'primer apellido'),
    ap2: get('apellido 2', 'apellido2', 'ap2', 'segundo apellido'),
    dni: get('dni', 'dni / nie', 'nie').toUpperCase(),
    fnac: get('fecha nac.', 'fecha nacimiento', 'fnac'),
    tel: get('teléfono', 'telefono', 'tel'),
    email: get('email', 'correo'),
    tipo: get('tipo', 'tipo de abono', 'abono'),
  };
}

async function importar() {
  const msg = $('#import-msg');
  $('#btn-importar').disabled = true;
  let ok = 0;
  let fallos = 0;
  for (const datos of filasValidas) {
    msg.textContent = `Importando ${ok + fallos + 1} de ${filasValidas.length}…`;
    try {
      const res = await socios.altaSocio(datos);
      res.ok ? ok++ : fallos++;
    } catch {
      fallos++;
    }
  }
  msg.textContent = `Importación terminada: ${ok} socios añadidos, ${fallos} fallidos.`;
  filasValidas = [];
  $('#file-excel').value = '';
}
