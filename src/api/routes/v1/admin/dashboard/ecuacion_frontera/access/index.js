import * as ecuacionFronteraService from "../../../../../../../services/ecuacion_frontera.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

export const procesar = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp } = req.body;
    const ecuacionFile = req.files?.ecuacion?.[0];
    const consumoFile = req.files?.consumo?.[0];

    // El archivo de ecuación es opcional — casi no cambia entre cargas; si
    // ya se subió antes para este mercado, no hace falta volver a subirlo.
    if (!consumoFile) {
      return responseError(
        200,
        "Debe adjuntar el archivo de consumo horario.",
        400,
        res,
      );
    }

    const result = await ecuacionFronteraService.procesarEcuacionYConsumo(
      ecuacionFile?.path,
      consumoFile.path,
      ucp,
      session,
    );

    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Procesamiento completado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const guardarEcuacion = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp } = req.body;
    const ecuacionFile = req.files?.ecuacion?.[0];

    if (!ecuacionFile) {
      return responseError(
        200,
        "Debe adjuntar el archivo de ecuación de frontera.",
        400,
        res,
      );
    }

    const result = await ecuacionFronteraService.guardarSoloEcuacion(
      ecuacionFile.path,
      ucp,
      session,
    );

    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Ecuación de frontera guardada.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const guardarRespaldo = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp, fechaInicio, fechaFin } = req.body;

    const result = await ecuacionFronteraService.guardarSoloRespaldo(
      ucp,
      session,
      fechaInicio,
      fechaFin,
    );

    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Respaldo guardado en base de datos.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const calcularRespaldo = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp, fechaInicio } = req.query;
    const result = await ecuacionFronteraService.calcularRespaldoSinGuardar(
      ucp,
      fechaInicio,
      session,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result, "Cálculo completado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
