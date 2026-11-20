import colors from "colors";
import Logger from "../helpers/logger.js";
import * as querys from "../querys/ajustes.query.js";

// Acceso de SOLO LECTURA a la BD del mercado para la Mesa de ajustes.
// Cada método recibe un `client` de createConectionPG(session) y no loguea datos de curvas.
export default class AjustesModel {
  static instance;

  static getInstance() {
    if (!AjustesModel.instance) AjustesModel.instance = new AjustesModel();
    return AjustesModel.instance;
  }

  async #consultar(nombre, client, sql, valores) {
    try {
      await client.connect();
      const r = await client.query(sql, valores);
      return r.rows;
    } catch (error) {
      Logger.error(colors.red(`Error AjustesModel ${nombre}`));
      throw error;
    } finally {
      await client.end();
    }
  }

  sesionEmitida = async ({ ucp, desde, hasta }, client) =>
    (await this.#consultar("sesionEmitida", client, querys.sesionEmitida, [ucp, desde, hasta]))[0] ?? null;

  periodosSesion = (codsesion, desde, hasta, client) =>
    this.#consultar("periodosSesion", client, querys.periodosSesionPM, [codsesion, desde, hasta]);

  ultimoRealHasta = async (ucp, fecha, client) =>
    (await this.#consultar("ultimoRealHasta", client, querys.ultimoRealHasta, [ucp, fecha]))[0]?.fecha ??
    null;

  reales = (ucp, desde, hasta, client) =>
    this.#consultar("reales", client, querys.reales, [ucp, desde, hasta]);

  nombreUsuario = async (userId, client) => {
    const fila = (await this.#consultar("nombreUsuario", client, querys.nombreUsuario, [userId]))[0];
    return fila ? fila.nombre || fila.usuario || null : null;
  };
}
