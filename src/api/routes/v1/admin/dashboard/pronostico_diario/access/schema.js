import Joi from "joi";

export default {
  procesar: Joi.object().keys({
    ucp: Joi.string().required(),
  }),
  guardar: Joi.object().keys({
    ucp: Joi.string().required(),
    filas: Joi.array()
      .items(
        Joi.object().keys({
          fecha: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required(),
          tipoDia: Joi.string().allow(null, "").optional(),
          total: Joi.number().required(),
        }),
      )
      .min(1)
      .required(),
  }),
  cargar: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    fechaFin: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
  }),
  actualizarEstado: Joi.object().keys({
    codigo: Joi.number().required(),
    estado: Joi.string().required(),
    observacion: Joi.string().allow("").required(),
  }),
  pronosticar: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    nDias: Joi.number().min(1).max(90).required(),
    forceRetrain: Joi.boolean().default(false),
    // Reentreno (botón "Reentreno"): fechaInicio es el piso del histórico
    // de entrenamiento, no un punto de partida exacto del pronóstico — se
    // manda como start_date (sin end_date) y nDias fijo (30, igual que
    // el módulo horario en pronosticos.service.js -> play()/callPredict
    // cuando fecha_fin es null). Sin este flag, "reentrenar con todo el
    // histórico" (rango de cientos de días) rompía la validación
    // nDias <= 90.
    modoReentreno: Joi.boolean().default(false),
  }),
  exportar: Joi.object().keys({
    ucp: Joi.string().required(),
    fechaInicio: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    fechaFin: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required(),
    predicciones: Joi.array()
      .items(
        Joi.object().keys({
          fecha: Joi.string().required(),
          dia_semana: Joi.string().allow("", null),
          demanda_total: Joi.number().required(),
          is_festivo: Joi.boolean().default(false),
          is_weekend: Joi.boolean().default(false),
        }),
      )
      .min(1)
      .required(),
    observacion: Joi.string().allow("", null),
    usuario: Joi.string().allow("", null),
  }),
  listarEjecucionesPorCarpeta: Joi.object().keys({
    codcarpeta: Joi.number().required(),
  }),
  cargarEjecucionPorCodigo: Joi.object().keys({
    codigo: Joi.number().required(),
  }),
};
