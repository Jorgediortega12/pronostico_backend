// schemas/epm.schema.js
import Joi from "joi";

export const guardarConfigEpm = Joi.object({
  tenant_id: Joi.string().allow("").required(),
  client_id: Joi.string().allow("").required(),
  client_secret: Joi.string().allow("").required(),
  scope: Joi.string().allow("").required(),
  login_url: Joi.string().allow("").required(),
  consulta_url: Joi.string().allow("").required(),
  subscription_key: Joi.string().allow("").required(),
});

export const consultarEPM = Joi.object({
  consulta: Joi.number().required(),
  desde: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/)
    .required()
    .messages({
      "string.pattern.base":
        "desde debe tener formato: YYYY-MM-DD HH:mm:ss.SSS",
    }),
  hasta: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/)
    .required()
    .messages({
      "string.pattern.base":
        "hasta debe tener formato: YYYY-MM-DD HH:mm:ss.SSS",
    }),
});
