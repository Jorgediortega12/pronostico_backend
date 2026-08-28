import * as ecuacionFronteraService from "../../../../../../../services/ecuacion_frontera.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

export const procesar = async (req, res) => {
  try {
    const { ucp } = req.body;
    const ecuacionFile = req.files?.ecuacion?.[0];
    const consumoFile = req.files?.consumo?.[0];

    if (!ecuacionFile || !consumoFile) {
      return responseError(
        200,
        "Debe adjuntar el archivo de ecuación de frontera y el de consumo horario.",
        400,
        res,
      );
    }

    const result = await ecuacionFronteraService.procesarEcuacionYConsumo(
      ecuacionFile.path,
      consumoFile.path,
      ucp,
    );

    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Procesamiento completado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
