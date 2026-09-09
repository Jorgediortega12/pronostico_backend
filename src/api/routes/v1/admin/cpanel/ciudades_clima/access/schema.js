import Joi from "joi";

export default {
  actualizar: Joi.object().keys({
    ciudad_nombre: Joi.string().required(),
    accuweather_id: Joi.string().allow(null, "").optional(),
    openweather_id: Joi.string().allow(null, "").optional(),
  }),
};
