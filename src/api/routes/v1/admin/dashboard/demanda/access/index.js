import DemandaService from "../../../../../../../services/demanda.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import {
  SuccessResponse,
  InternalError,
  responseError,
} from "../../../../../../../helpers/api.response.js";

const service = DemandaService.getInstance();

// ─── Predict (proxy ML) ───────────────────────────────────────────────────────

export const predict = async (req, res) => {
  try {
    const result = await service.predict(req.body);
    if (!result.success) {
      Logger.error(`[predict] ML error: ${JSON.stringify(result)}`);
      return responseError(200, result.message, 422, res);
    }
    return SuccessResponse(res, result.data, "Predicción generada correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const predictExcel = async (req, res) => {
  try {
    const result = await service.predictExcel(req.body);
    if (!result.success) return responseError(200, result.message, 422, res);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Prediccion_Caribe_Mar.xlsx"');
    return res.send(Buffer.from(result.buffer));
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── Day Behavior (proxy ML) ─────────────────────────────────────────────────

export const dayBehavior = async (req, res) => {
  try {
    const result = await service.dayBehavior(req.body);
    if (!result.success) return responseError(200, result.message, 422, res);
    return SuccessResponse(res, result.data, "Comportamiento diario generado correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const dayBehaviorExcel = async (req, res) => {
  try {
    const result = await service.dayBehaviorExcel(req.body);
    if (!result.success) return responseError(200, result.message, 422, res);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Comportamiento_Diario_${Date.now()}.xlsx"`
    );
    return res.send(Buffer.from(result.buffer));
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── Monthly Demand ──────────────────────────────────────────────────────────

export const getMonthlyDemand = async (req, res) => {
  try {
    const data = await service.getMonthlyDemand();
    return SuccessResponse(res, data, "Demanda mensual obtenida correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const getMonthlyDemandByYear = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const data = await service.getMonthlyDemandByYear(year);
    return SuccessResponse(res, data, "Demanda mensual por año obtenida correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const updateMonthlyType = async (req, res) => {
  try {
    const result = await service.updateMonthlyType(req.body.values);
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── Monthly Info ────────────────────────────────────────────────────────────

export const monthlyInfo = async (req, res) => {
  try {
    const { year, month, predicition } = req.body;
    const data = await service.getMonthlyInfo(year, month, predicition ?? null);
    return SuccessResponse(res, data, "Información mensual obtenida correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── Yearly ──────────────────────────────────────────────────────────────────

export const getLastYear = async (req, res) => {
  try {
    const data = await service.getLastYear();
    return SuccessResponse(res, data, "Último año obtenido correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const listHistoricYears = async (req, res) => {
  try {
    const data = await service.listHistoricYears();
    return SuccessResponse(res, data, "Años históricos obtenidos correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── Type Year ───────────────────────────────────────────────────────────────

export const createTypeYearList = async (req, res) => {
  try {
    const { user_id, session_id } = req.body;
    const result = await service.createTypeYearList(user_id, session_id);
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const updateTypeYearList = async (req, res) => {
  try {
    const { user_id, session_id, year, type } = req.body;
    const result = await service.updateTypeYearList(user_id, session_id, year, type);
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const getTypeYearList = async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);
    const session_id = parseInt(req.params.session_id);
    const data = await service.getTypeYearList(user_id, session_id);
    return SuccessResponse(res, data, "Lista de tipos de año obtenida correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

// ─── User Models ─────────────────────────────────────────────────────────────

export const createModel = async (req, res) => {
  try {
    const { model_name, user_id, session_id, start_date, end_date } = req.body;
    const result = await service.createNewModel(model_name, user_id, session_id, start_date, end_date);
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const getUserModels = async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);
    const session_id = parseInt(req.params.session_id);
    const isAdmin = String(req.user?.data?.codperfil) === "1";
    const data = await service.listUserModels(user_id, session_id, isAdmin);
    return SuccessResponse(res, data, "Modelos obtenidos correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const saveModelValues = async (req, res) => {
  try {
    const { model_id, user_id, session_id, dates, values } = req.body;
    const result = await service.saveModelValues(user_id, session_id, model_id, dates, values);
    return SuccessResponse(res, result, result.message);
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const getModelValues = async (req, res) => {
  try {
    const model_id = parseInt(req.params.model_id);
    const data = await service.retrieveModelValues(model_id);
    return SuccessResponse(res, data, "Valores del modelo obtenidos correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const changeModelType = async (req, res) => {
  try {
    const { model_id, dates, types } = req.body;
    const data = await service.changeModelMonthlyType(model_id, dates, types);
    return SuccessResponse(res, data, "Tipo climático actualizado correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};

export const saveModelByYear = async (req, res) => {
  try {
    const { model_id, year, predict_year } = req.body;
    const data = await service.changeModelBasedOnYear(model_id, year, predict_year);
    return SuccessResponse(res, data, "Modelo actualizado por año correctamente");
  } catch (err) {
    Logger.error(err);
    return InternalError(res);
  }
};