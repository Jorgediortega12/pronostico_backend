import Joi from "joi";

export default {
  crearCircuito: Joi.object().keys({
    ucp: Joi.string().required(),
    circuito: Joi.string().optional().allow(null, ""),
    codigo_rpm: Joi.string().optional().allow(null, ""),
  }),

  actualizarCircuito: Joi.object().keys({
    id: Joi.number().integer().required(),
    ucp: Joi.string().required(),
    circuito: Joi.string().optional().allow(null, ""),
    codigo_rpm: Joi.string().optional().allow(null, ""),
  }),

  eliminarCircuito: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),

  obtenerCircuitosPorUCP: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
};
