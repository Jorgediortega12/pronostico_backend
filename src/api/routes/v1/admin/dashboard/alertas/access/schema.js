import Joi from "joi";

export default {
  // ── Body ──────────────────────────────────────────────────────────────────
  actualizarConfig: Joi.object({
    umbral: Joi.number().min(0).required(),
    ventana_dias: Joi.number().integer().min(1).allow(null).optional(),
    activo: Joi.boolean().default(true),
    canal_push: Joi.boolean().default(true),
    canal_correo: Joi.boolean().default(false),
    canal_sms: Joi.boolean().default(false),
    destinatarios: Joi.array().items(Joi.string()).default([]),
  }),

  // ── Params ────────────────────────────────────────────────────────────────
  codigoParam: Joi.object({
    codigo: Joi.number().integer().required(),
  }),

  categoriaParam: Joi.object({
    categoria: Joi.string().valid("mape", "demanda", "periodo", "evento", "clima", "modelo", "medida").required(),
  }),

  // ── Query ─────────────────────────────────────────────────────────────────
  listarAlertas: Joi.object({
    categoria: Joi.string().valid("todas", "mape", "demanda", "periodo", "evento", "clima", "modelo", "medida").optional(),
    ucp: Joi.string().optional(),
    fecha_inicio: Joi.string().optional(),
    fecha_fin: Joi.string().optional(),
    estado: Joi.string().valid("critico", "por_revisar", "revisado").optional(),
  }),
};
