import MpmService from "../../../../../../../services/mpm.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = MpmService.getInstance();

export const verifyDocuments = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.verifyDocuments(session);
    if (!result.success) {
      Logger.error(`[verifyDocuments] ML error: ${result.message}`);
      return responseError(200, result.message, result.statusCode || 422, res);
    }
    return SuccessResponse(res, result.data, "Documentos verificados correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const getDemand = async (req, res) => {
  try {
    const { session } = req.user;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const previousDays = parseInt(req.params.previous_days, 10);
    const result = await service.getDemand(session, year, month, previousDays);
    if (!result.success) {
      Logger.error(`[getDemand] ML error: ${result.message}`);
      return responseError(200, result.message, result.statusCode || 422, res);
    }
    return SuccessResponse(res, result.data, "Demanda obtenida correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const predict = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.predict(session, req.body);
    if (!result.success) {
      Logger.error(`[predict] ML error: ${result.message}`);
      return responseError(200, result.message, result.statusCode || 422, res);
    }
    return SuccessResponse(res, result.data, "Predicción MPM generada correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const predictExcel = async (req, res) => {
  try {
    const { session } = req.user;
    const result = await service.predictExcel(session, req.body);
    if (!result.success) {
      Logger.error(`[predictExcel] ML error: ${result.message}`);
      return responseError(200, result.message, result.statusCode || 422, res);
    }
    const filename = `predicciones_mpm_${String(req.body.last_date).replace(/-/g, "")}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(Buffer.from(result.buffer));
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const saveVersion = async (req, res) => {
  try {
    const { session, userId } = req.user;
    if (userId == null) {
      return responseError(
        200,
        "Sesión sin identificador de usuario. Vuelva a iniciar sesión.",
        401,
        res,
      );
    }
    const result = await service.guardarVersion(session, {
      ...req.body,
      user_id: userId,
    });
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listVersions = async (req, res) => {
  try {
    const { session, userId } = req.user;
    // Las versiones persisten por usuario (no por sesión), para retomarlas luego.
    const data = await service.listVersions(session, userId);
    return SuccessResponse(res, data, "Versiones obtenidas correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const loadVersion = async (req, res) => {
  try {
    const { session } = req.user;
    const versionId = parseInt(req.params.version_id, 10);
    const data = await service.loadVersion(session, versionId);
    return SuccessResponse(res, data, "Versión cargada correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

