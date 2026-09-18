import * as pronosticoDiarioService from "../../../../../../../services/pronostico_diario.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";
import { resolveSessionByUcp } from "../../../../../../../helpers/resolveSessionByUcp.js";

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

export const ultimaActualizacion = async (req, res) => {
  try {
    const { session } = req.user;

    const result = await pronosticoDiarioService.ultimaActualizacionPorUcp(session);

    return SuccessResponse(res, result, "Última actualización por mercado.");
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

export const listarEjecuciones = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp } = req.query;

    const result = await pronosticoDiarioService.listarEjecucionesPronostico(
      ucp,
      session,
    );

    return SuccessResponse(res, result, "Ejecuciones de pronóstico cargadas.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// Sin auth (montado también en configuracion-interna) — llamado por el
// servicio Python (epm) para construir el CSV de histórico diario que
// alimenta el reentrenamiento de /predict-daily. Resuelve la sesión del
// cliente por ucp, igual que cargarPeriodosxUCPDesdeFecha para el módulo
// horario.
export const cargarHistoricoDesdeFecha = async (req, res) => {
  try {
    const { ucp, fechaInicio } = req.params;
    const session = req.user?.session ?? (await resolveSessionByUcp(ucp));

    if (!session) {
      return responseError(
        200,
        `No se encontró cliente para el ucp ${ucp}`,
        404,
        res,
      );
    }

    const rows = await pronosticoDiarioService.cargarHistoricoDiarioDesdeFecha(
      ucp,
      fechaInicio,
      session,
    );

    if (!rows || rows.length === 0) {
      return responseError(
        200,
        `no se pudo encontrar los historicos diarios de ${ucp}`,
        404,
        res,
      );
    }

    return SuccessResponse(res, rows, `Historicos diarios de ${ucp} entontrados`);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const pronosticar = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp, fechaInicio, nDias, forceRetrain, modoReentreno } = req.body;

    const result = await pronosticoDiarioService.obtenerPronosticoDiario(
      ucp,
      fechaInicio,
      nDias,
      forceRetrain,
      modoReentreno,
    );

    if (!result.success) {
      return responseError(
        200,
        result.data?.detail || "No se pudo generar el pronóstico diario.",
        400,
        res,
      );
    }

    // No bloquea la respuesta ni la tumba si falla — es solo historial
    // para "Cargar Pronóstico", no algo crítico del flujo de pronosticar.
    const metadata = result.data?.metadata;
    if (metadata?.fecha_inicio && metadata?.fecha_fin && result.data?.predictions) {
      pronosticoDiarioService
        .guardarEjecucionPronostico(
          ucp,
          metadata.fecha_inicio,
          metadata.fecha_fin,
          result.data.predictions,
          session,
        )
        .catch((err) => Logger.error("No se pudo guardar la ejecución de pronóstico:", err));
    }

    return SuccessResponse(res, result.data, "Pronóstico diario generado.");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
