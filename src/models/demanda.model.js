import { createConectionPG } from "../helpers/connections.js";
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

  #db = (session) => createConectionPG(session);

  #versionTablesListas = new Set();

  ensureVersionTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#versionTablesListas.has(key)) return;
    await this.#db(session).query(q.ensureVersionTables);
    this.#versionTablesListas.add(key);
  };

  // ─── Monthly Demand ─────────────────────────────────────────────────────────

  getMonthlyDemand = async (session) => {
    const { rows } = await this.#db(session).query(q.getMonthlyDemand);
    return rows;
  };

  getMonthlyDemandByYear = async (session, year) => {
    const { rows } = await this.#db(session).query(q.getMonthlyDemandByYear, [year]);
    return rows;
  };

  updateMonthlyClimateType = async (session, year, month, climateType) => {
    await this.#db(session).query(q.updateMonthlyClimateType, [climateType, year, month]);
  };

  getMonthlyDemandBeforeDate = async (session, year, month) => {
    const { rows } = await this.#db(session).query(q.getMonthlyDemandBeforeDate, [year, month]);
    return rows;
  };

  getMonthlyStats = async (session, year, month) => {
    const { rows } = await this.#db(session).query(q.getMonthlyStats, [year, month]);
    return rows[0];
  };

  getMonthlyValueForMonth = async (session, year, month) => {
    const { rows } = await this.#db(session).query(q.getMonthlyValueForMonth, [year, month]);
    return rows[0] || null;
  };

  // ─── Yearly Demand ──────────────────────────────────────────────────────────

  getYearlyDemands = async (session) => {
    const { rows } = await this.#db(session).query(q.getYearlyDemands);
    return rows;
  };

  getLastDateFromDemands = async (session) => {
    const { rows } = await this.#db(session).query(q.getLastDateFromDemands);
    return rows[0];
  };

  getHistoricYears = async (session) => {
    const { rows } = await this.#db(session).query(q.getHistoricYears);
    return rows.map((r) => r.year);
  };

  // ─── Type Year ──────────────────────────────────────────────────────────────

  insertTypeYears = async (session, years, userId, sessionId) => {
    const client = this.#db(session);
    await client.connect();
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
      await client.end();
    }
  };

  updateTypeYears = async (session, years, types, userId, sessionId) => {
    const client = this.#db(session);
    await client.connect();
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
      await client.end();
    }
  };

  getTypeYearList = async (session, userId, sessionId) => {
    const { rows } = await this.#db(session).query(q.getTypeYearList, [userId, sessionId]);
    return rows;
  };

  getAllYearsFromYearlyDemand = async (session) => {
    const { rows } = await this.#db(session).query(q.getAllYearsFromYearlyDemand);
    return rows.map((r) => r.year);
  };

  // ─── Users Models ────────────────────────────────────────────────────────────

  createUserModel = async (session, modelName, userId, sessionId, startDate, endDate) => {
    const { rows } = await this.#db(session).query(q.createUserModel, [
      modelName,
      userId,
      sessionId,
      startDate,
      endDate,
    ]);
    return rows[0];
  };

  getUserModels = async (session, userId, sessionId) => {
    const { rows } = await this.#db(session).query(q.getUserModels, [userId, sessionId]);
    return rows;
  };

  getUserModelsByUser = async (session, userId) => {
    const { rows } = await this.#db(session).query(q.getUserModelsByUser, [userId]);
    return rows;
  };

  getAllModels = async (session) => {
    const { rows } = await this.#db(session).query(q.getAllModels);
    return rows;
  };

  getUserModelById = async (session, modelId) => {
    const { rows } = await this.#db(session).query(q.getUserModelById, [modelId]);
    return rows[0] || null;
  };

  // ─── Users Models Values ────────────────────────────────────────────────────

  saveModelValues = async (session, modelId, dates, values) => {
    const client = this.#db(session);
    await client.connect();
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
      await client.end();
    }
  };

  getModelValues = async (session, modelId) => {
    const { rows } = await this.#db(session).query(q.getModelValues, [modelId]);
    return rows;
  };

  getModelValuesByYear = async (session, modelId, year) => {
    const { rows } = await this.#db(session).query(q.getModelValuesByYear, [modelId, year]);
    return rows;
  };

  updateModelValueClimateAndValue = async (session, modelId, date, value, climateType) => {
    await this.#db(session).query(q.updateModelValueClimateAndValue, [value, climateType, modelId, date]);
  };

  checkModelExists = async (session, modelId) => {
    const { rows } = await this.#db(session).query(q.checkModelExists, [modelId]);
    return rows.length > 0;
  };

  // ─── Versiones permanentes ────────────────────────────────────────────────────

  insertVersion = async (session, { modelId, userId, sessionId, nombre, startDate, endDate, observacion }, dates, values, climateTypes) => {
    await this.ensureVersionTables(session);
    const client = this.#db(session);
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query(q.deleteExpiredVersions);
      const { rows: nextRows } = await client.query(q.getNextVersion, [userId ?? null]);
      const version = nextRows[0].next;
      const { rows: verRows } = await client.query(q.insertVersion, [
        modelId, version, userId ?? null, sessionId ?? null,
        nombre ?? null, startDate ?? null, endDate ?? null, observacion ?? null,
      ]);
      const versionId = verRows[0].id;
      for (let i = 0; i < dates.length; i++) {
        await client.query(q.insertVersionValue, [
          versionId, dates[i], values[i], climateTypes?.[i] ?? "NORMAL",
        ]);
      }
      await client.query("COMMIT");
      return { id: versionId, version, created_at: verRows[0].created_at };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      await client.end();
    }
  };

  listVersionsBySession = async (session, userId) => {
    await this.ensureVersionTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredVersions);
    const { rows } = await db.query(q.listVersionsBySession, [userId]);
    return rows;
  };

  getVersionById = async (session, versionId) => {
    await this.ensureVersionTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredVersions);
    const { rows } = await db.query(q.getVersionById, [versionId]);
    return rows[0] || null;
  };

  getVersionValues = async (session, versionId) => {
    await this.ensureVersionTables(session);
    const { rows } = await this.#db(session).query(q.getVersionValues, [versionId]);
    return rows;
  };
}
