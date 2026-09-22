import AlertasService from "../../../../../../../services/alertas.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = AlertasService.getInstance();

const handleError = (res, err, accion) => {
  Logger.error(`[${accion}] ${err.message}`);
  if (err.statusCode) {
    return responseError(200, err.message, err.statusCode, res);
  }
  return InternalError(res);
};

export const listarAlertas = async (req, res) => {
  try {
    const { session } = req.user;
    const data = await service.listarAlertas(session, req.query);
    return SuccessResponse(res, data, "Alertas obtenidas correctamente");
  } catch (err) {
    return handleError(res, err, "listarAlertas");
  }
};

export const obtenerDetalle = async (req, res) => {
  try {
    const { session } = req.user;
    const codigo = parseInt(req.params.codigo, 10);
    const data = await service.obtenerDetalle(session, codigo);
    return SuccessResponse(res, data, "Detalle de alerta obtenido correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerDetalle");
  }
};

export const marcarRevisada = async (req, res) => {
  try {
    const { session } = req.user;
    const codigo = parseInt(req.params.codigo, 10);
    const data = await service.marcarRevisada(session, codigo);
    return SuccessResponse(res, data, "Alerta marcada como revisada");
  } catch (err) {
    return handleError(res, err, "marcarRevisada");
  }
};

export const obtenerConfig = async (req, res) => {
  try {
    const { session } = req.user;
    const data = await service.getConfig(session);
    return SuccessResponse(res, data, "Configuración de alertas obtenida correctamente");
  } catch (err) {
    return handleError(res, err, "obtenerConfig");
  }
};

export const actualizarConfig = async (req, res) => {
  try {
    const { session } = req.user;
    const { categoria } = req.params;
    const data = await service.updateConfig(session, categoria, req.body);
    return SuccessResponse(res, data, "Configuración de alertas actualizada correctamente");
  } catch (err) {
    return handleError(res, err, "actualizarConfig");
  }
};

export const evaluarAhora = async (req, res) => {
  try {
    const { session } = req.user;
    const data = await service.evaluarTenant(session);
    return SuccessResponse(res, data, "Evaluación de alertas ejecutada correctamente");
  } catch (err) {
    return handleError(res, err, "evaluarAhora");
  }
};
