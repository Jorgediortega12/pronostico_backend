// Curvas típicas cargadas en Factores de distribución: reglas puras, sin base de datos (ver factoresCurvas.test.js).
//
// Contexto: una barra nueva (o una carga que se traslada a otra barra) no tiene historial de medidas, pero sí su curva típica
// por tipo de día (24 periodos). La curva se guarda aparte y se «materializa» como medidas normales con un código RPM reservado
// (CT-<componente>-D para la barra destino que suma, CT-<componente>-O para la barra de origen a la que se le resta), de modo que
// el resto del módulo (pantalla, cálculo de FDA/FDP, ajustes de FP) la lee igual que a cualquier otra medida.

export const PERIODOS = Object.freeze(Array.from({ length: 24 }, (_, i) => `p${i + 1}`));
export const TIPOS_DIA = Object.freeze(["ORDINARIO", "SABADO", "FESTIVO"]);
export const MAX_VALOR = 1_000_000;

/** Flujos con los que se materializan: activa (P, MW) y reactiva (Q, MVAr), con los mismos nombres que usan las medidas reales. */
export const FLUJO_ACTIVA = "AE";
export const FLUJO_REACTIVA = "R1";

const CODIGO = /^CT-(\d+)-([DO])$/;

/** ¿Es un código RPM reservado de una curva cargada? («CT-12-D», «CT-12-O»). */
export const esCodigoCurva = (codigo) => CODIGO.test(String(codigo ?? ""));

/** Código de la medida que SUMA a la barra destino. */
export const codigoDestino = (componenteId) => `CT-${Number(componenteId)}-D`;
/** Código de la medida que RESTA a la barra de origen. */
export const codigoOrigen = (componenteId) => `CT-${Number(componenteId)}-O`;

/** De «CT-12-O» -> { componenteId: 12, lado: "O" }; null si no es un código de curva cargada. */
export const leerCodigoCurva = (codigo) => {
  const m = CODIGO.exec(String(codigo ?? ""));
  return m ? { componenteId: Number(m[1]), lado: m[2] } : null;
};

export const redondear = (v, decimales = 5) => {
  const f = 10 ** decimales;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** Acepta un número o un texto numérico con coma o punto decimal («7,363» o «7.363»). NaN si no se puede leer. */
export const leerNumero = (x) => {
  if (typeof x === "number") return x;
  if (typeof x !== "string") return NaN;
  const t = x.trim().replace(/\s/g, "");
  if (t === "") return NaN;
  return Number(t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t);
};

/** 24 números finitos, no negativos y razonables. Devuelve { valores } (redondeados) o { error } con el motivo. */
export const validarPeriodos = (lista, etiqueta = "La curva") => {
  if (!Array.isArray(lista) || lista.length !== 24) return { error: `${etiqueta} debe tener exactamente 24 periodos.` };
  const valores = [];
  for (let i = 0; i < 24; i++) {
    const v = leerNumero(lista[i]);
    if (!Number.isFinite(v)) return { error: `${etiqueta}: el periodo ${i + 1} no es un número.` };
    if (v < 0) return { error: `${etiqueta}: el periodo ${i + 1} es negativo (las curvas se cargan en positivo).` };
    if (v > MAX_VALOR) return { error: `${etiqueta}: el periodo ${i + 1} es demasiado grande.` };
    valores.push(redondear(v));
  }
  return { valores };
};

/** Suma periodo a periodo de varias curvas de 24 valores. */
export const sumarPeriodos = (curvas) => {
  const salida = Array(24).fill(0);
  for (const c of curvas) for (let i = 0; i < 24; i++) salida[i] += Number(c[i]) || 0;
  return salida.map((v) => redondear(v));
};

/** Factor de potencia de cada periodo a partir de P y Q: P / raíz(P² + Q²). Sin potencia (P=Q=0) se toma 1. */
export const fpDePQ = (p, q) => p.map((pv, i) => {
  const qv = Number(q[i]) || 0;
  const n = Math.hypot(Number(pv) || 0, qv);
  return n === 0 ? 1 : redondear((Number(pv) || 0) / n);
});

/** De potencia aparente (MVA) y factor de potencia a activa (MW) y reactiva (MVAr). fp: 24 valores en (0, 1]. */
export const convertirAPQ = (s, fp) => {
  const p = [];
  const q = [];
  for (let i = 0; i < 24; i++) {
    const f = Math.min(1, Math.max(0, Number(fp[i])));
    p.push(redondear(s[i] * f));
    q.push(redondear(s[i] * Math.sqrt(Math.max(0, 1 - f * f))));
  }
  return { p, q };
};

/** De activa (MW) y factor de potencia a reactiva (MVAr): Q = P · raíz(1 − fp²) / fp. */
export const reactivaDeActivaYFp = (p, fp) => p.map((pv, i) => {
  const f = Math.min(1, Math.max(1e-9, Number(fp[i])));
  return redondear((Number(pv) * Math.sqrt(Math.max(0, 1 - f * f))) / f);
});

export const MODOS_FP = Object.freeze(["FIJO", "PERIODO", "BARRA"]);

/**
 * Factor de potencia por periodo según cómo lo indicó la persona.
 *   FIJO: un solo valor para los 24 periodos. PERIODO: 24 valores. BARRA: el que sale del historial de una barra de referencia
 *   (lo calcula el servicio y llega en `historia`, 24 valores).
 * Devuelve { fp: [24] } o { error }.
 */
export const resolverFp = ({ modo, valor, periodos, historia }, etiqueta = "El factor de potencia") => {
  const valido = (v) => Number.isFinite(v) && v > 0 && v <= 1;
  if (modo === "FIJO") {
    const v = leerNumero(valor);
    if (!valido(v)) return { error: `${etiqueta} debe ser un número mayor que 0 y hasta 1.` };
    return { fp: Array(24).fill(redondear(v)) };
  }
  const lista = modo === "PERIODO" ? periodos : modo === "BARRA" ? historia : null;
  if (lista === null) return { error: `${etiqueta}: el modo «${modo}» no es válido.` };
  if (!Array.isArray(lista) || lista.length !== 24) return { error: `${etiqueta} necesita 24 valores (uno por periodo).` };
  const fp = lista.map(leerNumero);
  const mala = fp.findIndex((v) => !valido(v));
  if (mala >= 0) return { error: `${etiqueta}: el periodo ${mala + 1} debe estar entre 0 y 1.` };
  return { fp: fp.map((v) => redondear(v)) };
};

const aFechaIso = (f) => (f instanceof Date ? f.toISOString().slice(0, 10) : String(f).slice(0, 10));

/**
 * Tipo de día de una fecha, con la MISMA regla que usan las consultas de medidas del módulo (Node y Python):
 *   FESTIVO: festivo del mercado o domingo. SABADO: sábado. ORDINARIO: lunes a viernes que no es festivo.
 * Un sábado festivo cuenta como FESTIVO (una fecha solo puede llevar una curva).
 * festivos: Set de fechas «AAAA-MM-DD» del mercado.
 */
export const tipoDeDia = (fecha, festivos = new Set()) => {
  const iso = aFechaIso(fecha);
  const [a, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 domingo … 6 sábado, sin depender de la zona horaria
  if (festivos.has(iso) || dow === 0) return "FESTIVO";
  if (dow === 6) return "SABADO";
  return "ORDINARIO";
};

/** Quita la porción trasladada a una barra de origen, sin dejar negativos por redondeo. Útil para comprobar el neto. */
export const restarPeriodos = (base, resta) => base.map((v, i) => redondear(Number(v) - Number(resta[i])));
