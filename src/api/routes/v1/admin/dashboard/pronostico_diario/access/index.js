import * as pronosticoDiarioService from "../../../../../../../services/pronostico_diario.service.js";
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
    const consumoFile = req.file;

    if (!consumoFile) {
      return responseError(
        200,
        "Debe adjuntar el archivo de consumo diario.",
        400,
        res,
      );
    }

    const result = await pronosticoDiarioService.importarConsumoDiario(
      consumoFile.path,
      ucp,
      session,
    );

    return SuccessResponse(res, result, "Consumo diario procesado.");
  } catch (err) {
    Logger.error(err);
    return responseError(200, err.message, 400, res);
  }
};

export const guardar = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp, filas } = req.body;

    const result = await pronosticoDiarioService.guardarConsumoDiario(
      ucp,
      filas,
      session,
    );

    return SuccessResponse(res, result, "Consumo diario guardado.");
  } catch (err) {
    Logger.error(err);
    return responseError(200, err.message, 400, res);
  }
};

export const cargar = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp, fechaInicio, fechaFin } = req.query;

    const result = await pronosticoDiarioService.cargarDatosDiarios(
      ucp,
      fechaInicio,
      fechaFin,
      session,
    );

    return SuccessResponse(res, result, "Datos diarios cargados.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarEstado = async (req, res) => {
  try {
    const { session } = req.user;
    const { codigo, estado, observacion } = req.body;

    const result = await pronosticoDiarioService.actualizarEstadoDemandaDiaria(
      codigo,
      estado,
      observacion,
      session,
    );

    if (!result) {
      return responseError(200, "No se encontró el registro.", 404, res);
    }

    return SuccessResponse(res, result, "Estado actualizado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const pronosticar = async (req, res) => {
  try {
    const { ucp, fechaInicio, nDias, forceRetrain } = req.body;

    const result = await pronosticoDiarioService.obtenerPronosticoDiario(
      ucp,
      fechaInicio,
      nDias,
      forceRetrain,
    );

    if (!result.success) {
      return responseError(
        200,
        result.data?.detail || "No se pudo generar el pronóstico diario.",
        400,
        res,
      );
    }

    return SuccessResponse(res, result.data, "Pronóstico diario generado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
