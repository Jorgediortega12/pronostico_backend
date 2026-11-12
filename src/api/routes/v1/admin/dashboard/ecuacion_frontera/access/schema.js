import Joi from "joi";

export default {
  procesar: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
  guardarEcuacion: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
  guardarRespaldo: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .allow(null, ""),
    fechaFin: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .allow(null, ""),
    // Ajuste con el error promedio (real vs respaldo) de los últimos N días del mismo tipo de día.
    ajusteError: Joi.boolean().optional(),
    ajusteDias: Joi.number().integer().min(1).max(30).optional(),
  }),
  calcularRespaldo: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    ajusteError: Joi.boolean().optional(),
    ajusteDias: Joi.number().integer().min(1).max(30).optional(),
  }),
};
