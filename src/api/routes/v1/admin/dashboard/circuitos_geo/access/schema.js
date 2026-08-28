import Joi from "joi";

export default {
  cargar: Joi.object().keys({
    departamento: Joi.string().required(),
  }),
};
