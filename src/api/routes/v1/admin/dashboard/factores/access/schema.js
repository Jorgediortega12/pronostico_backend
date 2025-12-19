import Joi from "joi";

export default {
  guardarBarra: Joi.object({
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  consultarBarrasIndex_xMC: Joi.object().keys({
    mc: Joi.string().required(),
  }),

  actualizarBarra: Joi.object({
    id: Joi.number().optional(),
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  guardarAgrupacion: Joi.object({
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  consultarAgrupacionesIndex_xBarraId: Joi.object().keys({
    barra_id: Joi.number().required(),
  }),

  actualizarAgrupacion: Joi.object({
    id: Joi.number().required(),
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  eliminarBarra: Joi.object({
    id: Joi.number().required(),
  }),
  eliminarAgrupacion: Joi.object({
    id: Joi.number().required(),
  }),
};
