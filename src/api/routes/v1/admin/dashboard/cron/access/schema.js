import Joi from "joi";

export const setConfig = Joi.object({
  hour: Joi.number().integer().min(0).max(23).required(),
  minute: Joi.number().integer().min(0).max(59).required(),
});