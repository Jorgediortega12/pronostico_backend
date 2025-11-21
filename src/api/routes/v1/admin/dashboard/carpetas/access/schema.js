import Joi from 'joi';

export default {
  insertarCarpeta: Joi.object().keys({
    nombre: Joi.string().required(),
    codsuperior: Joi.number().allow(null).optional(),
    fechacreado: Joi.date().required(),
    nivel: Joi.number().integer().min(1).required(),
    codsede: Joi.number().allow(null).optional(),
  }),

  actualizarNombreCarpeta: Joi.object().keys({
    cod: Joi.number().integer().required(),
    nombre: Joi.string().required(),
  }),
};
