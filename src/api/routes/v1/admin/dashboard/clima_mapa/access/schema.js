import Joi from "joi";

export default {
  crearPunto: Joi.object().keys({
    nombre: Joi.string().required(),
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    ucp: Joi.string().required(),
    orden: Joi.number().optional(),
  }),
  actualizarPunto: Joi.object().keys({
    nombre: Joi.string().required(),
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    ucp: Joi.string().required(),
    activo: Joi.boolean().required(),
    orden: Joi.number().optional(),
  }),
};
