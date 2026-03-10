import pkg from "pg";
const { Client } = pkg;
import Logger from "../helpers/logger.js";
import colors from "colors";
import dotenv from "dotenv";
import {
  GET_MODULOS_PADRES,
  GET_MODULOS_POR_PERFIL,
  GET_PERFILES_DISPONIBLES,
  ASIGNAR_MODULO_A_PERFIL,
  REMOVER_MODULO_DE_PERFIL,
  CREAR_MODULO,
  ELIMINARMODULO,
} from "../querys/menu.query.js";

dotenv.config();

export default class MenuModel {
  static instance;

  static getInstance() {
    if (!MenuModel.instance) {
      MenuModel.instance = new MenuModel();
    }
    return MenuModel.instance;
  }

  // Crear cliente de PostgreSQL
  createClient() {
    return new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST || "localhost",
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: process.env.POSTGRES_PORT || 5432,
    });
  }

  // Conectar y desconectar cliente con logs
  async executeQuery(queryFn, queryName, client) {
    try {
      await client.connect();
      Logger.info(
        `${colors.magenta("[  DB  ]")} *** [${colors.blue(client.processID)}]${colors.green("[  OPEN ]")} Conexión Client Pool PostgreSQL iniciada.`,
      );

      const result = await queryFn(client);

      await client.end();
      Logger.info(
        `${colors.magenta("[  DB  ]")} *** [${colors.blue(client.processID)}]${colors.green("[  CLOSE ]")} Conexión Client Pool PostgreSQL finalizada.`,
      );

      return result;
    } catch (error) {
      Logger.error(colors.red(`Error MenuModel ${queryName} `), error);
      if (client) {
        await client
          .end()
          .catch((err) =>
            Logger.error("Error durante la desconexión", err.stack),
          );
      }
      throw new Error("ERROR TECNICO");
    }
  }

  //obtener modulos padres, rutas principales ahora en pronosticos
  obtenerModulosPadres = async (client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(GET_MODULOS_PADRES);
        return result;
      },
      "obtenerModulosPadres",
      client,
    );
  };

  // Obtener perfiles disponibles
  obtenerPerfilesDisponibles = async (client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(GET_PERFILES_DISPONIBLES);
        return result;
      },
      "obtenerPerfilesDisponibles",
      client,
    );
  };

  obtenerModulosPorPerfil = async (client, codPerfil) => {
    try {
      await client.connect();
      const result = await client.query(GET_MODULOS_POR_PERFIL, [codPerfil]);
      await client.end();
      return result;
    } catch (error) {
      Logger.error(
        colors.red("Error MenuModel obtenerModulosPorPerfil "),
        error,
      );
      await client
        .end()
        .catch((err) =>
          Logger.error("Error durante la desconexión", err.stack),
        );
      throw new Error("ERROR TECNICO");
    }
  };

  // Asignar módulo a perfil
  asignarModuloAPerfil = async (codPerfil, codMenu, client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(ASIGNAR_MODULO_A_PERFIL, [
          codPerfil,
          codMenu,
        ]);
        return result;
      },
      "asignarModuloAPerfil",
      client,
    );
  };

  // Remover módulo de perfil
  removerModuloDePerfil = async (codPerfil, codMenu, client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(REMOVER_MODULO_DE_PERFIL, [
          codPerfil,
          codMenu,
        ]);
        return result;
      },
      "removerModuloDePerfil",
      client,
    );
  };

  //crear modulo
  crearModulo = async (nombre, nivel, orden, link, imagen, client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(CREAR_MODULO, [
          nombre,
          nivel,
          orden,
          link,
          imagen,
        ]);
        return result;
      },
      "crearModulo",
      client,
    );
  };

  //eliminar modulo completo
  eliminarModulo = async (cod, client) => {
    return this.executeQuery(
      async (client) => {
        const result = await client.query(ELIMINARMODULO, [cod]);
        return result;
      },
      "eliminarModulo",
      client,
    );
  };
}
