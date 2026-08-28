import Joi from "joi";

export default {
  procesar: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
};
