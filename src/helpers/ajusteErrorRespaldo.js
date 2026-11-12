// Ajuste del Respaldo (ecuación de frontera) con el error promedio de los últimos N días del MISMO tipo
// de día — misma fórmula de error que la línea de error del módulo de Pronósticos, pero comparando el dato
// REAL contra el RESPALDO (en vez de real contra pronóstico).
//
//   error % (con signo) de un día y una hora h:  (real[h] − respaldo[h]) / real[h] × 100
//   positivo = el respaldo quedó por debajo del real (sugiere subir); negativo = por encima.
//   respaldo ajustado[h] = respaldo[h] × (1 + error promedio[h] / 100)
//
// Tipo de día (mismo criterio ORDINARIO / SABADO / FESTIVO del resto del sistema): sábado -> SABADO;
// domingo o fecha en `festivos` -> FESTIVO; lo demás -> ORDINARIO. Para cada día objetivo se promedian los
// últimos N días ANTERIORES de su mismo tipo con dato real y respaldo; si no hay ninguno de ese tipo, se cae
// al promedio general de los días anteriores disponibles.

export const DIAS_AJUSTE_ERROR_DEFECTO = 4;
export const DIAS_AJUSTE_ERROR_MAX = 30;
// Cuántos días hacia atrás del primer día objetivo se cargan para buscar candidatos del mismo tipo.
export const VENTANA_HISTORIA_DIAS = 120;

const HORAS = 24;

// Acepta { ajusteError: true|"true", ajusteDias: "4" } (body/query) y devuelve { activo, dias } saneado.
export function normalizarAjusteError({ ajusteError, ajusteDias } = {}) {
  const activo = ajusteError === true || ajusteError === "true" || ajusteError === 1 || ajusteError === "1";
  let dias = parseInt(ajusteDias, 10);
  if (!Number.isFinite(dias)) dias = DIAS_AJUSTE_ERROR_DEFECTO;
  dias = Math.min(DIAS_AJUSTE_ERROR_MAX, Math.max(1, dias));
  return { activo, dias };
}

export const diaSemanaISO = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export function tipoDia(iso, festivos) {
  const dow = diaSemanaISO(iso); // 0 = domingo ... 6 = sábado
  if (dow === 6) return "SABADO";
  if (dow === 0 || festivos.has(iso)) return "FESTIVO";
  return "ORDINARIO";
}

export function restarDiasISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Error % por hora (con signo) de un día. null donde el real es 0 o no existe.
export function errorPctDia(real, respaldo) {
  return Array.from({ length: HORAS }, (_, h) => {
    const ref = Number(real?.[h]);
    const pred = Number(respaldo?.[h]);
    if (!Number.isFinite(ref) || !Number.isFinite(pred) || ref === 0) return null;
    return ((ref - pred) / ref) * 100;
  });
}

function promedioPorHora(listaErrores, respaldoHora) {
  return Array.from({ length: HORAS }, (_, h) => {
    const valores = listaErrores.map((e) => e[h]).filter((v) => v !== null && v !== undefined);
    if (valores.length === 0) return respaldoHora ? respaldoHora[h] : 0;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  });
}

/**
 * @param {Object} p
 * @param {Map<string, number[]>} p.respaldoPorFecha  fecha ISO -> 24 valores del respaldo (ya corregido, en MWh)
 * @param {Map<string, number[]>} p.realPorFecha       fecha ISO -> 24 valores del real (MWh)
 * @param {Set<string>} p.festivos                     fechas ISO festivas del mercado
 * @param {string[]} p.fechasObjetivo                  fechas a las que se les calcula el ajuste
 * @param {number} p.dias                              cuántos días del mismo tipo promediar (N)
 * @returns {Map<string, { errorPct: number[], diasUsados: string[], tipo: string, usoGeneral: boolean, sinReferencia: boolean }>}
 */
export function calcularAjustePorTipoDia({ respaldoPorFecha, realPorFecha, festivos, fechasObjetivo, dias }) {
  const n = Math.max(1, Math.min(DIAS_AJUSTE_ERROR_MAX, Math.floor(dias) || DIAS_AJUSTE_ERROR_DEFECTO));

  // Historia utilizable: días con real Y respaldo. Más reciente primero.
  const historia = [];
  for (const [fecha, real] of realPorFecha) {
    const resp = respaldoPorFecha.get(fecha);
    if (!resp) continue;
    const errorPct = errorPctDia(real, resp);
    if (errorPct.every((v) => v === null)) continue;
    historia.push({ fecha, errorPct, tipo: tipoDia(fecha, festivos) });
  }
  historia.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const resultado = new Map();
  for (const fecha of fechasObjetivo) {
    const previos = historia.filter((d) => d.fecha < fecha);
    const tipoObjetivo = tipoDia(fecha, festivos);
    const mismoTipo = previos.filter((d) => d.tipo === tipoObjetivo).slice(0, n);

    if (mismoTipo.length > 0) {
      resultado.set(fecha, {
        errorPct: promedioPorHora(mismoTipo.map((d) => d.errorPct), promedioPorHora(previos.map((d) => d.errorPct))),
        diasUsados: mismoTipo.map((d) => d.fecha),
        tipo: tipoObjetivo,
        usoGeneral: false,
        sinReferencia: false,
      });
    } else if (previos.length > 0) {
      resultado.set(fecha, {
        errorPct: promedioPorHora(previos.map((d) => d.errorPct)),
        diasUsados: previos.slice(0, n).map((d) => d.fecha),
        tipo: tipoObjetivo,
        usoGeneral: true,
        sinReferencia: false,
      });
    } else {
      resultado.set(fecha, { errorPct: new Array(HORAS).fill(0), diasUsados: [], tipo: tipoObjetivo, usoGeneral: false, sinReferencia: true });
    }
  }
  return resultado;
}

// Aplica el error % por hora a un arreglo de 24 valores.
export const aplicarErrorPct = (valores, errorPct) => valores.map((v, h) => v * (1 + (errorPct[h] ?? 0) / 100));
