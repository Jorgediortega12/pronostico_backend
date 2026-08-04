// controllers/pronosticos.controller.js
import PronosticosService from "../../../../../../../services/pronosticos.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";
import { resolveSessionByUcp } from "../../../../../../../helpers/resolveSessionByUcp.js";
import RedisModel from "../../../../../../../models/redis.model.js";

const service = PronosticosService.getInstance();
const redisModel = RedisModel.getInstance();

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

  const { session } = req.user;
  try {
    const result = await service.exportarBulk(
      fecha_inicio,
      fecha_fin,
      usuario,
      ucp,
      pronostico,
      historico,
      datos,
      session,
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const exportarPreview = async (req, res) => {
  const {
    fecha_inicio,
    fecha_fin,
    usuario,
    ucp,
    pronostico = [],
    historico = [],
  } = req.body;

  const { session } = req.user;
  try {
    const result = await service.exportarPreview(
      fecha_inicio,
      fecha_fin,
      usuario,
      ucp,
      pronostico,
      historico,
      session,
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
  const { session } = req.user;
  try {
    const result = await service.borrarPronosticos(ucp, finicio, ffin, session);
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, true, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const play = async (req, res) => {
  const {
    ucp,
    fecha_inicio,
    fecha_fin,
    force_retrain,
    modelo = false,
    data,
  } = req.body;
  const { session } = req.user;
  try {
    const result = await service.play(
      ucp,
      fecha_inicio,
      fecha_fin,
      force_retrain,
      modelo,
      data,
      session,
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const retrainModel = async (req, res) => {
  const { session } = req.user;
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
  const { session } = req.user;
  try {
    const result = await service.getEvents(
      fecha_inicio,
      fecha_fin,
      ucp,
      600000,
    );

    if (!result.success) {
      return responseError(
        200,
        result.data?.message || "Error al obtener eventos",
        404,
        res,
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

export const errorFeedback = async (req, res) => {
  const { ucp, end_date, force_retrain } = req.body;
  const { session } = req.user;
  try {
    const result = await service.errorFeedback(end_date, force_retrain, ucp);

    if (!result.success) {
      return responseError(
        200,
        "No fue posible obtener el feedback de error",
        404,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data, // { reason }
      "Feedback obtenido correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const traerDatosClimaticos = async (req, res) => {
  try {
    const { ucp, fechainicio, fechafin } = req.params;
    const { session } = req.user;

    const result = await service.traerDatosClimaticos(
      ucp,
      fechainicio,
      fechafin,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 400, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (error) {
    return InternalError(res);
  }
};

export const predictDay = async (req, res) => {
  try {
    const { ucp, fecha, fecha_referencia } = req.body;
    const { session } = req.user;
    const result = await service.predictDay({
      ucp,
      fecha,
      fecha_referencia,
      force_retrain: false,
      offset_scalar: 1,
      timeoutMs: 120000,
    });

    if (!result.success) {
      return responseError(
        200,
        result.message || "Error en predictDay",
        404,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data,
      "Predicción diaria generada correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// controllers/validateHourlyAdjustments.controller.ts
export const validateHourlyAdjustments = async (req, res) => {
  try {
    const { ucp, fecha, tipo_dia, predicciones_actuales, ajustes_solicitados } =
      req.body;
    const { session } = req.user;
    const result = await service.validateHourlyAdjustments({
      ucp,
      fecha,
      tipo_dia,
      predicciones_actuales,
      ajustes_solicitados,
      timeoutMs: 120000,
    });

    if (!result.success) {
      return responseError(
        200,
        result.message || "Error en validateHourlyAdjustments",
        404,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data,
      "Ajustes horarios validados correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const analyzeDeviation = async (req, res) => {
  const { ucp, desvios } = req.body;
  const { session } = req.user;
  try {
    const result = await service.analyzeDeviation(ucp, desvios);

    if (!result.success) {
      // mantenemos la forma que usas en errorFeedback: responseError con código 200 y detalle
      return responseError(
        200,
        "No fue posible analizar los desvíos",
        404,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data, // lo que devuelva el microservicio que consulta OpenAI
      "Análisis de desvíos obtenido correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarEventosIdoXm = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const result = await service.cargarEventosIdoXm(fechaInicio, fechaFin);

    if (!result.success) {
      return responseError(
        200,
        "No fue posible consultar el portal IDO de XM",
        502,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data, // { fecha_inicio, fecha_fin, total, eventos: [...] }
      "Eventos de XM IDO obtenidos correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const predictDayScaled = async (req, res) => {
  try {
    const { ucp, fecha, fecha_referencia } = req.body;
    const { session } = req.user;
    const result = await service.predictDayScaled({
      ucp,
      fecha,
      fecha_referencia,
      force_retrain: false,
      offset_scalar: 1,
      timeoutMs: 120000,
    });

    if (!result.success) {
      return responseError(
        200,
        result.message || "Error en predictDayScaled",
        404,
        res,
      );
    }

    return SuccessResponse(
      res,
      result.data,
      "Predicción escalada generada correctamente",
    );
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const playPublic = async (req, res) => {
  const {
    ucp,
    fecha_inicio: _fecha_inicio,
    fecha_fin: _fecha_fin,
    force_retrain,
    modelo = false,
    data,
  } = req.body;
  let session = req?.user?.session;

  // Normalizar fechas: acepta YYYY-MM-DD (React) y DD-MM-YYYY (.NET)
  const parseFecha = (f) => {
    if (!f) return f;
    const s = String(f).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      // DD-MM-YYYY
      const [d, m, y] = s.split("-");
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      // DD/MM/YYYY
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    }
    return s; // Ya viene YYYY-MM-DD
  };

  const fecha_inicio = parseFecha(_fecha_inicio);
  const fecha_fin = parseFecha(_fecha_fin);

  try {
    console.log(fecha_inicio, fecha_fin);
    if (!session) {
      const keys = await redisModel.keys(`mercados*`);
      const mercadosParsed = await Promise.all(
        keys.map(async (key) => {
          const val = await redisModel.get(key);
          return JSON.parse(val);
        }),
      );
      session = await resolveSessionByUcp(ucp, mercadosParsed);
    }

    if (!session) {
      return responseError(
        200,
        `No se encontró cliente para el ucp ${ucp}`,
        404,
        res,
      );
    }
    console.log("session:", session);
    const result = await service.play(
      ucp,
      fecha_inicio,
      fecha_fin,
      force_retrain,
      modelo,
      data,
      session,
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
