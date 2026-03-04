import RedisModel from "../models/redis.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";
import * as utils from "../helpers/utils.js";
import moment from "moment";

const redisModel = RedisModel.getInstance();

export default class MercadosService {
  static instance;
  static getInstance() {
    if (MercadosService.instance === undefined) {
      MercadosService.instance = new MercadosService();
    }
    return MercadosService.instance;
  }

  //Listando mercados en el perfil superadmin
  listar = async () => {
    try {
      const resultKeys = await redisModel.keys(`mercados*`);

      if (resultKeys.length === 0)
        return {
          success: false,
          message: "No hay mercados creadas en el sistema.",
        };

      const arrNew = [];

      for (let i = 0; i < resultKeys.length; i++) {
        const getInfoData = await redisModel.get(resultKeys[i]);

        // 👇 FIX: parseo defensivo
        const raw = JSON.parse(getInfoData);
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;

        arrNew.push(data);
      }

      return {
        success: true,
        message: "Datos del mercados.",
        data: arrNew,
      };
    } catch (error) {
      Logger.error(colors.red("Error MercadosService Listar "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  //Creando mercados en el perfil superadmin
  crear = async (nombre, nit, correo) => {
    try {
      const resultKeys = await redisModel.keys(`mercados_*_${nit}*`);
      if (resultKeys.length > 0)
        return {
          success: false,
          message: "Este NIT ya se encuentra creado en el sistema.",
        };

      const fechaCreacion = moment().format("YYYY-MM-DD HH:mm:ss");
      const uuid = utils.uuid();
      const data = { uuid, nombre, nit, correo };

      // redisModel.set ya hace JSON.stringify internamente → pasar objeto directo
      await redisModel.set(
        `mercados_${uuid}_${nit}_${nombre}_${fechaCreacion}`,
        data,
      );

      return { success: true, message: "Mercado creado correctamente." };
    } catch (error) {
      Logger.error(colors.red("Error MercadosService crear "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  //Editando mercados en el perfil superadmin
  // ─── EDITAR ───────────────────────────────────────────────────────────────────
  editar = async (uuid, nombre, nit, correo) => {
    try {
      const resultKeys = await redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length === 0)
        return {
          success: false,
          message: "No se puede realizar gestión a este mercado.",
        };

      const oldKey = resultKeys[0];
      const splitKey = oldKey.split("_");

      const UUIDSplit = splitKey[1];
      const nitSplit = splitKey[2];
      const nombreSplit = splitKey[3];
      const fechaCreacionSplit = splitKey[4];

      const getInfoData = await redisModel.get(oldKey);
      const raw = JSON.parse(getInfoData);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;

      const newData = { ...data, uuid, nombre, nit, correo };

      const cambioNombre = nombreSplit !== nombre;
      const cambioNit = nitSplit !== nit;

      if (cambioNombre || cambioNit) {
        const keyNew = `mercados_${UUIDSplit}_${nit}_${nombre}_${fechaCreacionSplit}`;
        await redisModel.rename(oldKey, keyNew);
        // redisModel.set ya hace JSON.stringify internamente → pasar objeto directo
        await redisModel.set(keyNew, newData);
      } else {
        await redisModel.set(oldKey, newData);
      }

      return { success: true, message: "Institución editada correctamente." };
    } catch (error) {
      Logger.error("Error MercadosService editar ", error);
      throw new Error("ERROR TECNICO");
    }
  };

  //buscar datos del mercado por UUID
  buscar = async (uuid) => {
    try {
      const resultKeys = await redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length == 0)
        return {
          success: false,
          message: "No hay mercado creada en el sistema.",
        };

      const getInfoData = await redisModel.get(resultKeys[0]);

      // 👇 FIX: parseo defensivo
      const raw = JSON.parse(getInfoData);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;

      return {
        success: true,
        message: "Datos de los mercados.",
        data: data,
      };
    } catch (error) {
      Logger.error(colors.red("Error MercadosService buscar "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  listarM = async () => {
    try {
      const resultKeys = await redisModel.keys(`mercados*`);

      if (resultKeys.length === 0)
        return {
          success: false,
          message: "No hay mercados creados en el sistema.",
        };

      const mercados = [];

      for (let i = 0; i < resultKeys.length; i++) {
        const getInfoData = await redisModel.get(resultKeys[i]);

        if (getInfoData) {
          // 👇 FIX: parseo defensivo
          const raw = JSON.parse(getInfoData);
          const data = typeof raw === "string" ? JSON.parse(raw) : raw;

          const dataCopy = { ...data };
          delete dataCopy.accesos;

          mercados.push(dataCopy);
        }
      }

      if (mercados.length === 0)
        return {
          success: false,
          message: "No hay mercados.",
        };

      return {
        success: true,
        message: "Datos de los mercados.",
        data: mercados,
      };
    } catch (error) {
      Logger.error("Error MercadosService listarM ", error);
      throw new Error("ERROR TECNICO");
    }
  };

  //crear accesos a base de datos en mercados en el perfil superadmin
  accesosBD = async (
    uuid,
    proyecto,
    basededatos,
    host,
    usuario,
    contrasenia,
    puerto,
  ) => {
    try {
      const resultKeys = await redisModel.keys(`mercados_${uuid}*`);
      if (resultKeys.length == 0)
        return {
          success: false,
          message: "No existe una mercado con este UUID.",
        };

      const accesos = {
        proyecto,
        host,
        basededatos,
        usuario,
        contrasenia,
        puerto,
      };

      const getInfoData = await redisModel.get(resultKeys[0]);
      const raw = JSON.parse(getInfoData);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;

      const newData = { ...data, accesos };

      // redisModel.set ya hace JSON.stringify internamente → pasar objeto directo
      await redisModel.set(resultKeys[0], newData);

      return { success: true, message: "Accesos gestionados correctamente." };
    } catch (error) {
      Logger.error(colors.red("Error MercadosService accesosBD "), error);
      throw new Error("ERROR TECNICO");
    }
  };
}
