import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/demand_split_config.query.js";

export default class DemandSplitConfigModel {
  static instance;
  static getInstance() {
    if (!DemandSplitConfigModel.instance) {
      DemandSplitConfigModel.instance = new DemandSplitConfigModel();
    }
    return DemandSplitConfigModel.instance;
  }

  #db = (session) => createConectionPG(session);
  // La tabla se asegura una sola vez por proceso y base de datos.
  #tablasListas = new Set();

  #ensureTable = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    const db = this.#db(session);
    await db.query(q.ensureDemandSplitConfigTable);
    await db.query(q.crearConfigPorDefecto);
    this.#tablasListas.add(key);
  };

  obtener = async (session) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerConfig);
    return rows[0] ?? null;
  };

  actualizar = async (session, { fecha_limite, porcentaje }) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.actualizarConfig, [
      fecha_limite,
      porcentaje,
    ]);
    return rows[0] ?? null;
  };
}
