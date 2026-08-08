import Joi from "joi";

const SORT_COLUMNS = ["fecha", "codigo_rpm", "flujo", "barra"];

export default {
  listar: Joi.object({
    mc: Joi.string().required(),
    barraId: Joi.number().integer().optional().allow(null, ""),
    codigoRpm: Joi.string().optional().allow(null, ""),
    flujo: Joi.string().optional().allow(null, ""),
    fechaInicio: Joi.string().optional().allow(null, ""), // YYYY-MM-DD
    fechaFin: Joi.string().optional().allow(null, ""), // YYYY-MM-DD
    page: Joi.number().integer().optional().allow(null, ""),
    limit: Joi.number().integer().optional().allow(null, ""),
    sortBy: Joi.string()
      .valid(...SORT_COLUMNS)
      .optional()
      .allow(null, ""),
    sortDir: Joi.string()
      .valid("asc", "desc")
      .optional()
      .allow(null, ""),
  }),

  contarSignoNegativo: Joi.object({
    mc: Joi.string().required(),
    fechaInicio: Joi.string().required(), // YYYY-MM-DD
    fechaFin: Joi.string().required(), // YYYY-MM-DD
    barraId: Joi.number().integer().optional().allow(null, ""),
    codigoRpm: Joi.string().optional().allow(null, ""),
    flujo: Joi.string().optional().allow(null, ""),
  }),

  invertirSignoNegativo: Joi.object({
    mc: Joi.string().required(),
    fechaInicio: Joi.string().required(), // YYYY-MM-DD
    fechaFin: Joi.string().required(), // YYYY-MM-DD
    barraId: Joi.number().integer().optional().allow(null, ""),
    codigoRpm: Joi.string().optional().allow(null, ""),
    flujo: Joi.string().optional().allow(null, ""),
  }),
};
