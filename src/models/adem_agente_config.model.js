import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/adem_agente_config.query.js";

export default class AdemAgenteConfigModel {
  static instance;
  static getInstance() {
    if (!AdemAgenteConfigModel.instance) {
      AdemAgenteConfigModel.instance = new AdemAgenteConfigModel();
    }
    return AdemAgenteConfigModel.instance;
  }

  #db = (session) => createConectionPG(session);
  // La tabla se asegura una sola vez por proceso y base de datos.
  #tablasListas = new Set();

  #ensureTable = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    const db = this.#db(session);
    await db.query(q.ensureAdemAgenteConfigTable);
    await db.query(q.crearConfigPorDefecto);
    this.#tablasListas.add(key);
  };

  obtener = async (session) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerConfig);
    return rows[0] ?? null;
  };

  /** agente: código del agente (ej. "ATEC") o null para el modo automático. */
  actualizar = async (session, { agente }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.actualizarConfig, [agente]);
    return rows[0] ?? null;
  };
}
