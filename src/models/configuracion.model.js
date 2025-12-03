import * as querys from "../querys/configuracion.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class ConfiguracionModel {
  static instance;

  static getInstance() {
    if (!ConfiguracionModel.instance) {
      ConfiguracionModel.instance = new ConfiguracionModel();
    }
    return ConfiguracionModel.instance;
  }

  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST || "localhost",
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: process.env.POSTGRES_PORT || 5432,
    });
  }

  buscarSaveDocumento = async (aux3) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarSaveDocumento, [aux3]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionModel buscarSaveDocumento"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarDiasPotencias = async (ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarDiasPotencia, [ucp]);
      return result.rows;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel cargarDiasPotencias"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarVersionSesion = async (nombre) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarVersionSesion, [nombre]);
      console.log("result buscarVersionSesion:", result);
      return result.rows;
    } catch (error) {
      Logger.error(colors.red("Error configuracionModel bsucarVersionSesion"));
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarVersionSesion = async (datos) => {
    const client = this.createClient();
    console.log("datos en model agregarVersionSesion:", datos);
    try {
      await client.connect();
      const valores = [
        datos.fecha,
        datos.ucp,
        datos.fechainicio,
        datos.fechafin,
        datos.tipodatos,
        datos.tendencia,
        datos.dias,
        datos.edicionfiltro,
        datos.edicionperiodo,
        datos.ediciontexto,
        datos.edicionfecha,
        datos.edicionsuma,
        datos.nombre,
        datos.version,
        datos.usuario,
        datos.p1_diario,
        datos.p2_diario,
        datos.p3_diario,
        datos.p4_diario,
        datos.p5_diario,
        datos.p6_diario,
        datos.p7_diario,
        datos.p8_diario,
        datos.p9_diario,
        datos.p10_diario,
        datos.p11_diario,
        datos.p12_diario,
        datos.p13_diario,
        datos.p14_diario,
        datos.p15_diario,
        datos.p16_diario,
        datos.p17_diario,
        datos.p18_diario,
        datos.p19_diario,
        datos.p20_diario,
        datos.p21_diario,
        datos.p22_diario,
        datos.p23_diario,
        datos.p24_diario,
        datos.nombrearchivo,
        datos.cargaindustrial,
      ];
      const result = await client.query(querys.agregarVersionSesion, valores);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel agregarVersionSesion"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  agregarDatosPronosticoxSesion = async (datos) => {
    const client = this.createClient();
    console.log("datos en model agregarDatosPronosticoxSesion:", datos);
    try {
      await client.connect();
      const valores = [
        datos.codsesion,
        datos.check_f,
        datos.fecha,
        datos.p1,
        datos.p2,
        datos.p3,
        datos.p4,
        datos.p5,
        datos.p6,
        datos.p7,
        datos.p8,
        datos.p9,
        datos.p10,
        datos.p11,
        datos.p12,
        datos.p13,
        datos.p14,
        datos.p15,
        datos.p16,
        datos.p17,
        datos.p18,
        datos.p19,
        datos.p20,
        datos.p21,
        datos.p22,
        datos.p23,
        datos.p24,
        datos.observacion,
        datos.tipo,
      ];
      const result = await client.query(
        querys.agregarDatosPronosticoxSesion,
        valores
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel agregarDatosPronosticoxSesion"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };
  buscarDiaFestivo = async (fecha, ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarDiaFestivo, [fecha, ucp]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionModel buscarDiaFestivo"),
        error
      );
      throw error;
    } finally {
      await client.end();
    }
  };
  buscarPotenciaDia = async (ucp, dia) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarPotenciaDia, [ucp, dia]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      Logger.error(colors.red("Error configuracionModel buscarPotenciaDia"));
      throw error;
    } finally {
      await client.end();
    }
  };
  cargarPeriodosxUCPDesdeFecha = async (ucp, fechaInicio) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarPeriodosxUCPDesdeFecha, [
        ucp,
        fechaInicio,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error configuracionModel cargarPeriodosxUCPDesdeFecha")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarVariablesClimaticasxUCPDesdeFecha = async (ucp, fechaInicio) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarVariablesClimaticasxUCPDesdeFecha,
        [ucp, fechaInicio]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionModel cargarVariablesClimaticasxUCPDesdeFecha"
        )
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosxUCPxUnaFechaxLimite = async (ucp, fechaInicio, limite) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarPeriodosxUCPxUnaFechaxLimite,
        [ucp, fechaInicio, limite]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red(
          "Error configuracionModel cargarPeriodosxUCPxUnaFechaxLimite"
        )
      );
      throw error;
    } finally {
      await client.end();
    }
  };
}
