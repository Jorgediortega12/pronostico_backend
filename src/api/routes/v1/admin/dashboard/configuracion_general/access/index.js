import ConfiguracionGeneralService from "../../../../../../../services/configuracion_general.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = ConfiguracionGeneralService.getInstance();

export const obtenerHoraFinDia = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.obtenerHoraFinDia(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const guardarHoraFinDia = async (req, res) => {
  try {
    const { hora_fin_dia } = req.body;
    const { session } = req.user;
    const result = await service.guardarHoraFinDia(session, { hora_fin_dia });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
