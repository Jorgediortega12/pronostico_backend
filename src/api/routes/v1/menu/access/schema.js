import Joi from 'joi';

const asignarModuloSchema = Joi.object({
  codPerfil: Joi.number()
    .integer()
    .required(),
  codMenu: Joi.number()
    .integer()
    .required()
});

const editarPerfilSchema = Joi.object({
  nombre: Joi.string().required() 
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

export {
  asignarModuloSchema,
  editarPerfilSchema,
  validate
};
