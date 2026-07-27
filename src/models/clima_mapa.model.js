import * as querys from "../querys/clima_mapa.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

export default class ClimaMapaModel {
  static instance;

  static getInstance() {
    if (!ClimaMapaModel.instance) {
      ClimaMapaModel.instance = new ClimaMapaModel();
    }
    return ClimaMapaModel.instance;
  }

  listarPuntosConClima = async (client) => {
    try {
      await client.connect();
      const result = await client.query(querys.listarPuntosConClima);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel listarPuntosConClima"));
      throw error;
    } finally {
      await client.end();
    }
  };

  crearPunto = async ({ nombre, lat, lng, ucp, orden }, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.crearPunto, [
        nombre,
        lat,
        lng,
        ucp ?? null,
        orden ?? 0,
      ]);
      return result.rows[0];
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel crearPunto"));
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarPunto = async (
    { id, nombre, lat, lng, ucp, activo, orden },
    client,
  ) => {
    try {
      await client.connect();
      const result = await client.query(querys.actualizarPunto, [
        id,
        nombre,
        lat,
        lng,
        ucp ?? null,
        activo,
        orden ?? 0,
      ]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel actualizarPunto"));
      throw error;
    } finally {
      await client.end();
    }
  };

  eliminarPunto = async (id, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.eliminarPunto, [id]);
      return result.rowCount > 0;
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel eliminarPunto"));
      throw error;
    } finally {
      await client.end();
    }
  };

  horaPorPunto = async (idPunto, fecha, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.horaPorPunto, [idPunto, fecha]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel horaPorPunto"));
      throw error;
    } finally {
      await client.end();
    }
  };

  diaPorPunto = async (idPunto, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.diaPorPunto, [idPunto]);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error ClimaMapaModel diaPorPunto"));
      throw error;
    } finally {
      await client.end();
    }
  };
}
