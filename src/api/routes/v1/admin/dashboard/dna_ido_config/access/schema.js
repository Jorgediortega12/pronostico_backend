import Joi from "joi";

export default {
  crearEmpresa: Joi.object().keys({
    nombre: Joi.string().required(),
  }),

  eliminarEmpresa: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),

  crear: Joi.object().keys({
    mc: Joi.string().required(),
    empresa_id: Joi.number().integer().required(),
    municipios: Joi.array().items(Joi.string()).default([]),
  }),

  actualizar: Joi.object().keys({
    id: Joi.number().integer().required(),
    mc: Joi.string().required(),
    empresa_id: Joi.number().integer().required(),
    municipios: Joi.array().items(Joi.string()).default([]),
  }),

  eliminar: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),

  obtenerPorMC: Joi.object().keys({
    mc: Joi.string().required(),
  }),
};
