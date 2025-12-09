import Joi from 'joi';

const loginSchema = Joi.object({
    usuario: Joi.string()
        .min(3)
        .max(50)
        .required(),
    password: Joi.string()
        .required()
});


const registerSchema = Joi.object({
    usuario: Joi.string()
        .min(3)
        .max(50)
        .required(),
    password: Joi.string()
        .max(50)
        .required(),

    email: Joi.string()
        .email()
        .required(),
    identificacion: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    pnombre: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    snombre: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    papellido: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    sapellido: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    telefono: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    celular: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    codperfil: Joi.string()
        .allow('')
        .optional()
});

const agregarPerfilSchema = Joi.object({
    nombrePerfil: Joi.string().required()
});

const editarUsuarioSchema = Joi.object({
    usuario: Joi.string()
        .min(3)
        .max(50)
        .optional(),

    identificacion: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    pnombre: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    snombre: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    papellido: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    sapellido: Joi.string()
        .max(50)
        .allow('')
        .optional(),

    email: Joi.string()
        .email()
        .optional(),

    telefono: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    celular: Joi.string()
        .max(20)
        .allow('')
        .optional(),

    estado: Joi.string()
        .valid('On', 'Off')
        .optional(),

    codperfil: Joi.number()
        .integer()
        .optional()
});

// Middleware de validación
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors
            });
        }

        next();
    };
};

export { loginSchema, registerSchema, agregarPerfilSchema, editarUsuarioSchema, validate };