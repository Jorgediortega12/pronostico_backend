import AdemAgenteConfigService from "../../../../../../../services/adem_agente_config.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = AdemAgenteConfigService.getInstance();

export const obtener = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.obtener(session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizar = async (req, res) => {
  try {
    const { agente } = req.body;
    const { session } = req.user;
    const result = await service.actualizar(session, { agente });
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
