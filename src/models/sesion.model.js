import * as querys from "../querys/sesion.query.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class SesionModel {
  static instance;

  static getInstance() {
    if (!SesionModel.instance) {
      SesionModel.instance = new SesionModel();
    }
    return SesionModel.instance;
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

  cargarDatosSesiones = async (codsuperior) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarDatosSesiones, [
        codsuperior,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error SesionModel cargarDatosSesiones"));
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarArchivosVrSesiones = async (codcarpeta) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarArchivoVrSesiones, [
        codcarpeta,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error SesionModel cargarArchivoVrSesiones"));
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarVersionSesionCod = async (codigo) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarVersionSesionCod, [
        codigo,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error SesionModel buscarVersionSesionCod"));
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosSesion = async (codsesion, tipo) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarPeriodosSesion, [
        codsesion,
        tipo,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error SesionModel cargarPeriodosSesion"));
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosxUCPxFecha = async (ucp, fechainicio, fechafin) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarPeriodosxUCPxFecha, [
        ucp,
        fechainicio,
        fechafin,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error sesionModel cargarPeriodosxUCPxFecha"));
      throw error;
    } finally {
      await client.end();
    }
  };

  verificarFechaActualizaciondedatos = async (ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.verificarFechaActualizaciondedatos,
        [ucp]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error sesionModel verificarFechaActualizaciondedatos")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  verificarFechaClima = async (ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.verificarFechaClima, [ucp]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error sesionModel verificarFechaClima"));
      throw error;
    } finally {
      await client.end();
    }
  };

  borrarDatosPronostico = async () => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.borrarDatosPronostico);
    } catch (error) {
      Logger.error(colors.red("Error sesionModel borrarDatosPronostico"));
      throw error;
    } finally {
      await client.end();
    }
  };

  eliminarFechasIngresadasTodo = async () => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.eliminarFechasIngresadasTodo);
    } catch (error) {
      Logger.error(
        colors.red("Error sesionModel eliminarFechasIngresadasTodo")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  guardarFechasPronosticas = async (fechainicio, fechafin, ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.guardarFechasPronosticas, [
        fechainicio,
        fechafin,
        ucp,
      ]);
    } catch (error) {
      Logger.error(colors.red("Error sesionModel guardarFechasPronosticas"));
      throw error;
    } finally {
      await client.end();
    }
  };

  borrarDatosTipoPronostico = async (ucp) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.borrarDatosTipoPronostico, [
        ucp,
      ]);
    } catch (error) {
      Logger.error(colors.red("Error sesionModel borrarDatosTipoPronostico"));
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarRutaBatch = async (nombre) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarRutaBatch, [nombre]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error sesionModel buscarRutaBatch"));
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosPronosticosxUCPxFecha = async (ucp, fechainicio, fechafin) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(
        querys.cargarPeriodosPronosticosxUCPxFecha,
        [ucp, fechainicio, fechafin]
      );
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error sesionModel cargarPeriodosPronosticosxUCPxFecha")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  cargarPeriodosxUCPxFechaInicio = async (ucp, fechainicio) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.cargarPeriodosxUCPxFechaInicio, [
        ucp,
        fechainicio,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(
        colors.red("Error sesionModel cargarPeriodosxUCPxFechaInicio")
      );
      throw error;
    } finally {
      await client.end();
    }
  };

  buscarTipoPronostico = async (ucp, fecha) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.buscarTipoPronostico, [
        ucp,
        fecha,
      ]);
      return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
      Logger.error(colors.red("Error sesionModel buscarTipoPronostico"));
      throw error;
    } finally {
      await client.end();
    }
  };

  ingresarTipoPronostico = async (ucp, fecha, tipopronostico) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.ingresarTipoPronostico, [
        ucp,
        fecha,
        tipopronostico,
      ]);
    } catch (error) {
      Logger.error(colors.red("Error sesionModel ingresarTipoPronostico"));
      throw error;
    } finally {
      await client.end();
    }
  };

  actualizarTipoPronostico = async (tipopronostico, ucp, fecha) => {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await client.query(querys.actualizarTipoPronostico, [
        tipopronostico,
        ucp,
        fecha,
      ]);
    } catch (error) {
      Logger.error(colors.red("Error sesionModel actualizarTipoPronostico"));
      throw error;
    } finally {
      await client.end();
    }
  };
}
