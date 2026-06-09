import Logger from "../../../../../../../helpers/logger.js";
import { SuccessResponse, InternalError } from "../../../../../../../helpers/api.response.js";
import {
  DemandService,
  MacroeconomicService,
  ClimateService,
  CorrelationService,
  GridAnalysisService,
} from "../../../../../../../services/analysis.datos.services.js";

const demandSvc      = new DemandService();
const macroSvc       = new MacroeconomicService();
const climateSvc     = new ClimateService();
const correlationSvc = new CorrelationService();
const gridSvc        = new GridAnalysisService();

// ── Demanda 
export const getDemands = async (req, res) => {
  try {
    const data = await demandSvc.getDemands(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDemandDates = async (req, res) => {
  try {
    const data = await demandSvc.getFirstAndLastDate();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDemandDatesV2 = async (req, res) => {
  try {
    const data = await demandSvc.getFirstAndLastDemandDate();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Macroeconómicas 
export const getAllEconomics = async (req, res) => {
  try {
    const data = await macroSvc.getAllVariables(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicsIds = async (req, res) => {
  try {
    const data = await macroSvc.getEconomicsIds();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicsDates = async (req, res) => {
  try {
    const data = await macroSvc.getFirstAndLastDateOfEachVariable();
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getEconomicById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await macroSvc.getVariable(id);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const variableVsDemand = async (req, res) => {
  try {
    const data = await macroSvc.variableVsDemand(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const insertEconomics = async (req, res) => {
  try {
    const data = await macroSvc.insertOrUpdateVariable(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const deleteEconomics = async (req, res) => {
  try {
    const data = await macroSvc.deleteColumnValues(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Clima
export const getClimateHour = async (req, res) => {
  try {
    const data = await climateSvc.getClimateHour(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateDay = async (req, res) => {
  try {
    const data = await climateSvc.getClimateDay(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateMonth = async (req, res) => {
  try {
    const data = await climateSvc.getClimateMonth(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateYear = async (req, res) => {
  try {
    const data = await climateSvc.getClimateYear(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateDayAllTypes = async (req, res) => {
  try {
    const data = await climateSvc.getClimateDayAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateMonthAllTypes = async (req, res) => {
  try {
    const data = await climateSvc.getClimateMonthAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getClimateYearAllTypes = async (req, res) => {
  try {
    const data = await climateSvc.getClimateYearAllTypes(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Correlación
export const getCorrelation = async (req, res) => {
  try {
    const data = await correlationSvc.getCorrelationMatrix(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

// ── Grilla / Días 
export const getGridInfo = async (req, res) => {
  try {
    const data = await gridSvc.getGridInfo(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const getDaysTypes = async (req, res) => {
  try {
    const data = await gridSvc.getDays(req.body);
    return SuccessResponse(res, data);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};