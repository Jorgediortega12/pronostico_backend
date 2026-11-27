import schema, { paramsPorPaso } from "./schema.js";

// El contrato exige 422 (no el 400 de middleware/validator.js) con { success:false, message, detail }.
const OPCIONES = { abortEarly: false, convert: false, allowUnknown: false };
const OPCIONES_TEXTO = { ...OPCIONES, convert: true }; // query/params llegan como string

export const rechazo422 = (res, mensajes) =>
  res.status(422).json({
    success: false,
    message: mensajes.join("; "),
    detail: mensajes,
  });

const mensajes = (error) =>
  error.details.map((d) => d.message.replace(/['"]+/g, ""));

/** Valida req[source] con `esquema` y deja el valor LIMPIO en req.ajustes[source] (lo único que se reenvía). */
export const validar = (esquema, source = "body") => (req, res, next) => {
  const { error, value } = esquema.validate(
    req[source] ?? {},
    source === "body" ? OPCIONES : OPCIONES_TEXTO,
  );
  if (error) return rechazo422(res, mensajes(error));
  req.ajustes = { ...(req.ajustes ?? {}), [source]: value };
  return next();
};

/** PATCH: `params` debe cumplir la lista blanca del paso de la URL (req.ajustes.params.paso). */
export const validarParamsDelPaso = (req, res, next) => {
  const { paso } = req.ajustes.params;
  const p = req.ajustes.body.params;
  if (p === undefined || p === null) return next();
  const { error, value } = paramsPorPaso[paso].validate(p, OPCIONES);
  if (error) return rechazo422(res, mensajes(error).map((m) => `params.${m}`));
  req.ajustes.body.params = value;
  return next();
};

export { schema };
