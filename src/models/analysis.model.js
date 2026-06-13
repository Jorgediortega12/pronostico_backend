import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/analysis.query.js";

export default class AnalysisModel {
  static instance;
  static getInstance() {
    if (!AnalysisModel.instance) {
      AnalysisModel.instance = new AnalysisModel();
    }
    return AnalysisModel.instance;
  }

  #db = (session) => createConectionPG(session);

  #tablasListas = new Set();

  ensureTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureAnalysisTables);
    this.#tablasListas.add(key);
  };

  insertVersion = async (session, { userId, nombre, payload }) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredAnalysisVersions);
    const { rows: nextRows } = await db.query(q.getNextAnalysisVersion, [userId ?? null]);
    const version = nextRows[0].next;
    const { rows } = await db.query(q.insertAnalysisVersion, [
      version, userId ?? null, null, nombre ?? null,
      payload ? JSON.stringify(payload) : null,
    ]);
    return { id: rows[0].id, version: rows[0].version, created_at: rows[0].created_at };
  };

  listVersions = async (session, userId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredAnalysisVersions);
    const { rows } = await db.query(q.listAnalysisVersions, [userId]);
    return rows;
  };

  getVersionById = async (session, versionId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredAnalysisVersions);
    const { rows } = await db.query(q.getAnalysisVersionById, [versionId]);
    return rows[0] || null;
  };
}
