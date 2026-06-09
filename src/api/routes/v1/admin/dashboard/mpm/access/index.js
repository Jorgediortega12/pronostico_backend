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
    const result = await service.verifyDocuments();
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
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const previousDays = parseInt(req.params.previous_days, 10);
    const result = await service.getDemand(year, month, previousDays);
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
    const result = await service.predict(req.body);
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
    const result = await service.predictExcel(req.body);
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