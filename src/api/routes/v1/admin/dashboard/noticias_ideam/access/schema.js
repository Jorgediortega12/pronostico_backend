import Joi from "joi";

export default {
  listarNoticias: Joi.object().keys({
    limite: Joi.number().integer().min(1).max(20).optional(),
  }),
};
