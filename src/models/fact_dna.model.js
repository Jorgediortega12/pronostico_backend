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

  upsertFactDna = async (data, client) => {
    try {
      await client.connect();
      const { ucp, periodos } = data;
      const params = [ucp, ...periodos];
      const result = await client.query(querys.upsertFactDna, params);
      return result.rows[0];
    } catch (error) {
      Logger.error(colors.red("Error FactDnaModel upsertFactDna"), error);
      throw error;
    } finally {
      await client.end();
    }
  };

  getFactDna = async (ucp, client) => {
    try {
      await client.connect();
      const result = await client.query(querys.getFactDna, [ucp]);
      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error(colors.red("Error FactDnaModel getFactDna"), error);
      throw error;
    } finally {
      await client.end();
    }
  };
}
