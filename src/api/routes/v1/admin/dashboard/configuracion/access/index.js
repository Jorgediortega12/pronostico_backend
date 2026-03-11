import ConfiguracionService from "../../../../../../../services/configuracion.service.js";
import RedisModel from "../../../../../../../models/redis.model.js";
import Logger from "../../../../../../../helpers/logger.js";
import colors from "colors";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";
import { resolveSessionByUcp } from "../../../../../../../helpers/resolveSessionByUcp.js";

const service = ConfiguracionService.getInstance();
const redisModel = RedisModel.getInstance();

export const buscarSaveDocumento = async (req, res) => {
  try {
    //tomamos el parametro
    const { aux3 } = req.params;
    const { session } = req.user;

    //sino tenemos el parametro lo que lanzamos es un error
    if (!aux3) {
      return responseError(200, "Parametro aux3 no proporcionado", 400, res);
    }

    const result = await service.buscarSaveDocumento(aux3, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarDiasPotencia = async (req, res) => {
  try {
    const { ucp } = req.params;
    const { session } = req.user;
    if (!ucp) {
      return responseError(200, "Parametro ucp no proporcionado", 400, res);
    }
    const result = await service.cargarDiasPotencia(ucp, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarVersionSesion = async (req, res) => {
  try {
    const { nombre } = req.params;
    const { session } = req.user;
    if (!nombre) {
      return responseError(200, "Parametro nombre no proporcionado", 400, res);
    }

    const result = await service.buscarVersionSesion(nombre, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarVersionSesion = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.agregarVersionSesion(req.body, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarDatosPronosticoxSesion = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.agregarDatosPronosticoxSesion(session);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarPotenciaDia = async (req, res) => {
  try {
    const { ucp, dia } = req.params;
    const { session } = req.user;

    if (!ucp || !dia) {
      return responseError(
        200,
        "Parametros de ucp y dia no proporcionados",
        400,
        res,
      );
    }

    const result = await service.buscarPotenciaDia(ucp, dia, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPeriodosxUCPDesdeFecha = async (req, res) => {
  try {
    const { ucp, fechaInicio } = req.params;

    // Si viene con JWT usa su session, si no resuelve por ucp
    let session = req.user?.session;

    if (!session) {
      const keys = await redisModel.keys(`mercados*`);

      // keys = ["mercados_4a3442f8...", "mercados_otro..."]
      // necesitas traer el valor de cada key
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

    const result = await service.cargarPeriodosxUCPDesdeFecha(
      ucp,
      fechaInicio,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarVariablesClimaticasxUCPDesdeFecha = async (req, res) => {
  try {
    const { ucp, fechaInicio } = req.params;
    // Si viene con JWT usa su session, si no resuelve por ucp
    let session = req.user?.session;

    if (!session) {
      const keys = await redisModel.keys(`mercados*`);

      // keys = ["mercados_4a3442f8...", "mercados_otro..."]
      // necesitas traer el valor de cada key
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

    if (!ucp || !fechaInicio) {
      return responseError(
        200,
        "Parametros de ucp y fechaInicio no proporcionados",
        400,
        res,
      );
    }

    const result = await service.cargarVariablesClimaticasxUCPDesdeFecha(
      ucp,
      fechaInicio,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPeriodosxUCPxUnaFechaxLimite = async (req, res) => {
  try {
    const { ucp, fechaInicio, limite } = req.params;
    const { session } = req.user;
    if (!ucp || !fechaInicio || !limite) {
      return responseError(
        200,
        "Parametros de ucp, fechaInicio o limite no proporcionados",
        400,
        res,
      );
    }

    const result = await service.cargarPeriodosxUCPxUnaFechaxLimite(
      ucp,
      fechaInicio,
      limite,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarTodosLosDiasPotencia = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.cargarTodosLosDiasPotencia(session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarDiaPotencia = async (req, res) => {
  try {
    const { session } = req.user;
    // asumo que envías los datos en req.body
    const {
      codigo,
      dia,
      potencia1,
      potencia2,
      potencia3,
      potencia4,
      potencia5,
      potencia6,
      potencia7,
      ucp,
    } = req.body;

    const result = await service.actualizarDiaPotencia(
      {
        codigo,
        dia,
        potencia1,
        potencia2,
        potencia3,
        potencia4,
        potencia5,
        potencia6,
        potencia7,
        ucp,
      },
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const crearDiaPotencia = async (req, res) => {
  try {
    const { session } = req.user;
    // Asumimos que el body ya pasó por validación Joi
    const {
      dia,
      potencia1,
      potencia2,
      potencia3,
      potencia4,
      potencia5,
      potencia6,
      potencia7,
      ucp,
    } = req.body;

    const payload = {
      dia: Number(dia),
      potencia1: Number(potencia1),
      potencia2: Number(potencia2),
      potencia3: Number(potencia3),
      potencia4: Number(potencia4),
      potencia5: Number(potencia5),
      potencia6: Number(potencia6),
      potencia7: Number(potencia7),
      ucp,
    };

    const result = await service.crearDiaPotencia(payload, session);

    if (!result.success) {
      return responseError(200, result.message, 400, res);
    }

    // devolver el objeto creado
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
// AGREGAR FUENTES
export const agregarUCPMedida = async (req, res) => {
  const { session } = req.user;
  try {
    // Obtener campos del body (asumimos middleware Joi los validó)
    const {
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    } = req.body;

    const payload = {
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    };

    const result = await service.agregarUCPMedida(payload, session);

    if (!result.success) {
      // 400 bad request semántico, mantengo tu patrón de responseError (ajusta códigos si lo deseas)
      return responseError(200, result.message, 400, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};
// CARGAR FUENTES
export const cargarFuentes = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.cargarFuentes(session);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }
    // Devuelve array en data
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarUCPMedida = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    } = req.body;
    const { session } = req.user;
    const payload = {
      codigo,
      nombre,
      factor,
      codigo_rpm,
      codpadre,
      estado,
      aux,
      aux2,
      aux3,
      aux4,
    };

    const result = await service.actualizarUCPMedida(payload, session);

    if (!result.success) {
      return responseError(200, result.message, 400, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const eliminarUCPMedida = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { session } = req.user;
    const codeNum = Number(codigo);
    if (Number.isNaN(codeNum)) {
      return responseError(200, "Código inválido", 400, res);
    }

    const result = await service.eliminarUCPMedida(codeNum, session);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarEquivalencias = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.cargarEquivalencias(session);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const cargarUCP = async (req, res) => {
  try {
    const { session } = req.user;
    const { codpadre = 0, estado = 1 } = req.query;
    const result = await service.cargarUCP(
      Number(codpadre),
      Number(estado),
      session,
    );
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error cargarUCP controller"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const editarMercadoCascade = async (req, res) => {
  try {
    const { session } = req.user;
    const { mc, mcnuevo } = req.body;
    const result = await service.editarMercadoCascade(mc, mcnuevo, session);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error editarMercadoCascade controller"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const cargarUmbral = async (req, res) => {
  try {
    const { session } = req.user;
    const codpadre = Number(req.query.codpadre ?? 79);
    const estado = Number(req.query.estado ?? 1);
    const result = await service.cargarUmbral(codpadre, estado, session);
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.message });
    }
    // mantenemos convención response.data.data en frontend: devolvemos en data
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller cargarUmbral"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const editarUmbral = async (req, res) => {
  try {
    const { codigo, aux2 } = req.body;
    const { session } = req.user;
    const result = await service.editarUmbral(Number(codigo), aux2, session);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller editarUmbral"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const cargarDiasFestivos = async (req, res) => {
  try {
    const { session } = req.user;
    const anio = Number(req.query.anio);
    const ucp = req.query.ucp;
    const result = await service.cargarDiasFestivos(anio, ucp, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller cargarDiasFestivos"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarDiaFestivo = async (req, res) => {
  try {
    const { fecha, ucp } = req.body;
    const { session } = req.user;
    const result = await service.buscarDiaFestivo(fecha, ucp, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller buscarDiaFestivo"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const listarFestivosPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, ucp } = req.params;
    // Si viene con JWT usa su session, si no resuelve por ucp
    let session = req.user?.session;

    if (!session) {
      const keys = await redisModel.keys(`mercados*`);

      // keys = ["mercados_4a3442f8...", "mercados_otro..."]
      // necesitas traer el valor de cada key
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
    const result = await service.listarFestivosPorRango(
      fechaInicio,
      fechaFin,
      ucp,
      session,
    );

    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    Logger.error(colors.red("Error controller listarFestivosPorRango"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const ingresarDiaFestivos = async (req, res) => {
  try {
    const { ucp, fecha } = req.body;
    const { session } = req.user;
    const result = await service.ingresarDiaFestivos(ucp, fecha, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller ingresarDiaFestivos"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const borrarDiaFestivos = async (req, res) => {
  try {
    const { codigo } = req.body;
    const { session } = req.user;
    const result = await service.borrarDiaFestivos(codigo, session);
    if (!result.success)
      return res.status(400).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller borrarDiaFestivos"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarUltimaFechaHistorica = async (req, res) => {
  try {
    const { ucp } = req.params;
    const { session } = req.user;
    const result = await service.buscarUltimaFechaHistorica(ucp, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(
      colors.red("Error controller buscarUltimaFechaHistorica"),
      err,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarUltimaFechaClimaLog = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.buscarUltimaFechaClimaLog(session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller buscarUltimaFechaClimaLog"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarKey = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.buscarKey(session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller buscarKey"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const buscarUltimaFechaClima = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.buscarUltimaFechaClima(session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller buscarUltimaFechaClima"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarFactor = async (req, res) => {
  try {
    const { session } = req.user;
    const { codigo } = req.query;
    const result = await service.buscarFactor(codigo, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller buscarFactor"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const cargarCodigoRMPxUCP = async (req, res) => {
  try {
    const { session } = req.user;
    const { codpadre } = req.query;
    const result = await service.cargarCodigoRMPxUCP(codpadre, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller cargarCodigoRMPxUCP"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const cargarTipoArchivos = async (req, res) => {
  try {
    const { estado, aux2 } = req.query;
    const { session } = req.user;
    const result = await service.cargarTipoArchivos(estado, aux2, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller cargarTipoArchivos"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const cargarUCPxAux2 = async (req, res) => {
  try {
    const { aux2 } = req.query;
    const { session } = req.user;
    const result = await service.cargarUCPxAux2(aux2, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller cargarUCPxAux2"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const buscarUCPActualizacionDatos = async (req, res) => {
  try {
    const { ucp, fecha } = req.params;
    const { session } = req.user;
    const result = await service.buscarUCPActualizacionDatos(
      ucp,
      fecha,
      session,
    );
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(
      colors.red("Error controller buscarUCPActualizacionDatos"),
      err,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const verificarExisteActualizacionDatos = async (req, res) => {
  try {
    const { ucp, fecha } = req.params;
    const { session } = req.user;
    const result = await service.verificarExisteActualizacionDatos(
      ucp,
      fecha,
      session,
    );
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(
      colors.red("Error controller verificarExisteActualizacionDatos"),
      err,
    );
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const agregarUCPActualizacionDatos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.agregarUCPActualizacionDatos(
      req.body,
      session,
    );
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarUCPActualizacionDatos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.actualizarUCPActualizacionDatos(
      req.body,
      session,
    );
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarClimaPeriodos = async (req, res) => {
  const { ucp, fecha } = req.params;
  const { session } = req.user;
  try {
    const result = await service.buscarClimaPeriodos(ucp, fecha, session);
    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarClimaPronosticoLog = async (req, res) => {
  const { fecha, ucp } = req.params;
  const { session } = req.user;
  try {
    const result = await service.agregarClimaPronosticoLog(fecha, ucp, session);
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const agregarClimaPeriodo = async (req, res) => {
  const { fecha, ucp, indice, clima } = req.params;
  const { valor } = req.body; // valor lo enviamos en body por ser potencialmente largo
  const { session } = req.user;
  try {
    const result = await service.agregarClimaPeriodo(
      fecha,
      ucp,
      indice,
      clima,
      valor,
      session,
    );
    if (!result.success) return responseError(200, result.message, 400, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const actualizarClimaPeriodos = async (req, res) => {
  const { fecha, ucp, indice, clima } = req.params;
  const { valor } = req.body;
  const { session } = req.user;
  try {
    const result = await service.actualizarClimaPeriodos(
      fecha,
      ucp,
      indice,
      clima,
      valor,
      session,
    );
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const buscarTipicidad = async (req, res) => {
  const { ucp, fecha } = req.params;
  const { session } = req.user;
  try {
    const result = await service.buscarTipicidad(ucp, fecha, session);
    if (!result.success) return responseError(200, result.message, 404, res);
    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listarTipoModeloPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, ucp } = req.params;
    const { session } = req.user;

    const result = await service.listarTipoModeloPorRango(
      fechaInicio,
      fechaFin,
      ucp,
      session,
    );

    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    Logger.error(colors.red("Error controller listarTipoModeloPorRango"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const insertarTipoPronostico = async (req, res) => {
  try {
    const { ucp, fecha, tipopronostico } = req.body;
    const { session } = req.user;
    const result = await service.insertarTipoPronostico(
      ucp,
      fecha,
      tipopronostico,
      session,
    );

    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });

    return res.status(201).json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (err) {
    Logger.error(colors.red("Error controller insertarTipoPronostico"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const cargarPeriodosDinamico = async (req, res) => {
  try {
    const { session } = req.user;
    const filters = req.body;

    const result = await service.cargarPeriodosDinamico(filters, session);

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarHistoricosPronosticosDinamico = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.cargarHistoricosPronosticosDinamico(
      req.body,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const cargarPronosticosEHistoricos = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.cargarPronosticosEHistoricos(
      req.body,
      session,
    );

    if (!result.success) {
      return responseError(200, result.message, 404, res);
    }

    return SuccessResponse(res, result.data, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(err);
  }
};

export const listarTodosLosFestivos = async (req, res) => {
  try {
    const { session } = req.user;
    const { ucp } = req.params;
    const result = await service.listarTodosLosFestivos(ucp, session);
    if (!result.success)
      return res.status(500).json({ success: false, message: result.message });
    return res
      .status(200)
      .json({ success: true, data: result.data, message: result.message });
  } catch (err) {
    Logger.error(colors.red("Error controller listarTodosLosFestivos"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
