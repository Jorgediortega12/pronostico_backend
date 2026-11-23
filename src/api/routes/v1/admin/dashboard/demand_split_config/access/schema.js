import Joi from "joi";

export default {
  actualizar: Joi.object().keys({
    // YYYY-MM-DD
    fecha_limite: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    // 0 a 100 (%)
    porcentaje: Joi.number().min(0).max(100).required(),
  }),
};
