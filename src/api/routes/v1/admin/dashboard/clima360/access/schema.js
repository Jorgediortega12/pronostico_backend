import Joi from "joi";

const fecha = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
  "string.pattern.base": "La fecha debe tener formato YYYY-MM-DD",
});
// ids = "1,2,3" (puntos del mapa); vacío = todos los activos
const ids = Joi.string().pattern(/^\d+(,\d+)*$/).allow("").optional();

export default {
  ids: Joi.object({ ids }),
  resumen: Joi.object({ ids, fecha: fecha.optional() }),
  rango: Joi.object({ ids, desde: fecha.required(), hasta: fecha.required() }),
  pronostico: Joi.object({ fecha: fecha.optional() }),
  reporte: Joi.object({
    tipo: Joi.string().valid("resumen", "comparativo", "pronostico", "alertas").required(),
    ids: Joi.array().items(Joi.number().integer().min(1)).min(1).required(),
    desde: fecha.required(),
    hasta: fecha.required(),
    variables: Joi.array().items(Joi.string().valid("temperatura", "sensacion", "humedad", "viento", "lluvia")).default([]),
    formato: Joi.string().valid("xlsx", "csv", "pdf").default("xlsx"),
  }),
  limite: Joi.object({ limite: Joi.number().integer().min(1).max(200).optional() }),
  idParam: Joi.object({ id: Joi.number().integer().min(1).required() }),
};
