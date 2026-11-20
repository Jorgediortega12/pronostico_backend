import Joi from "joi";
import {
  PASOS,
  PERFILES,
  UCP_PATTERN,
  MAX_DIAS_REALES,
} from "../../../../../../../services/ajustes.whitelist.js";

// Whitelist estricta (defensa en profundidad antes de EPM): Joi rechaza toda clave no listada
// (por defecto Joi.object().keys() es .unknown(false)) y valida tipo y rango. Los rangos replican
// los de EPM (src/adjustments/steps/*) o son más estrictos; EPM sigue siendo la autoridad final.

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const fechaValida = (valor, helpers) => {
  const [a, m, d] = valor.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d || a < 1990 || a > 2100) {
    return helpers.error("any.invalid");
  }
  return valor;
};

export const fecha = () =>
  Joi.string().pattern(FECHA_RE).custom(fechaValida, "fecha ISO válida").messages({
    "string.pattern.base": "{{#label}} debe ser YYYY-MM-DD",
    "any.invalid": "{{#label}} no es una fecha válida",
  });

const lunes = () =>
  fecha().custom((v, helpers) => {
    const [a, m, d] = v.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d)).getUTCDay() === 1 ? v : helpers.error("any.invalid");
  }, "lunes").messages({ "any.invalid": "{{#label}} debe ser un lunes" });

const ucp = () => Joi.string().pattern(UCP_PATTERN);
const uuid = () => Joi.string().guid();
const numeroOpcional = (min, max) => Joi.number().min(min).max(max).allow(null);
const entero = (min, max) => Joi.number().integer().min(min).max(max);
const enteros = (min, max, maxItems) => Joi.array().items(entero(min, max)).max(maxItems);

// ---------------------------------------------------------------------------
// params por paso (nombres de §2.2–2.6 de PLAN_IMPL + los ya existentes en EPM)
// ---------------------------------------------------------------------------
const mapaAnalogos = Joi.object()
  .pattern(fecha(), Joi.array().items(fecha()).min(1).max(60))
  .max(7);

const filtrosAnalogos = Joi.object({
  dia_semana: Joi.alternatives().try(Joi.valid(null, "auto"), entero(0, 6), enteros(0, 6, 7).min(1)),
  meses: enteros(1, 12, 12).min(1).allow(null),
  temporada_dias: entero(1, 183).allow(null),
  relacion_festivo: Joi.valid(null, "auto", "festivo", "puente", "antes", "despues", "ninguna"),
  distancia_festivo: Joi.alternatives().try(Joi.valid(null, "auto"), entero(1, 7)),
  tipo_festivo: Joi.alternatives().try(Joi.valid(null, "auto"), Joi.string().trim().min(1).max(120)),
  semana_santa: Joi.boolean().allow(null),
  temporada_escolar: Joi.valid(null, "clases", "vacaciones"),
  clima: Joi.object({
    temp_tolerancia: Joi.number().greater(0).max(50).allow(null),
    lluvia: Joi.boolean().allow(null),
    temp_media: numeroOpcional(-50, 60),
  }).allow(null),
  anio_min: entero(1990, 2100).allow(null),
  anio_max: entero(1990, 2100).allow(null),
  anios_excluidos: enteros(1990, 2100, 100).allow(null),
  limite: entero(1, 366).allow(null),
});

const analogosComunes = {
  analogos: mapaAnalogos.allow(null),
  filtros_analogos: filtrosAnalogos.allow(null),
};

export const paramsPorPaso = {
  base: Joi.object({}),
  referencia: Joi.object({
    semana_ref_inicio: fecha().allow(null),
    max_anios_atras: entero(1, 20),
    anios_excluidos: enteros(1990, 2100, 50),
  }),
  nivel: Joi.object({
    alpha: Joi.number().min(0).max(1),
    alpha_por_tipo: Joi.object({
      laboral: Joi.number().min(0).max(1),
      sabado: Joi.number().min(0).max(1),
      domingo: Joi.number().min(0).max(1),
      festivo: Joi.number().min(0).max(1),
    }).allow(null),
    ancla: Joi.valid("actual", "analogos"),
    ...analogosComunes,
    // perfil Jamer (PLAN_IMPL §2.2)
    modo: Joi.valid("alpha", "reciente"),
    peso_modelo: Joi.number().min(0).max(1),
    g_fuente: Joi.valid("interanual", "interanual_corto", "interanual_estacional", "fijo"),
    g_fijo: Joi.number().min(-0.2).max(0.2),
    g_ventana_dias: entero(7, 364).multiple(7),
    g_k: Joi.number().min(0).max(5),
    g_min: Joi.number().min(-0.2).max(0.2),
    g_max: Joi.number().min(-0.2).max(0.2),
    g_min_pares: entero(1, 364),
    saltar_puente: Joi.boolean(),
  }),
  forma: Joi.object({
    fuente: Joi.valid("promedio_n", "reciente", "referencia", "analogos", "reciente_clase"),
    n: entero(1, 60),
    beta: Joi.number().min(0).max(1),
    ...analogosComunes,
    // perfil Jamer (PLAN_IMPL §2.3–2.4)
    delta: Joi.valid("proporcional", "plano"),
    tramos: Joi.valid("off", "modelo_anual"),
    umbral_tramo_mw: Joi.number().min(0).max(10000),
    min_periodos_tramo: entero(1, 24),
    suavizado_borde: entero(0, 12),
    saltar_puente: Joi.boolean(),
  }),
  especiales: Joi.object({
    aplicar: Joi.boolean(),
    alpha: Joi.number().min(0).max(1),
    ancla: Joi.valid("actual", "analogos"),
    ...analogosComunes,
  }),
  control: Joi.object({
    banda_pp: Joi.number().greater(0).max(100),
    top_dias: entero(1, 7),
    banda_referencia_pp: Joi.number().greater(0).max(100).allow(null),
    // alertas del perfil Jamer (PLAN_IMPL §2.6): null/ausente = apagada
    banda_salto_mw: Joi.number().greater(0).max(5000).allow(null),
    periodos_valle: enteros(1, 24, 24).min(1),
    banda_crecimiento_pp: Joi.number().greater(0).max(100).allow(null),
    crecimiento_ventana_dias: entero(7, 730),
    crecimiento_min_pares: entero(1, 730),
    cupo_dias_anuales: entero(0, 366).allow(null),
    banda_error_pct: Joi.number().greater(0).max(100),
  }),
};

const paramsCorrida = Joi.object(
  Object.fromEntries(PASOS.map((p) => [p, paramsPorPaso[p]])),
);

const curvas = Joi.object()
  .pattern(fecha(), Joi.array().items(Joi.number().allow(null)).length(24))
  .min(1)
  .max(40);

// Campos que nunca viajan a EPM: se aceptan en el cuerpo (el front los manda) y se descartan.
const descartados = {
  usuario: Joi.any().strip(),
  aplicar_automatico: Joi.any().strip(), // solo demo
};

const cuerpoRun = {
  ucp: ucp().required(),
  semana_inicio: lunes().required(),
  params: paramsCorrida.allow(null),
  base_curvas: curvas.allow(null),
  base_ref: Joi.string().max(200).allow(null),
  fecha_emision: fecha().allow(null),
  modelo_version: Joi.string().max(200).allow(null),
  perfil: Joi.valid(...PERFILES).allow(null),
  ...descartados,
};

export default {
  ucps: Joi.object({}),
  pronosticoEmitido: Joi.object({ ucp: ucp().required(), semana_inicio: lunes().required() }),
  reales: Joi.object({
    ucp: ucp().required(),
    desde: fecha().required(),
    hasta: fecha().required(),
  }).custom((v, helpers) => {
    const dias = (Date.parse(v.hasta) - Date.parse(v.desde)) / 86_400_000;
    if (dias < 0) return helpers.message("hasta no puede ser anterior a desde");
    if (dias > MAX_DIAS_REALES) return helpers.message(`el rango admite a lo sumo ${MAX_DIAS_REALES} días`);
    return v;
  }),
  preview: Joi.object(cuerpoRun),
  run: Joi.object(cuerpoRun),
  aprobada: Joi.object({ ucp: ucp().required(), semana_inicio: lunes().required() }),
  corridaParams: Joi.object({ id: uuid().required() }),
  versionParams: Joi.object({ id: uuid().required(), version: entero(1, 1_000_000).required() }),
  pasoParams: Joi.object({ id: uuid().required(), paso: Joi.valid(...PASOS).required() }),
  patchPaso: Joi.object({
    estado: Joi.valid("aplicado", "omitido", "editado").required(),
    version_esperada: entero(1, 1_000_000).required(),
    params: Joi.object().allow(null), // se valida contra el paso de la URL en validarPatchPaso
    curvas: curvas.allow(null),
    motivo: Joi.string().max(2000).allow(null, ""),
    ...descartados,
  }),
  aprobar: Joi.object({
    version_esperada: entero(1, 1_000_000).required(),
    motivo: Joi.string().max(2000).allow(null, ""),
    excepciones_justificadas: Joi.array().items(Joi.string().max(80)).max(50).allow(null),
    ...descartados,
  }),
  analogos: Joi.object({
    ucp: ucp().required(),
    fecha: fecha().required(),
    fecha_corte: fecha().allow(null),
    filtros: filtrosAnalogos.allow(null),
  }),
  // EPM: anio obligatorio; banda_pct/cupo/hasta opcionales (apagados por defecto).
  acumuladoAnual: Joi.object({
    ucp: ucp().required(),
    anio: entero(2000, 2100).required(),
    banda_pct: Joi.number().greater(0).max(100),
    cupo: entero(0, 366),
    hasta: fecha(),
  }),
};
