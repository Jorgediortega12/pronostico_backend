import Joi from "joi";

export default {
  // Body de /predict y /predict/excel (equivale a MPMPredictSchema del origen)
  predict: Joi.object({
    id: Joi.number().integer().valid(1, 2, 3, 4).required(),
    last_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    previous_days: Joi.number().integer().min(0).max(15).required(),
    type: Joi.number().integer().min(0).default(0),
  }),

  // Params de /demand/:year/:month/:previous_days
  demand: Joi.object({
    year: Joi.number().integer().required(),
    month: Joi.number().integer().min(1).max(12).required(),
    previous_days: Joi.number().integer().min(0).max(15).required(),
  }),
};