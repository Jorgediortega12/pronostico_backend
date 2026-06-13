import Logger from "../../../../../../../helpers/logger.js";
import { SuccessResponse, InternalError, responseError } from "../../../../../../../helpers/api.response.js";
import {
  DemandService,
  MacroeconomicService,
  ClimateService,
  CorrelationService,
  GridAnalysisService,
} from "../../../../../../../services/analysis.datos.services.js";
import AnalysisModel from "../../../../../../../models/analysis.model.js";

const versionsModel = AnalysisModel.getInstance();

// Los servicios se instancian por request con la sesión del usuario (req.user.session)
// para resolver la conexión a la BD del cliente dinámicamente.

// ── Demanda
export const getDemands = async (req, res) => {
  try {
    const data = await new DemandService(req.user.session).getDemands(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDemandDates = async (req, res) => {
  try {
    const data = await new DemandService(req.user.session).getFirstAndLastDate();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDemandDatesV2 = async (req, res) => {
  try {
    const data = await new DemandService(req.user.session).getFirstAndLastDemandDate();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Macroeconómicas
export const getAllEconomics = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).getAllVariables(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicsIds = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).getEconomicsIds();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicsDates = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).getFirstAndLastDateOfEachVariable();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await new MacroeconomicService(req.user.session).getVariable(id);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const variableVsDemand = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).variableVsDemand(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const insertEconomics = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).insertOrUpdateVariable(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const deleteEconomics = async (req, res) => {
  try {
    const data = await new MacroeconomicService(req.user.session).deleteColumnValues(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Clima
export const getClimateHour = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateHour(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateDay = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateDay(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateMonth = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateMonth(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateYear = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateYear(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateDayAllTypes = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateDayAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateMonthAllTypes = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateMonthAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateYearAllTypes = async (req, res) => {
  try {
    const data = await new ClimateService(req.user.session).getClimateYearAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Correlación
export const getCorrelation = async (req, res) => {
  try {
    const data = await new CorrelationService(req.user.session).getCorrelationMatrix(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Grilla / Días
export const getGridInfo = async (req, res) => {
  try {
    const data = await new GridAnalysisService(req.user.session).getGridInfo(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDaysTypes = async (req, res) => {
  try {
    const data = await new GridAnalysisService(req.user.session).getDays(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
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
    const { nombre, payload } = req.body;
    const result = await versionsModel.insertVersion(session, {
      userId,
      nombre,
      payload,
    });
    return SuccessResponse(res, { message: "Versión guardada exitosamente", version_id: result.id, version: result.version });
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const listVersions = async (req, res) => {
  try {
    const { session, userId } = req.user;
    const rows = await versionsModel.listVersions(session, userId);
    return SuccessResponse(res, rows);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const loadVersion = async (req, res) => {
  try {
    const { session } = req.user;
    const versionId = parseInt(req.params.version_id, 10);
    const data = await versionsModel.getVersionById(session, versionId);
    if (!data) return InternalError(res, "La versión especificada no existe");
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};
