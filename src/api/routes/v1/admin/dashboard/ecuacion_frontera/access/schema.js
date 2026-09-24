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
  }),
  calcularRespaldo: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),
};
