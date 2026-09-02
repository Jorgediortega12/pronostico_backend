import Joi from "joi";

export default {
  guardar: Joi.object().keys({
    ucp: Joi.string().required(),
    ciudad_nombre: Joi.string().allow(null, "").optional(),
    accuweather_id: Joi.string().allow(null, "").optional(),
    openweather_id: Joi.string().allow(null, "").optional(),
  }),
  buscar: Joi.object().keys({
    q: Joi.string().min(2).required(),
  }),
  actualizarCatalogo: Joi.object().keys({
    ciudad_nombre: Joi.string().required(),
    accuweather_id: Joi.string().allow(null, "").optional(),
    openweather_id: Joi.string().allow(null, "").optional(),
  }),
};
