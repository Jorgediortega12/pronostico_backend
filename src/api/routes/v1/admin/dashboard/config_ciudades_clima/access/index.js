import ConfigCiudadesClimaService from "../../../../../../../services/config_ciudades_clima.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConfigCiudadesClimaService.getInstance();

export const listar = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.listar(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const guardar = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.guardar(session, req.body);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminar = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp } = req.params;
    const result = await service.eliminar(session, ucp);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarOpenweather = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await service.buscarOpenweather(q);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarAccuweather = async (req, res) => {
  try {
    const { session } = req.user;
    const { q } = req.query;
    const result = await service.buscarAccuweather(session, q);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listarCiudadesYaConfiguradas = async (req, res) => {
  try {
    const result = await service.listarCiudadesYaConfiguradas();
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
