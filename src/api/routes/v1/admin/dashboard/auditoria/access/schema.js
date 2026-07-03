import Joi from "joi";

export default {
  registrar: Joi.object({
    usuario: Joi.string().max(255).required(),
    modulo: Joi.string().max(100).required(),
    accion: Joi.string().max(100).default("Ingreso"),
    status: Joi.string().max(100).allow(null, "").optional(),
  }),
};
