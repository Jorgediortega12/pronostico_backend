import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/auditoria.query.js";

export default class AuditoriaModel {
  static instance;
  static getInstance() {
    if (!AuditoriaModel.instance) {
      AuditoriaModel.instance = new AuditoriaModel();
    }
    return AuditoriaModel.instance;
  }

  #db = (session) => createConectionPG(session);
  #tablasListas = new Set();

  #ensureTable = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureAuditoriaTable);
    this.#tablasListas.add(key);
  };

  registrar = async (session, { usuario, modulo, accion, status }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.insertAuditoria, [
      usuario,
      modulo,
      accion,
      status ?? null,
    ]);
    return rows[0];
  };

  listar = async (session, { fechaInicio, fechaFin, usuario, modulo, limit, offset }) => {
    await this.#ensureTable(session);
    const db = this.#db(session);
    const [{ rows }, { rows: countRows }] = await Promise.all([
      db.query(q.getAuditoria, [
        fechaInicio ?? null,
        fechaFin ?? null,
        usuario || null,
        modulo || null,
        limit,
        offset,
      ]),
      db.query(q.countAuditoria, [
        fechaInicio ?? null,
        fechaFin ?? null,
        usuario || null,
        modulo || null,
      ]),
    ]);
    return { rows, total: parseInt(countRows[0].total, 10) };
  };
}
