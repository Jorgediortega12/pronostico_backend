import Joi from "joi";

const cubrimientoRequest = Joi.object({
  tipo_calculo: Joi.string().valid("bolsa_neta", "venta_bolsa", "compra_bolsa").required(),
  tipo_dato: Joi.string().valid("mensual", "anual").required(),
  tipo_grafica: Joi.string().valid("area", "barras").required(),
  mes_inicial: Joi.number().integer().min(1).max(12).required(),
  mes_final: Joi.number().integer().min(1).max(12).required(),
  anio: Joi.number().integer().required(),
  porcentajes_cubrimiento: Joi.object()
    .pattern(Joi.string(), Joi.array().items(Joi.number()))
    .default({}),
});

export default {
  // ── Body ──────────────────────────────────────────────────────────────────
  procesar: cubrimientoRequest,
  procesarTodos: cubrimientoRequest,

  guardarPorcentaje: Joi.object({
    anio: Joi.number().integer().required(),
    valores: Joi.array().items(Joi.number()).length(12).required(),
  }),

  // ── Query ─────────────────────────────────────────────────────────────────
  pronosticoDemanda: Joi.object({
    model_id: Joi.number().integer().required(),
  }),

  // ── Params ────────────────────────────────────────────────────────────────
  modelosDisponibles: Joi.object({
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
  }),

  procesarParams: Joi.object({
    contrato_id: Joi.number().integer().required(),
    perfil_id: Joi.number().integer().required(),
  }),

  procesarTodosParams: Joi.object({
    anio: Joi.number().integer().required(),
    perfil_id: Joi.number().integer().required(),
  }),

  sicPorAnio: Joi.object({
    anio: Joi.number().integer().required(),
  }),

  detalleContrato: Joi.object({
    sic: Joi.string().required(),
    anio: Joi.number().integer().required(),
    mes_inicial: Joi.number().integer().min(1).max(12).required(),
    mes_final: Joi.number().integer().min(1).max(12).required(),
  }),

  detalleContratoTodos: Joi.object({
    anio: Joi.number().integer().required(),
    mes_inicial: Joi.number().integer().min(1).max(12).required(),
    mes_final: Joi.number().integer().min(1).max(12).required(),
  }),

  energiaContrato: Joi.object({
    sic: Joi.string().required(),
    anio: Joi.number().integer().required(),
    mes_inicial: Joi.number().integer().min(1).max(12).required(),
    mes_final: Joi.number().integer().min(1).max(12).required(),
  }),

  porcentajePorAnio: Joi.object({
    anio: Joi.number().integer().required(),
  }),
};