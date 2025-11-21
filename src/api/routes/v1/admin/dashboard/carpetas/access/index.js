import CarpetasService from '../../../../../../../services/carpetas.service.js';
import Logger from '../../../../../../../helpers/logger.js';
import {
  SuccessResponse,
  InternalError,
  responseError,
} from '../../../../../../../helpers/api.response.js';

const service = CarpetasService.getInstance();

export const obtenerArbolCarpetas = async (req, res) => {
  try {
    const result = await service.obtenerArbolCarpetas();
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
