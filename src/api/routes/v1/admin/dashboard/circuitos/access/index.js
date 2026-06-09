import CircuitosService from "../../../../../../../services/circuitos.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = CircuitosService.getInstance();

export const crearCircuito = async (req, res) => {
  try {
    const { ucp, circuito, codigo_rpm } = req.body;
    const { session } = req.user;
    const result = await service.crearCircuito(
      { ucp, circuito, codigo_rpm },
      session,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtenerCircuitos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.obtenerCircuitos(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const obtenerCircuitosPorUCP = async (req, res) => {
  try {
    const { ucp } = req.body;
    const { session } = req.user;
    const result = await service.obtenerCircuitosPorUCP({ ucp }, session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarCircuito = async (req, res) => {
  try {
    const { id, ucp, circuito, codigo_rpm } = req.body;
    const { session } = req.user;
    const result = await service.actualizarCircuito(
      { id, ucp, circuito, codigo_rpm },
      session,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminarCircuito = async (req, res) => {
  try {
    const { id } = req.body;
    const { session } = req.user;
    const result = await service.eliminarCircuito({ id }, session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
