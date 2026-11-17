import { createConectionPG } from "../helpers/connections.js";
import * as q from "../querys/configuracion_general.query.js";

export default class ConfiguracionGeneralModel {
  static instance;
  static getInstance() {
    if (!ConfiguracionGeneralModel.instance) {
      ConfiguracionGeneralModel.instance = new ConfiguracionGeneralModel();
    }
    return ConfiguracionGeneralModel.instance;
  }

  #db = (session) => createConectionPG(session);
  #tablasListas = new Set();

  #ensureTable = async (session) => {
    const key = `${session.host}:${session.basededatos}`;
    if (this.#tablasListas.has(key)) return;
    await this.#db(session).query(q.ensureConfiguracionGeneralTable);
    this.#tablasListas.add(key);
  };

  obtenerValor = async (session, clave) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.obtenerValor, [clave]);
    return rows[0]?.valor ?? null;
  };

  guardarValor = async (session, clave, valor) => {
    await this.#ensureTable(session);
    const { rows } = await this.#db(session).query(q.guardarValor, [
      clave,
      String(valor),
    ]);
    return rows[0] ?? null;
  };
}
