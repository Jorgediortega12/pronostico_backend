import Joi from "joi";

export default {
  // POST /demanda/predict
  predict: Joi.object({
    id: Joi.number().integer().valid(1, 2, 3).required(), // 1=RF, 2=XGB, 3=SARIMAX
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
    start_date: Joi.string().required(),
    end_date: Joi.string().required(),
  }),

  // POST /demanda/day/behavior
  dayBehavior: Joi.object({
    model_type: Joi.number().integer().valid(0, 1).required(),
    model_id: Joi.number().integer().required(),
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
    start_date: Joi.string().required(),
    end_date: Joi.string().required(),
    lag: Joi.number().integer().min(0).default(0),
  }),

  // GET /demanda/monthly/:year
  monthlyByYear: Joi.object({
    year: Joi.number().integer().required(),
  }),

  // PUT /demanda/monthly/update
  updateMonthlyType: Joi.object({
    values: Joi.object()
      .pattern(
        Joi.string(), // year key
        Joi.object().pattern(
          Joi.string(), // month key
          Joi.string().valid("NORMAL", "NIÑO", "NIÑA")
        )
      )
      .required(),
  }),

  // POST /demanda/monthly/info
  monthlyInfo: Joi.object({
    year: Joi.number().integer().required(),
    month: Joi.number().integer().min(1).max(12).required(),
    predicition: Joi.number().optional().allow(null),
  }),

  // POST /demanda/model/create
  createModel: Joi.object({
    model_name: Joi.string().required(),
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
    start_date: Joi.string().required(),
    end_date: Joi.string().required(),
  }),

  // POST /demanda/model/savevalues
  saveModelValues: Joi.object({
    model_id: Joi.number().integer().required(),
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
    dates: Joi.array().items(Joi.string()).required(),
    values: Joi.array().items(Joi.number()).required(),
  }),

  // GET /demanda/model/values/:model_id
  modelValues: Joi.object({
    model_id: Joi.number().integer().required(),
  }),

  // GET /demanda/model/names/:user_id/:session_id
  userModels: Joi.object({
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
  }),

  // POST /demanda/model/type
  changeModelType: Joi.object({
    model_id: Joi.number().integer().required(),
    dates: Joi.array().items(Joi.string()).required(),
    types: Joi.array().items(Joi.string().valid("NORMAL", "NIÑO", "NIÑA")).required(),
  }),

  // POST /demanda/model/savevalues/year
  saveModelByYear: Joi.object({
    model_id: Joi.number().integer().required(),
    year: Joi.number().integer().required(),
    predict_year: Joi.number().integer().required(),
  }),

  // POST /demanda/yearly/type
  createTypeYearList: Joi.object({
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
  }),

  // PUT /demanda/yearly/type
  updateTypeYearList: Joi.object({
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
    year: Joi.array().items(Joi.number().integer()).required(),
    type: Joi.array().items(Joi.string().valid("TIPICO", "ATIPICO")).required(),
  }),

  // GET /demanda/yearly/type/:user_id/:session_id
  getTypeYearList: Joi.object({
    user_id: Joi.number().integer().required(),
    session_id: Joi.number().integer().required(),
  }),
};