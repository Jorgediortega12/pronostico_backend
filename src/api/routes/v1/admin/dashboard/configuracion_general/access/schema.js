import Joi from "joi";

export default {
  guardarHoraFinDia: Joi.object().keys({
    hora_fin_dia: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
      .required()
      .messages({
        "string.pattern.base": "La hora debe tener el formato HH:MM (24 horas).",
      }),
  }),
};
