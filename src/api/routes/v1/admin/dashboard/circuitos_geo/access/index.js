import * as circuitosGeoService from "../../../../../../../services/circuitos_geo.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

export const cargar = async (req, res) => {
  try {
    const { session } = req.user;
    const { departamento } = req.body;
    const archivo = req.file;
    if (!archivo) {
      return responseError(200, "Debe adjuntar el archivo KMZ/KML.", 400, res);
    }

    const result = await circuitosGeoService.cargarCircuitosDepartamento(
      session,
      departamento,
      archivo.path,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Circuitos cargados correctamente.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtener = async (req, res) => {
  try {
    const { session } = req.user;
    const { departamento } = req.params;
    const result = await circuitosGeoService.obtenerCircuitosDepartamento(
      session,
      departamento,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Consulta completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listarDepartamentos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await circuitosGeoService.listarDepartamentosCargados(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Consulta completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscar = async (req, res) => {
  try {
    const { session } = req.user;
    const { departamento, q } = req.query;
    const result = await circuitosGeoService.buscarCircuitos(session, departamento, q);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Búsqueda completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const relacionados = async (req, res) => {
  try {
    const { session } = req.user;
    const { departamento, circuito } = req.query;
    const result = await circuitosGeoService.obtenerPuntosDeCircuito(
      session,
      departamento,
      circuito,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, "Consulta completada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
