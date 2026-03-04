import Joi from 'joi'

export default {
    crear: Joi.object().keys({
        perfil: Joi.number().required(),
        correo: Joi.string().email().required(),
        usuario: Joi.string().required(),
        nombre: Joi.string().required(),
        contrasenia: Joi.string().min(6).required(),
        session: Joi.object().optional()
    }),
    editar: Joi.object().keys({
        perfil: Joi.number().required(),
        nombre: Joi.string().required(),
        usuario: Joi.string().required(),
        session: Joi.object().optional()
    }),
    estado: Joi.object().keys({
        estado: Joi.number().required(),
        usuario: Joi.string().required(),
        session: Joi.object().optional()
    }),
}