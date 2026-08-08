import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/dna_ido_config.query.js";

export default class DnaIdoConfigModel {
  static instance;
  static getInstance() {
    if (!DnaIdoConfigModel.instance) {
      DnaIdoConfigModel.instance = new DnaIdoConfigModel();
    }
    return DnaIdoConfigModel.instance;
  }

  #db = (session) => createConectionPG(session);
  #tablasListas = new Set();

  #ensureTable = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    const db = this.#db(session);
    await db.query(q.ensureDnaIdoEmpresasTable);
    await db.query(q.ensureDnaIdoConfigTable);
    await db.query(q.migrarEsquemaEmpresaTexto);
    this.#tablasListas.add(key);
  };

  // ── Empresas ────────────────────────────────────────────────────────────
  crearEmpresa = async (session, { nombre }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.crearEmpresa, [nombre]);
    return rows[0] ?? null;
  };

  obtenerEmpresas = async (session) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerEmpresas);
    return rows;
  };

  eliminarEmpresa = async (session, { id }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.eliminarEmpresa, [id]);
    return rows[0] ?? null;
  };

  // ── Config (mc + empresa + municipios) ─────────────────────────────────
  crear = async (session, { mc, empresa_id, municipios }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.crearConfig, [
      mc,
      empresa_id,
      municipios,
    ]);
    return rows[0] ?? null;
  };

  obtenerTodos = async (session) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerConfigs);
    return rows;
  };

  obtenerPorMC = async (session, { mc }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerConfigsPorMC, [
      mc,
    ]);
    return rows;
  };

  actualizar = async (session, { id, mc, empresa_id, municipios }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.actualizarConfig, [
      mc,
      empresa_id,
      municipios,
      id,
    ]);
    return rows[0] ?? null;
  };

  eliminar = async (session, { id }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.eliminarConfig, [id]);
    return rows[0] ?? null;
  };
}
