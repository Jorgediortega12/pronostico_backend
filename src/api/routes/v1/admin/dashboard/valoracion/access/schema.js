import Joi from "joi";

export default {
  // ── Body ──────────────────────────────────────────────────────────────────
  crearEscenario: Joi.object({
    nombre: Joi.string().trim().min(1).required(),
    oferta_id: Joi.number().integer().required(),
    usuario_id: Joi.number().integer().optional(),
    ipp_base: Joi.number().min(0.8).max(1.5).default(1.0),
  }),

  ejecutarOptimizacion: Joi.object({
    escenario_id: Joi.number().integer().required(),
    tipo_optimizacion: Joi.string().valid("simple", "multiobjetivo", "completa").default("completa"),
  }),

  comparar: Joi.object({
    escenario_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  }),

  actualizarIpp: Joi.object({
    escenario_id: Joi.number().integer().required(),
    nuevo_ipp: Joi.number().min(0.8).max(1.5).required(),
  }),

  configuracionIpp: Joi.object({
    fecha_vigencia: Joi.date().required(),
    valor_ipp: Joi.number().required(),
    descripcion: Joi.string().allow("", null),
    usuario_id: Joi.number().integer().optional(),
  }),

  exportar: Joi.object({
    escenario_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  }),

  // ── Query ─────────────────────────────────────────────────────────────────
  listarOfertas: Joi.object({
    activas: Joi.boolean().default(true),
  }),

  listarEscenarios: Joi.object({
    oferta_id: Joi.number().integer().optional(),
  }),

  graficaPareto: Joi.object({
    escenario_ids: Joi.string().required(),
  }),

  // ── Params ────────────────────────────────────────────────────────────────
  ofertaId: Joi.object({
    oferta_id: Joi.number().integer().required(),
  }),

  escenarioId: Joi.object({
    escenario_id: Joi.number().integer().required(),
  }),

  resultadoId: Joi.object({
    resultado_id: Joi.number().integer().required(),
  }),
};