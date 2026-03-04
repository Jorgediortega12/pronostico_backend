import Joi from "joi";

export default {
  listarM: Joi.object().keys({
    session: Joi.object().optional(),
  }),
};
