import NoticiasUngrdService from "../../../../../../../services/noticias_ungrd.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = NoticiasUngrdService.getInstance();

export const listarNoticias = async (req, res) => {
  try {
    const { limite } = req.query;
    const result = await service.obtenerNoticias(
      limite ? Number(limite) : 5,
    );

    if (!result.success) {
      return responseError(200, result.message, 502, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
