import Joi from "joi";

export default {
  cargar: Joi.object().keys({
    departamento: Joi.string().required(),
  }),
  buscar: Joi.object().keys({
    departamento: Joi.string().required(),
    q: Joi.string().min(1).required(),
  }),
  relacionados: Joi.object().keys({
    departamento: Joi.string().required(),
    circuito: Joi.string().required(),
  }),
};
