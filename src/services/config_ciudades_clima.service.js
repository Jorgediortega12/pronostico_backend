import ConfigCiudadesClimaModel from "../models/config_ciudades_clima.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import { createConectionPG } from "../helpers/connections.js";

const model = ConfigCiudadesClimaModel.getInstance();

const CARGAR_UCP = `
  SELECT DISTINCT(aux2) AS mc
  FROM ucp
  WHERE codpadre = $1 AND estado = $2 AND aux2 IS NOT NULL AND aux2 <> ''
  ORDER BY aux2 ASC;
`;
const BUSCAR_KEY_ACCUWEATHER = `SELECT aux FROM ucp WHERE codigo = 15 LIMIT 1`;

export default class ConfigCiudadesClimaService {
  static instance;

  static getInstance() {
    if (!ConfigCiudadesClimaService.instance) {
      ConfigCiudadesClimaService.instance = new ConfigCiudadesClimaService();
    }
    return ConfigCiudadesClimaService.instance;
  }

  // Lista TODOS los mercados de la empresa (tabla ucp propia, vía session),
  // combinados con su config en jano_proxy si ya existe — así la UI puede
  // mostrar "sin configurar" para los que faltan.
  listar = async (session) => {
    try {
      const clientEmpresa = createConectionPG(session);
      await clientEmpresa.connect();
      const ucpResult = await clientEmpresa.query(CARGAR_UCP, ["2", "1"]);
      await clientEmpresa.end();

      const configs = await model.listarPorEmpresa(session.basededatos);
      const configPorUcp = new Map(configs.map((c) => [c.ucp, c]));

      const data = ucpResult.rows.map((row) => {
        const cfg = configPorUcp.get(row.mc);
        return {
          ucp: row.mc,
          ciudadNombre: cfg?.ciudad_nombre ?? null,
          accuweatherId: cfg?.accuweather_id ?? null,
          openweatherId: cfg?.openweather_id ?? null,
          configurado: !!cfg,
        };
      });

      return { success: true, data, message: "Listado obtenido correctamente" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService listar"), error);
      return { success: false, data: null, message: "Error al listar la configuración de ciudades" };
    }
  };

  guardar = async (session, payload) => {
    try {
      const row = await model.upsertConfig(session.basededatos, payload);
      return { success: true, data: row, message: "Configuración guardada correctamente" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService guardar"), error);
      return { success: false, data: null, message: "Error al guardar la configuración" };
    }
  };

  eliminar = async (session, ucp) => {
    try {
      const row = await model.eliminarConfig(session.basededatos, ucp);
      return { success: true, data: row, message: "Configuración eliminada correctamente" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService eliminar"), error);
      return { success: false, data: null, message: "Error al eliminar la configuración" };
    }
  };

  buscarOpenweather = async (query) => {
    try {
      const rows = await model.buscarCiudadesOwm(query);
      return { success: true, data: rows, message: "Búsqueda completada" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService buscarOpenweather"), error);
      return { success: false, data: null, message: "Error al buscar ciudades de OpenWeatherMap" };
    }
  };

  // Búsqueda en vivo contra AccuWeather Locations API, usando la key propia
  // del tenant (tabla ucp, codigo=15 — misma key que usa jano-proxy hoy
  // para el histórico).
  buscarAccuweather = async (session, query) => {
    try {
      const clientEmpresa = createConectionPG(session);
      await clientEmpresa.connect();
      const keyResult = await clientEmpresa.query(BUSCAR_KEY_ACCUWEATHER);
      await clientEmpresa.end();

      const apiKey = keyResult.rows[0]?.aux;
      if (!apiKey) {
        return {
          success: false,
          data: null,
          message: "No hay una API key de AccuWeather configurada para esta empresa (Configuración > API clima).",
        };
      }

      const url = `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&language=es-co`;
      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          data: null,
          message: `AccuWeather respondió ${response.status}`,
        };
      }
      const json = await response.json();
      const data = (Array.isArray(json) ? json : []).map((c) => ({
        id: c.Key,
        nombre: c.LocalizedName,
        estado: c.AdministrativeArea?.LocalizedName ?? null,
        pais: c.Country?.LocalizedName ?? null,
      }));

      return { success: true, data, message: "Búsqueda completada" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService buscarAccuweather"), error);
      return { success: false, data: null, message: "Error al buscar ciudades en AccuWeather" };
    }
  };

  // Ciudades que ya se le asignaron a algún mercado (de cualquier empresa) —
  // para reusarlas en vez de volver a buscar/escribir los IDs a mano.
  listarCiudadesYaConfiguradas = async () => {
    try {
      const rows = await model.listarCiudadesYaConfiguradas();
      return { success: true, data: rows, message: "Listado obtenido correctamente" };
    } catch (error) {
      Logger.error(colors.red("Error ConfigCiudadesClimaService listarCiudadesYaConfiguradas"), error);
      return { success: false, data: null, message: "Error al listar ciudades ya configuradas" };
    }
  };
}
