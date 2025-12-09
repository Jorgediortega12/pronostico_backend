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
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const retrainModel = async (req, res) => {
  try {
    // aceptar ucp por query o body (compatibilidad)
    const ucp = req.query.ucp ?? req.body?.ucp;
    const timeoutMsQuery = req.query.timeoutMs;
    const timeoutMsBody = req.body?.timeoutMs;
    const timeoutMs = timeoutMsQuery
      ? Number(timeoutMsQuery)
      : typeof timeoutMsBody !== "undefined"
      ? Number(timeoutMsBody)
      : undefined;

    if (!ucp) {
      return res
        .status(400)
        .json({ success: false, message: "Parámetro 'ucp' es requerido" });
    }

    const result = await service.retrainModel(ucp, timeoutMs);

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: "No fue posible reentrenar el modelo. Ver logs del servidor.",
        meta: { statusCode: result.statusCode ?? 0, host: result.host ?? null },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Reentrenamiento ejecutado para ${ucp}`,
      data: result.data,
      host: result.host,
    });
  } catch (err) {
    Logger.error(colors.red("Error predictController.retrainModel: "), err);
    return res.status(500).json({
      success: false,
      message: "Error interno al solicitar reentrenamiento",
    });
  }
};

export const getEvents = async (req, res) => {
  const { ucp, fecha_inicio, fecha_fin } = req.body;

  try {
    const result = await service.getEvents(
      fecha_inicio,
      fecha_fin,
      ucp,
      600000
    );

    if (!result.success) {
      return responseError(
        200,
        result.data?.message || "Error al obtener eventos",
        404,
        res
      );
    }

    // Validar estructura de respuesta
    if (!result.data || !result.data.events) {
      return responseError(200, "La API no devolvió eventos válidos", 500, res);
    }

    return SuccessResponse(res, result.data, "Eventos obtenidos correctamente");
  } catch (err) {
    Logger.error("Error en getEvents controller:", err);
    return InternalError(res);
  }
};
