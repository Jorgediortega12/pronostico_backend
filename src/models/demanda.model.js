import gmrPool from "../config/database.js";
import * as q from "../querys/demanda.query.js";
import Logger from "../helpers/logger.js";

export default class DemandaModel {
  static instance;
  static getInstance() {
    if (!DemandaModel.instance) {
      DemandaModel.instance = new DemandaModel();
    }
    return DemandaModel.instance;
  }

  // ─── Monthly Demand ─────────────────────────────────────────────────────────

  getMonthlyDemand = async () => {
    const { rows } = await gmrPool.query(q.getMonthlyDemand);
    return rows;
  };

  getMonthlyDemandByYear = async (year) => {
    const { rows } = await gmrPool.query(q.getMonthlyDemandByYear, [year]);
    return rows;
  };

  updateMonthlyClimateType = async (year, month, climateType) => {
    await gmrPool.query(q.updateMonthlyClimateType, [climateType, year, month]);
  };

  getMonthlyDemandBeforeDate = async (year, month) => {
    const { rows } = await gmrPool.query(q.getMonthlyDemandBeforeDate, [year, month]);
    return rows;
  };

  getMonthlyStats = async (year, month) => {
    const { rows } = await gmrPool.query(q.getMonthlyStats, [year, month]);
    return rows[0];
  };

  getMonthlyValueForMonth = async (year, month) => {
    const { rows } = await gmrPool.query(q.getMonthlyValueForMonth, [year, month]);
    return rows[0] || null;
  };

  // ─── Yearly Demand ──────────────────────────────────────────────────────────

  getYearlyDemands = async () => {
    const { rows } = await gmrPool.query(q.getYearlyDemands);
    return rows;
  };

  getLastDateFromDemands = async () => {
    const { rows } = await gmrPool.query(q.getLastDateFromDemands);
    return rows[0];
  };

  getHistoricYears = async () => {
    const { rows } = await gmrPool.query(q.getHistoricYears);
    return rows.map((r) => r.year);
  };

  // ─── Type Year ──────────────────────────────────────────────────────────────

  insertTypeYears = async (years, userId, sessionId) => {
    const client = await gmrPool.connect();
    try {
      await client.query("BEGIN");
      for (const year of years) {
        await client.query(q.insertTypeYear, [year, "TIPICO", userId, sessionId]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

  updateTypeYears = async (years, types, userId, sessionId) => {
    const client = await gmrPool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < years.length; i++) {
        await client.query(q.updateTypeYear, [types[i], years[i], userId, sessionId]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

  getTypeYearList = async (userId, sessionId) => {
    const { rows } = await gmrPool.query(q.getTypeYearList, [userId, sessionId]);
    return rows;
  };

  getAllYearsFromYearlyDemand = async () => {
    const { rows } = await gmrPool.query(q.getAllYearsFromYearlyDemand);
    return rows.map((r) => r.year);
  };

  // ─── Users Models ────────────────────────────────────────────────────────────

  createUserModel = async (modelName, userId, sessionId, startDate, endDate) => {
    const { rows } = await gmrPool.query(q.createUserModel, [
      modelName,
      userId,
      sessionId,
      startDate,
      endDate,
    ]);
    return rows[0];
  };

  getUserModels = async (userId, sessionId) => {
    const { rows } = await gmrPool.query(q.getUserModels, [userId, sessionId]);
    return rows;
  };

  getAllModels = async () => {
    const { rows } = await gmrPool.query(q.getAllModels);
    return rows;
  };

  getUserModelById = async (modelId) => {
    const { rows } = await gmrPool.query(q.getUserModelById, [modelId]);
    return rows[0] || null;
  };

  // ─── Users Models Values ────────────────────────────────────────────────────

  saveModelValues = async (modelId, dates, values) => {
    const client = await gmrPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(q.deleteModelValues, [modelId]);
      for (let i = 0; i < dates.length; i++) {
        await client.query(q.insertModelValue, [modelId, dates[i], values[i], "NORMAL"]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

  getModelValues = async (modelId) => {
    const { rows } = await gmrPool.query(q.getModelValues, [modelId]);
    return rows;
  };

  getModelValuesByYear = async (modelId, year) => {
    const { rows } = await gmrPool.query(q.getModelValuesByYear, [modelId, year]);
    return rows;
  };

  updateModelValueClimateAndValue = async (modelId, date, value, climateType) => {
    await gmrPool.query(q.updateModelValueClimateAndValue, [value, climateType, modelId, date]);
  };

  checkModelExists = async (modelId) => {
    const { rows } = await gmrPool.query(q.checkModelExists, [modelId]);
    return rows.length > 0;
  };
}