import Joi from "joi";

export default {
  playPublic: Joi.object().keys({
    ucp: Joi.string().required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().allow("", null),
    force_retrain: Joi.boolean().required(),
    modelo: Joi.boolean().required(),
    data: Joi.array().items(Joi.object()).required(),
  }),
};
