import Joi from "joi";

export default {
  // ucp ya no es obligatorio: un punto puede ser solo una ciudad (con sus
  // IDs de clima) sin mercado asociado -- pero necesita ser al menos una
  // de las dos cosas.
  crearPunto: Joi.object()
    .keys({
      nombre: Joi.string().required(),
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      ucp: Joi.string().allow(null, "").optional(),
      ciudad_nombre: Joi.string().allow(null, "").optional(),
      accuweather_id: Joi.string().allow(null, "").optional(),
      openweather_id: Joi.string().allow(null, "").optional(),
      orden: Joi.number().optional(),
    })
    .or("ucp", "accuweather_id", "openweather_id"),
  actualizarPunto: Joi.object()
    .keys({
      nombre: Joi.string().required(),
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      ucp: Joi.string().allow(null, "").optional(),
      ciudad_nombre: Joi.string().allow(null, "").optional(),
      accuweather_id: Joi.string().allow(null, "").optional(),
      openweather_id: Joi.string().allow(null, "").optional(),
      activo: Joi.boolean().required(),
      orden: Joi.number().optional(),
    })
    .or("ucp", "accuweather_id", "openweather_id"),
  reporteSensacionTermica: Joi.object().keys({
    fechaInicio: Joi.string().required(), // YYYY-MM-DD
    fechaFin: Joi.string().required(), // YYYY-MM-DD
  }),
};
