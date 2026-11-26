import Joi from "joi";

export default {
  actualizar: Joi.object().keys({
    // Código del agente (ATEC, CMMC…) o null/vacío para el modo automático. El servicio lo normaliza y valida.
    agente: Joi.string().trim().max(20).allow("", null).required(),
  }),
};
