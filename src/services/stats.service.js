// ============================================================================
//  src/services/stats.service.js
//  Cálculo de estadísticas (asistencia, tipos, ingresos). Devuelve datos
//  puros; el pintado (tablas/gráfico) lo hace la página de stats.
// ============================================================================
import { getPartidos, getPartidosLabel, asisteAlCampo } from '../config/app.config.js';
import { recaudacion } from './taquilla.service.js';

export function calcularStats({ socios, entradas, taquilla }) {
  const partidos = getPartidos();
  const labels = getPartidosLabel();
  const conAsistencia = socios.filter((s) => asisteAlCampo(s.tipo)); // excluye Internacional
  const idsExcluidos = new Set(
    socios.filter((s) => !asisteAlCampo(s.tipo)).map((s) => s.id),
  );

  const totalSocios = socios.length;
  const pendientesPago = socios.filter((s) => !s.pagado).length;

  const porJornada = partidos.map((p, i) => {
    const e = entradas[p] || {};
    const nSocios = Object.keys(e).filter((id) => !idsExcluidos.has(id)).length;
    const d = taquilla[p] || {};
    const nTaquilla = (d.general || 0) + (d.menor || 0);
    return {
      jornada: p,
      label: labels[i],
      nSocios,
      nTaquilla,
      totalAsistentes: nSocios + nTaquilla,
      recaudacion: recaudacion(d),
    };
  });

  const tipos = {};
  socios.forEach((s) => {
    tipos[s.tipo] = (tipos[s.tipo] || 0) + 1;
  });

  return {
    totalSocios,
    pendientesPago,
    jornadasConDatos: Object.keys(entradas).length,
    porJornada,
    tipos,
    recaudacionTotal: porJornada.reduce((a, j) => a + j.recaudacion, 0),
    baseAsistencia: conAsistencia.length,
  };
}
