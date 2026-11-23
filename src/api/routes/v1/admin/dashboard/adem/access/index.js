import AdemService from "../../../../../../../services/adem.service.js";
import {
  SuccessResponse,
  responseError,
  InternalError,
} from "../../../../../../../helpers/api.response.js";

const service = AdemService.getInstance();

export const cargarAdemZip = async (req, res) => {
  try {
    if (!req.file) {
      return responseError(400, "No se recibió ningún archivo ZIP.", 400, res);
    }

    const { session } = req.user;
    const result = await service.cargarAdemZip(req.file.path, req.file.originalname, session);

    if (!result.success) {
      return responseError(200, result.message, 500, res);
    }

    return SuccessResponse(res, result, result.message);
  } catch (err) {
    console.error("[ADEM controller] Error completo:", err);
    return responseError(200, err.message || "Error procesando el ZIP.", 422, res);
  }
};