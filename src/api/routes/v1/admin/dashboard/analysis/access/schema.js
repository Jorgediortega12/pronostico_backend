import Joi from "joi";

export default {
  // ── Demanda ──────────────────────────────────────────────────────────────────
  getDemands: Joi.object({
    tipo: Joi.number().integer().min(0).max(4).required(),
    fecha_inicio: Joi.string().optional().allow(""),
    fecha_fin: Joi.string().optional().allow(""),
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  }),

  // ── Macroeconómicas ──────────────────────────────────────────────────────────
  getAllEconomics: Joi.object({
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  }),

  getEconomicById: Joi.object({
    id: Joi.number().integer().required(),
  }),

  getEconomicYear: Joi.object({
    id: Joi.number().integer().required(),
    fecha_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    fecha_fin: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  }),

  variableVsDemand: Joi.object({
    id: Joi.number().integer().required(),
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  }),

  insertEconomics: Joi.object({
    id: Joi.number().integer().required(),
    años: Joi.array().items(Joi.number().integer()).required(),
    valores: Joi.array().items(Joi.number()).required(),
  }),

  deleteEconomics: Joi.object({
    id: Joi.number().integer().required(),
    años: Joi.array().items(Joi.number().integer()).required(),
  }),

  // ── Clima ────────────────────────────────────────────────────────────────────
  climateByRange: Joi.object({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),

  climateDay: Joi.object({
    id: Joi.number().integer().min(0).max(2).required(),
    tipo: Joi.number().integer().min(0).max(2).required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),

  climateMonth: Joi.object({
    id: Joi.number().integer().min(0).max(2).required(),
    tipo: Joi.number().integer().min(0).max(2).required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),

  climateYear: Joi.object({
    id: Joi.number().integer().min(0).max(2).required(),
    tipo: Joi.number().integer().min(0).max(2).required(),
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  }),

  climateAllTypes: Joi.object({
    id: Joi.number().integer().min(0).max(2).required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),

  climateYearAllTypes: Joi.object({
    id: Joi.number().integer().min(0).max(2).required(),
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  }),

  // ── Correlación ──────────────────────────────────────────────────────────────
  correlation: Joi.object({
    tipo: Joi.number().integer().min(0).max(3).required(),
    list_ids: Joi.array().items(Joi.number().integer()).optional(),
    list_id_macroeconomic: Joi.array().items(Joi.number().integer()).optional(),
    fecha_inicio: Joi.string().optional().allow(""),
    fecha_fin: Joi.string().optional().allow(""),
    año_inicio: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
    año_fin: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  }),

  // ── Grilla / Días ────────────────────────────────────────────────────────────
  gridInfo: Joi.object({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),

  daysTypes: Joi.object({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),
};
