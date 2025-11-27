import Joi from "joi";

export default {
  cargarDatosSesiones: Joi.object().keys({
    codsuperior: Joi.number().required(),
  }),
  cargarArchivoVrSesiones: Joi.object().keys({
    codcarpeta: Joi.number().required(),
  }),
  buscarVersionSesionCod: Joi.object().keys({
    codigo: Joi.number().required(),
  }),
  cargarPeriodosSesion: Joi.object().keys({
    codsesion: Joi.string().required(),
    tipo: Joi.string().required(),
  }),
  cargarPeriodosxUCPxFecha: Joi.object().keys({
    ucp: Joi.string().required(),
    fechainicio: Joi.string().required(),
    fechafin: Joi.string().required(),
  }),
};
