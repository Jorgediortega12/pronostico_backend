import MercadosService from "../../../../../../services/mercados.service.js";
import Logger from "../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../helpers/api.response.js";

const mercadosService = MercadosService.getInstance();

export const listarM = async (req, res) => {
  try {
    const result = await mercadosService.listarM();
    if (!result.success) return responseError(200, result.message, 404, res);

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    Logger.error(error);
    return InternalError(res);
  }
};
