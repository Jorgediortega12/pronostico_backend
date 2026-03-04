import Joi from "joi";

export default {
  crear: Joi.object().keys({
    nombre: Joi.string().required(),
    nit: Joi.string().required(),
    correo: Joi.string().required(),
    session: Joi.object().optional(),
  }),

  editar: Joi.object().keys({
    uuid: Joi.string().required(),
    nombre: Joi.string().required(),
    nit: Joi.string().required(),
    correo: Joi.string().required(),
    session: Joi.object().optional(),
  }),
  buscar: Joi.object().keys({
    uuid: Joi.string().required(),
    session: Joi.object().optional(),
  }),
  listarM: Joi.object().keys({
    session: Joi.object().optional(),
  }),
  accesosBD: Joi.object().keys({
    uuid: Joi.string().required(),
    proyecto: Joi.string().required(),
    basededatos: Joi.string().required(),
    host: Joi.string().required(),
    usuario: Joi.string().required(),
    contrasenia: Joi.string().required(),
    puerto: Joi.number().required(),
    session: Joi.object().optional(),
  }),
};
