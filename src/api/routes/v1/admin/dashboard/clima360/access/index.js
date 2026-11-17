import Clima360Service from "../../../../../../../services/clima360.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import { SuccessResponse, InternalError, responseError } from "../../../../../../../helpers/api.response.js";

const service = Clima360Service.getInstance();

const manejar = (nombre, fn) => async (req, res) => {
  try {
    const data = await fn(req);
    if (data === null) return responseError(200, "No se encontró la ciudad solicitada", 404, res);
    return SuccessResponse(res, data, "OK");
  } catch (err) {
    Logger.error(`Error clima360 ${nombre}`, err);
    return InternalError(res);
  }
};

export const ciudades = manejar("ciudades", (req) => service.ciudades(req.user.session));
export const resumen = manejar("resumen", (req) => service.resumen(req.user.session, req.query.ids, req.query.fecha));
export const comparador = manejar("comparador", (req) => service.comparador(req.user.session, req.query.ids, req.query.desde, req.query.hasta));
export const historico = manejar("historico", (req) => service.historico(req.user.session, req.query.ids, req.query.desde, req.query.hasta));
export const pronostico = manejar("pronostico", (req) => service.pronostico(req.user.session, req.params.id, req.query.fecha));
export const alertas = manejar("alertas", (req) => service.alertas(req.user.session, req.query.ids));

export const reporte = async (req, res) => {
  try {
    const out = await service.reporte(req.user.session, req.body, req.user.userId ?? null);
    if (!out) return responseError(200, "Tipo de reporte no soportado", 400, res);
    res.setHeader("Content-Type", out.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${out.filename}"`);
    res.setHeader("X-Reporte-Guardado", out.guardado ? "1" : "0");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Reporte-Guardado");
    return res.status(200).send(out.buffer);
  } catch (err) {
    Logger.error("Error clima360 reporte", err);
    return InternalError(res);
  }
};

export const reportes = manejar("reportes", (req) => service.reportes(req.user.session, Number(req.query.limite) || 30));
