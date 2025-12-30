// access/schema.js
import Joi from "joi";

export default {
  exportarBulk: Joi.object().keys({
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    usuario: Joi.string().required(),
    ucp: Joi.string().required(),
    pronostico: Joi.array()
      .items(
        Joi.object().keys({
          fecha: Joi.string().required(),
          observacion: Joi.string().allow("", null),
          // p1..p24 opcionales pero al menos uno es esperado
          p1: Joi.number().optional(),
          p2: Joi.number().optional(),
          p3: Joi.number().optional(),
          p4: Joi.number().optional(),
          p5: Joi.number().optional(),
          p6: Joi.number().optional(),
          p7: Joi.number().optional(),
          p8: Joi.number().optional(),
          p9: Joi.number().optional(),
          p10: Joi.number().optional(),
          p11: Joi.number().optional(),
          p12: Joi.number().optional(),
          p13: Joi.number().optional(),
          p14: Joi.number().optional(),
          p15: Joi.number().optional(),
          p16: Joi.number().optional(),
          p17: Joi.number().optional(),
          p18: Joi.number().optional(),
          p19: Joi.number().optional(),
          p20: Joi.number().optional(),
          p21: Joi.number().optional(),
          p22: Joi.number().optional(),
          p23: Joi.number().optional(),
          p24: Joi.number().optional(),
        })
      )
      .required(),
    historico: Joi.array()
      .items(
        Joi.object().keys({
          fecha: Joi.string().required(),
          observacion: Joi.string().allow("", null),
          // p1..p24 opcionales pero al menos uno es esperado
          p1: Joi.number().optional(),
          p2: Joi.number().optional(),
          p3: Joi.number().optional(),
          p4: Joi.number().optional(),
          p5: Joi.number().optional(),
          p6: Joi.number().optional(),
          p7: Joi.number().optional(),
          p8: Joi.number().optional(),
          p9: Joi.number().optional(),
          p10: Joi.number().optional(),
          p11: Joi.number().optional(),
          p12: Joi.number().optional(),
          p13: Joi.number().optional(),
          p14: Joi.number().optional(),
          p15: Joi.number().optional(),
          p16: Joi.number().optional(),
          p17: Joi.number().optional(),
          p18: Joi.number().optional(),
          p19: Joi.number().optional(),
          p20: Joi.number().optional(),
          p21: Joi.number().optional(),
          p22: Joi.number().optional(),
          p23: Joi.number().optional(),
          p24: Joi.number().optional(),
        })
      )
      .required(),
    datos: Joi.object().required(),
  }),
  play: Joi.object().keys({
    ucp: Joi.string().required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
    force_retrain: Joi.boolean().required(),
    modelo: Joi.boolean().required(),
  }),
  retrainModel: Joi.object().keys({
    ucp: Joi.string().trim().required(),
    timeoutMs: Joi.number().integer().min(1000).optional().default(120000),
  }),
  getEvents: Joi.object().keys({
    ucp: Joi.string().required(),
    fecha_inicio: Joi.string().required(),
    fecha_fin: Joi.string().required(),
  }),
  errorFeedback: Joi.object().keys({
    ucp: Joi.string().required(),
    end_date: Joi.string().required(),
    force_retrain: Joi.boolean().required(),
  }),
  traerDatosClimaticos: Joi.object({
    ucp: Joi.string().required(),
    fechainicio: Joi.string().required(),
    fechafin: Joi.string().required(),
  }),
};
