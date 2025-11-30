// controllers/pronosticos.controller.js
import PronosticosService from "../../../../../../../services/pronosticos.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = PronosticosService.getInstance();

export const exportarBulk = async (req, res) => {
  const {
    fecha_inicio,
    fecha_fin,
    usuario,
    ucp,
    pronostico = [],
    historico = [],
    datos = {},
  } = req.body;
  try {
    const result = await service.exportarBulk(
      fecha_inicio,
      fecha_fin,
      usuario,
      ucp,
      pronostico,
      historico,
      datos
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

export const play = async (req, res) => {
  const { ucp, fecha_inicio, fecha_fin, force_retrain } = req.body;
  try {
    const result = await service.play(
      ucp,
      fecha_inicio,
      fecha_fin,
      force_retrain
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
