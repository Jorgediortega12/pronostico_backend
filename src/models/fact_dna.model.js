import * as querys from "../querys/fact_dna.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

export default class FactDnaModel {
  static instance;

  static getInstance() {
    if (!FactDnaModel.instance) {
      FactDnaModel.instance = new FactDnaModel();
    }
    return FactDnaModel.instance;
  }

  asegurarColumnaTipoDia = async (client) => {
    await client.query(querys.asegurarColumnaTipoDia);
    try {
      await client.query(querys.asegurarIndiceUnicoFactDna);
    } catch (err) {
      if (err.code !== "23505") throw err;
    }
  };

  upsertFactDna = async (data, client) => {
    try {
      await client.connect();
      await this.asegurarColumnaTipoDia(client);
      const { ucp, tipo_dia, periodos } = data;
      const params = [ucp, tipo_dia, ...periodos];
      const result = await client.query(querys.upsertFactDna, params);
      return result.rows[0];
    } catch (error) {
      Logger.error(colors.red("Error FactDnaModel upsertFactDna"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  getFactDna = async (ucp, tipo_dia, client) => {
    try {
      await client.connect();
      await this.asegurarColumnaTipoDia(client);
      const result = await client.query(querys.getFactDna, [ucp, tipo_dia]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error FactDnaModel getFactDna"), error);
      throw error;
    } finally {
      await client.end();
    }
  };
}
