import Joi from "joi";

export default {
  obtenerEstadoActualizacion: Joi.object({
    ucp: Joi.string().required(),
  }),

  ejecutarActualizacionClima: Joi.object({}),

  ejecutarActualizacionHistorica: Joi.object({
    ucp: Joi.string().required(),
    fechainicio: Joi.string().required(),
    fechafin: Joi.string().required(),
  }),
};
