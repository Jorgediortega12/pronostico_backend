import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/cubrimiento.query.js";

export default class CubrimientoModel {
  static instance;
  static getInstance() {
    if (!CubrimientoModel.instance) {
      CubrimientoModel.instance = new CubrimientoModel();
    }
    return CubrimientoModel.instance;
  }

  #db = (session) => createConectionPG(session);

  #tablasListas = new Set();

  ensureTables = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureCubrimientoTables);
    this.#tablasListas.add(key);
  };

  // ─── Contratos ───────────────────────────────────────────────────────────────

  getContratoById = async (session, id) => {
    const { rows } = await this.#db(session).query(q.getContratoById, [id]);
    return rows[0] || null;
  };

  getContratosByAnio = async (session, anio) => {
    const { rows } = await this.#db(session).query(q.getContratosByAnio, [anio]);
    return rows;
  };

  getContratoBySicAnio = async (session, codigoSic, anio) => {
    const { rows } = await this.#db(session).query(q.getContratoBySicAnio, [codigoSic, anio]);
    return rows[0] || null;
  };

  getAniosContratos = async (session) => {
    const { rows } = await this.#db(session).query(q.getAniosContratos);
    return rows.map((r) => r.anio);
  };

  insertContrato = async (session, nombre, datos, codigoSic, anio) => {
    const { rows } = await this.#db(session).query(q.insertContrato, [nombre, datos, codigoSic, anio]);
    return rows[0];
  };

  updateContrato = async (session, id, nombre, datos) => {
    await this.#db(session).query(q.updateContrato, [nombre, datos, id]);
  };

  // ─── Porcentaje de cubrimiento ───────────────────────────────────────────────

  getPorcentajeByAnio = async (session, anio) => {
    const { rows } = await this.#db(session).query(q.getPorcentajeByAnio, [anio]);
    return rows;
  };

  savePorcentaje = async (session, anio, valores) => {
    const client = this.#db(session);
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query(q.deletePorcentajeByAnio, [anio]);
      for (let mes = 1; mes <= valores.length; mes++) {
        await client.query(q.insertPorcentaje, [anio, mes, valores[mes - 1]]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      await client.end();
    }
  };

  insertVersion = async (session, { userId, nombre, anio, payload }) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredCubrimientoVersions);
    const { rows: nextRows } = await db.query(q.getNextCubrimientoVersion, [userId ?? null]);
    const version = nextRows[0].next;
    const { rows } = await db.query(q.insertCubrimientoVersion, [
      version, userId ?? null, null, nombre ?? null, anio ?? null,
      payload ? JSON.stringify(payload) : null,
    ]);
    return { id: rows[0].id, version: rows[0].version, created_at: rows[0].created_at };
  };

  listVersions = async (session, userId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredCubrimientoVersions);
    const { rows } = await db.query(q.listCubrimientoVersions, [userId]);
    return rows;
  };

  getVersionById = async (session, versionId) => {
    await this.ensureTables(session);
    const db = this.#db(session);
    await db.query(q.deleteExpiredCubrimientoVersions);
    const { rows } = await db.query(q.getCubrimientoVersionById, [versionId]);
    return rows[0] || null;
  };
}
