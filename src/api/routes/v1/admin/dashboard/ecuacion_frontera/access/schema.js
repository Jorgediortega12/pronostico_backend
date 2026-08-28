import Joi from "joi";

export default {
  procesar: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
  calcularRespaldo: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    fechaFin: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),
};
