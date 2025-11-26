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
            const result = await client.query(querys.cargarDatosSesiones, [codsuperior]);
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
            const result = await client.query(querys.cargarArchivoVrSesiones, [codcarpeta]);
            return result.rows.length > 0 ? result.rows : null;
        } catch (error) {
            Logger.error(colors.red("Error SesionModel cargarArchivoVrSesiones"));
            throw error;
        } finally {
            await client.end();
        }
    }

    buscarVersionSesionCod = async (codigo) => {
        const client = this.createClient();
        try {
            await client.connect();
            const result = await client.query(querys.buscarVersionSesionCod, [codigo]);
            return result.rows.length > 0 ? result.rows : null;
        } catch (error) {
            Logger.error(colors.red("Error SesionModel buscarVersionSesionCod"));
            throw error;
        } finally {
            await client.end();
        }
    }

    cargarPeriodosSesion = async (codsesion, tipo) => {
        const client = this.createClient();
        try {
            await client.connect();
            const result = await client.query(querys.cargarPeriodosSesion, [codsesion, tipo]);
            return result.rows.length > 0 ? result.rows : null;
        } catch (error) {
            Logger.error(colors.red("Error SesionModel obtenerSesionesPeriodos"));
            throw error;
        } finally {
            await client.end();
        }
    }

    cargarPeriodosxUCPxFecha = async (ucp, fecha) => {
        const client = this.createClient();
        try {
            await client.connect();
            const result = await client.query(querys.cargarPeriodosxUCPxFecha, [ucp, fecha]);
            return result.rows.length > 0 ? result.rows : null;
        } catch (error) {
            Logger.error(colors.red("Error sesionModel obtenerActualizacionDatos"));
            throw error;
        } finally {
            await client.end();
        }
    }

}