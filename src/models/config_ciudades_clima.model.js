import * as querys from "../querys/config_ciudades_clima.query.js";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

export default class ConfigCiudadesClimaModel {
  static instance;

  static getInstance() {
    if (!ConfigCiudadesClimaModel.instance) {
      ConfigCiudadesClimaModel.instance = new ConfigCiudadesClimaModel();
    }
    return ConfigCiudadesClimaModel.instance;
  }

  // config_ciudades_clima y owm_ciudades_co viven en jano_proxy — misma
  // conexión fija que usa ConfiguracionModel para datos_clima.
  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER_PROXY,
      host: process.env.POSTGRES_HOST_PROXY || "localhost",
      database: process.env.POSTGRES_DB_PROXY,
      password: process.env.POSTGRES_PASSWORD_PROXY,
      port: process.env.POSTGRES_PORT_PROXY || 5432,
    });
  }

  async executeQuery(queryFn, queryName) {
    const client = this.createClient();
    try {
      await client.connect();
      const result = await queryFn(client);
      await client.end();
      return result;
    } catch (error) {
      await client.end();
      throw error;
    }
  }

  async listarPorEmpresa(dbEmpresa) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.listarConfigsPorEmpresa, [
        dbEmpresa,
      ]);
      return result.rows;
    }, "listarPorEmpresa");
  }

  async upsertConfig(
    dbEmpresa,
    { ucp, ciudad_nombre, accuweather_id, openweather_id },
  ) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.upsertConfig, [
        dbEmpresa,
        ucp,
        ciudad_nombre ?? null,
        accuweather_id ?? null,
        openweather_id ?? null,
      ]);
      return result.rows[0] ?? null;
    }, "upsertConfig");
  }

  async eliminarConfig(dbEmpresa, ucp) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.eliminarConfig, [
        dbEmpresa,
        ucp,
      ]);
      return result.rows[0] ?? null;
    }, "eliminarConfig");
  }

  async buscarCiudadesOwm(query) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.buscarCiudadesOwm, [
        `%${query}%`,
      ]);
      return result.rows;
    }, "buscarCiudadesOwm");
  }

  async listarCiudadesYaConfiguradas() {
    return this.executeQuery(async (client) => {
      await client.query(querys.crearTablaCatalogoCiudades);
      const result = await client.query(querys.listarCiudadesYaConfiguradas);
      return result.rows;
    }, "listarCiudadesYaConfiguradas");
  }

  async upsertCatalogoCiudad({
    ciudad_nombre,
    accuweather_id,
    openweather_id,
    origen,
  }) {
    return this.executeQuery(async (client) => {
      await client.query(querys.crearTablaCatalogoCiudades);
      const result = await client.query(querys.upsertCatalogoCiudad, [
        ciudad_nombre,
        accuweather_id ?? null,
        openweather_id ?? null,
        origen ?? null,
      ]);
      return result.rows[0] ?? null;
    }, "upsertCatalogoCiudad");
  }

  async listarCatalogoCompleto() {
    return this.executeQuery(async (client) => {
      await client.query(querys.crearTablaCatalogoCiudades);
      const result = await client.query(querys.listarCatalogoCompleto);
      return result.rows;
    }, "listarCatalogoCompleto");
  }

  async actualizarCatalogoCiudad(
    id,
    { ciudad_nombre, accuweather_id, openweather_id },
  ) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.actualizarCatalogoCiudad, [
        id,
        ciudad_nombre,
        accuweather_id ?? null,
        openweather_id ?? null,
      ]);
      return result.rows[0] ?? null;
    }, "actualizarCatalogoCiudad");
  }

  async listarTodasLasCiudades() {
    return this.executeQuery(async (client) => {
      await client.query(querys.crearTablaCatalogoCiudades);
      const result = await client.query(querys.listarTodasLasCiudades);
      return result.rows;
    }, "listarTodasLasCiudades");
  }

  async actualizarConfigCiudadPorId(
    id,
    { ciudad_nombre, accuweather_id, openweather_id },
  ) {
    return this.executeQuery(async (client) => {
      const result = await client.query(querys.actualizarConfigCiudadPorId, [
        id,
        ciudad_nombre,
        accuweather_id ?? null,
        openweather_id ?? null,
      ]);
      return result.rows[0] ?? null;
    }, "actualizarConfigCiudadPorId");
  }
}
