// controllers/pronosticos.controller.js
import PronosticosService from "../../../../../../../services/pronosticos.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = PronosticosService.getInstance();

export const crearPronostico = async (req, res) => {
  const { ucp, fecha, codigo, observacion, usuario, ps } = req.body;
  try {
    const result = await service.crearPronostico(
      ucp,
      fecha,
      codigo,
      observacion,
      usuario,
      ps
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// Bulk: recibir pronosticoList: [{fecha, p1..p24, codigo?, observacion?}, ...]
// o recibir pronosticoList en pronostico y opcional historico en historico
export const crearPronosticosBulk = async (req, res) => {
  const {
    ucp,
    pronostico = [],
    borrarPrevio = false,
    generarArchivos = true,
    codcarpeta,
  } = req.body;
  try {
    const result = await service.crearPronosticosBulk(
      ucp,
      pronostico,
      borrarPrevio,
      generarArchivos,
      codcarpeta
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const borrarPronosticos = async (req, res) => {
  const { ucp, finicio, ffin } = req.body;
  try {
    const result = await service.borrarPronosticos(ucp, finicio, ffin);
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
