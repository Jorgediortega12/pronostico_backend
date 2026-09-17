import Joi from "joi";

export default {
  procesar: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
  cargar: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    fechaFin: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),
  actualizarEstado: Joi.object().keys({
    codigo: Joi.number().required(),
    estado: Joi.string().required(),
    observacion: Joi.string().allow("").required(),
  }),
  pronosticar: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    nDias: Joi.number().min(1).max(90).required(),
    forceRetrain: Joi.boolean().default(false),
  }),
};
