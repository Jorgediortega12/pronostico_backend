import Joi from "joi";
import MenuAreasService from "../../../../../../../services/menu_areas.service.js";
import Logger from "../../../../../../../helpers/logger.js";

const service = MenuAreasService.getInstance();

const ok = (res, data, message = "OK") => res.status(200).json({ success: true, message, data });
const manejar = (nombre, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (err) {
    Logger.error(`Error menu áreas ${nombre}`, err);
    return res.status(500).json({ success: false, message: `Error en ${nombre}`, error: err.message });
  }
};

// ─── Validaciones ────────────────────────────────────────────────────────────
const perfil = Joi.number().integer().min(1).required();
const areaSchema = Joi.object({
  codperfil: perfil,
  nombre: Joi.string().trim().min(2).max(60).required(),
  icono: Joi.string().trim().max(40).allow(null, "").optional(),
  orden: Joi.number().integer().min(1).optional(),
});
const areaUpdateSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(60).optional(),
  icono: Joi.string().trim().max(40).allow(null, "").optional(),
  orden: Joi.number().integer().min(1).optional(),
});
const moduloAreaSchema = Joi.object({ codperfil: perfil, codarea: Joi.number().integer().allow(null).required() });
const frecuentesSchema = Joi.object({ codperfil: perfil, codmenus: Joi.array().items(Joi.alternatives(Joi.number().integer(), Joi.string().pattern(/^\d+$/))).max(20).required() });

const validar = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ success: false, message: "Errores de validación", errors: error.details.map((d) => ({ field: d.path[0], message: d.message })) });
  }
  req.body = value;
  next();
};

const copiarSchema = Joi.object({ origen: perfil, destino: perfil });

export const validaciones = { areaSchema, areaUpdateSchema, moduloAreaSchema, frecuentesSchema, copiarSchema, validar };

// ─── Controladores ───────────────────────────────────────────────────────────
export const estructura = manejar("estructura", async (req, res) =>
  ok(res, await service.estructura(req.user.session, parseInt(req.params.codperfil, 10))),
);

export const configuracion = manejar("configuracion", async (req, res) =>
  ok(res, await service.configuracion(req.user.session, parseInt(req.params.codperfil, 10))),
);

export const crearArea = manejar("crearArea", async (req, res) => ok(res, await service.crearArea(req.user.session, req.body.codperfil, req.body), "Área creada"));

export const actualizarArea = manejar("actualizarArea", async (req, res) => {
  const area = await service.actualizarArea(req.user.session, parseInt(req.params.cod, 10), req.body);
  if (!area) return res.status(404).json({ success: false, message: "Área no encontrada" });
  return ok(res, area, "Área actualizada");
});

export const eliminarArea = manejar("eliminarArea", async (req, res) => {
  const borrada = await service.eliminarArea(req.user.session, parseInt(req.params.cod, 10));
  if (!borrada) return res.status(404).json({ success: false, message: "Área no encontrada" });
  return ok(res, null, "Área eliminada; sus módulos quedaron sin área");
});

export const asignarModuloAArea = manejar("asignarModuloAArea", async (req, res) => {
  const r = await service.asignarModuloAArea(req.user.session, req.body.codperfil, parseInt(req.params.cod, 10), req.body.codarea);
  if (r === false) return res.status(404).json({ success: false, message: "El área no existe para este perfil" });
  return ok(res, r, "Módulo actualizado");
});

export const guardarFrecuentes = manejar("guardarFrecuentes", async (req, res) =>
  ok(res, await service.guardarFrecuentes(req.user.session, req.body.codperfil, req.body.codmenus), "Accesos frecuentes guardados"),
);

export const copiarConfiguracion = manejar("copiarConfiguracion", async (req, res) => {
  const { origen, destino } = req.body;
  if (origen === destino) return res.status(400).json({ success: false, message: "El perfil de origen y el de destino deben ser distintos" });
  return ok(res, await service.copiarConfiguracion(req.user.session, origen, destino), "Configuración copiada");
});
