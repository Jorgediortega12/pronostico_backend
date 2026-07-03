import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/mpm.query.js";

export default class MpmModel {
  static instance;
  static getInstance() {
    if (!MpmModel.instance) {
      MpmModel.instance = new MpmModel();
    }
    return MpmModel.instance;
  }

  #db = (session) => createConectionPG(session);

  #tablasListas = new Set();

  ensureTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureMpmTables);
    this.#tablasListas.add(key);
  };

  insertVersion = async (session, { userId, sessionId, nombre, modeloId, tipoArchivo, lastDate, previousDays, payload }) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredMpmVersions);
    const { rows: nextRows } = await db.query(q.getNextMpmVersion, [userId ?? null]);
    const version = nextRows[0].next;
    const { rows } = await db.query(q.insertMpmVersion, [
      version, userId ?? null, sessionId ?? null, nombre ?? null,
      modeloId ?? null, tipoArchivo ?? null, lastDate ?? null, previousDays ?? null,
      payload ? JSON.stringify(payload) : null,
    ]);
    return { id: rows[0].id, version: rows[0].version, created_at: rows[0].created_at };
  };

  listVersions = async (session, userId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredMpmVersions);
    const { rows } = await db.query(q.listMpmVersions, [userId]);
    return rows;
  };

  getVersionById = async (session, versionId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredMpmVersions);
    const { rows } = await db.query(q.getMpmVersionById, [versionId]);
    return rows[0] || null;
  };
}
