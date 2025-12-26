import Joi from "joi";

const medidaSchema = Joi.object({
  flujo: Joi.string().required(),
  fecha: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  codigo_rpm: Joi.string().required(),

  p1: Joi.number().allow(null),
  p2: Joi.number().allow(null),
  p3: Joi.number().allow(null),
  p4: Joi.number().allow(null),
  p5: Joi.number().allow(null),
  p6: Joi.number().allow(null),
  p7: Joi.number().allow(null),
  p8: Joi.number().allow(null),
  p9: Joi.number().allow(null),
  p10: Joi.number().allow(null),
  p11: Joi.number().allow(null),
  p12: Joi.number().allow(null),
  p13: Joi.number().allow(null),
  p14: Joi.number().allow(null),
  p15: Joi.number().allow(null),
  p16: Joi.number().allow(null),
  p17: Joi.number().allow(null),
  p18: Joi.number().allow(null),
  p19: Joi.number().allow(null),
  p20: Joi.number().allow(null),
  p21: Joi.number().allow(null),
  p22: Joi.number().allow(null),
  p23: Joi.number().allow(null),
  p24: Joi.number().allow(null),
});

export default {
  guardarBarra: Joi.object({
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  consultarBarrasIndex_xMC: Joi.object().keys({
    mc: Joi.string().required(),
  }),

  actualizarBarra: Joi.object({
    id: Joi.number().optional(),
    barra: Joi.string().required(),
    descripcion: Joi.string().allow("", null),
    nivel_tension: Joi.number().allow("", null),
    observaciones: Joi.string().allow("", null),
    habilitar: Joi.number().required(),
    mc: Joi.string().required(),
  }),

  guardarAgrupacion: Joi.object({
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  consultarAgrupacionesIndex_xBarraId: Joi.object().keys({
    barra_id: Joi.number().required(),
  }),

  actualizarAgrupacion: Joi.object({
    id: Joi.number().optional(),
    barra_id: Joi.number().required(),
    codigo_rpm: Joi.string().required(),
    flujo: Joi.string().required(),
    habilitar: Joi.number().required(),
    revision: Joi.string().required(),
    factor: Joi.number().required(),
  }),

  eliminarBarra: Joi.object({
    id: Joi.number().required(),
  }),
  eliminarAgrupacion: Joi.object({
    id: Joi.number().required(),
  }),
  eliminarMedidasRapido: Joi.object({
    medidas: Joi.array()
      .items(
        medidaSchema.keys({
          // para delete solo exigimos las claves
          p1: Joi.any().optional(),
          p2: Joi.any().optional(),
          p3: Joi.any().optional(),
          p4: Joi.any().optional(),
          p5: Joi.any().optional(),
          p6: Joi.any().optional(),
          p7: Joi.any().optional(),
          p8: Joi.any().optional(),
          p9: Joi.any().optional(),
          p10: Joi.any().optional(),
          p11: Joi.any().optional(),
          p12: Joi.any().optional(),
          p13: Joi.any().optional(),
          p14: Joi.any().optional(),
          p15: Joi.any().optional(),
          p16: Joi.any().optional(),
          p17: Joi.any().optional(),
          p18: Joi.any().optional(),
          p19: Joi.any().optional(),
          p20: Joi.any().optional(),
          p21: Joi.any().optional(),
          p22: Joi.any().optional(),
          p23: Joi.any().optional(),
          p24: Joi.any().optional(),
        })
      )
      .min(1)
      .required(),
  }),
  insertarMedidasRapido: Joi.object({
    medidas: Joi.array().items(medidaSchema).min(1).required(),
  }),
  actualizarMedidasRapido: Joi.object({
    medidas: Joi.array().items(medidaSchema).min(1).required(),
  }),
};
