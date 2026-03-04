import RedisModel from "../models/redis.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

import moment from "moment";

const redisModel = RedisModel.getInstance();

export default class UsuariosService {
  static instance;
  static getInstance() {
    if (UsuariosService.instance === undefined) {
      UsuariosService.instance = new UsuariosService();
    }
    return UsuariosService.instance;
  }

  //Listando Usuarios en el perfil superadmin
  listar = async () => {
    try {
      const resultKeys = await redisModel.keys(`usuarios*`);
      if (resultKeys.length == 0)
        return {
          success: false,
          message: "No hay usuarios creados en el sistema.",
        };

      let i = 0;
      let arrNew = [];
      while (i < resultKeys.length) {
        const getInfoData = await redisModel.get(resultKeys[i]);
        const data = JSON.parse(getInfoData);
        arrNew.push(data);
        i++;
      }
      return { success: true, message: "Datos de los usuarios.", info: arrNew };
    } catch (error) {
      Logger.error(colors.red("Error UsuariosService Listar "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  //Creando Usuarios en el perfil superadmin
  crear = async (perfil, correo, usuario, contrasenia, nombre) => {
    try {
      //Se verifica el usuario
      const resultKeys = await redisModel.keys(`usuarios_*_*_${usuario}`);
      if (resultKeys.length > 0)
        return {
          success: false,
          message: "Este Usuario ya se encuentra creado en el sistema.",
        };

      //Se listan todos los usuarios
      const resultKeysU = await redisModel.keys(`usuarios*`);
      if (resultKeysU.length == 0)
        return {
          success: false,
          message: "No hay usuarios creados en el sistema.",
        };

      //Se valida que el correo no se encuentre creado
      let i = 0;
      while (i < resultKeysU.length) {
        const getInfoData = await redisModel.get(resultKeysU[i]);
        const data = JSON.parse(getInfoData);
        if (data.correo == correo)
          return {
            success: false,
            message: "Este correo ya se encuentra registrado en el sistema.",
          };
        i++;
      }
      //Se registra el usuario
      let dateRegister = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      const data = {
        perfil: perfil,
        correo: correo,
        usuario: usuario,
        nombre: nombre,
        contrasenia: contrasenia,
        registro: dateRegister,
      };
      //Key: usuario_perfil_estado_usuario
      await redisModel.set(`usuarios_${perfil}_1_${usuario}`, data);
      return { success: true, message: "Usuario creado correctamente." };
    } catch (error) {
      Logger.error(colors.red("Error UsuariosService crear "), error);
      throw new Error("ERROR TECNICO");
    }
  };

  //Creando Usuarios en el perfil superadmin

  editar = async (perfil, nombre, usuario) => {
    try {
      //Verificar existencia del usuario actual
      const resultKeys = await redisModel.keys(`usuarios_*_*_${usuario}`);
      if (resultKeys.length === 0) {
        return {
          success: false,
          message: "Este Usuario no se encuentra registrado en el sistema.",
        };
      }

      const oldKey = resultKeys[0];

      //Extraer datos de la key actual
      const [, perfilActual, estadoActual, usuarioActual] = oldKey.split("_");

      //Obtener información actual
      const rawData = await redisModel.get(oldKey);
      const dataJSON = JSON.parse(rawData);

      //Definir nuevos valores
      const usuarioNuevo = usuario || usuarioActual;
      const perfilNuevo = perfil || perfilActual;

      //Construir nueva key
      const newKey = `usuarios_${perfilNuevo}_${estadoActual}_${usuarioNuevo}`;

      //Validar colisión de key
      if (oldKey !== newKey) {
        const exists = await redisModel.exists(newKey);
        if (exists) {
          return {
            success: false,
            message: "Ya existe un usuario con ese perfil y nombre.",
          };
        }
      }

      //Construir nuevo objeto de datos
      const newData = {
        ...dataJSON,
        perfil: perfilNuevo,
        usuario: usuarioNuevo,
        nombre,
      };

      //Guardar cambios
      if (oldKey !== newKey) {
        // Crear nueva key y eliminar la anterior
        await redisModel.set(newKey, JSON.stringify(newData));
        await redisModel.del(oldKey);
      } else {
        // Solo actualizar datos
        await redisModel.set(oldKey, JSON.stringify(newData));
      }

      return {
        success: true,
        message: "Usuario editado correctamente.",
      };
    } catch (error) {
      Logger.error(colors.red("Error UsuariosService editar"), error);
      throw new Error("ERROR TECNICO");
    }
  };

  //Listando Usuarios en el perfil superadmin
  estado = async (estado, usuario) => {
    try {
      const resultKeys = await redisModel.keys(`usuarios_*_*_${usuario}`);
      if (resultKeys.length == 0)
        return {
          success: false,
          message: "No hay usuario creado en el sistema.",
        };

      const splitKey = resultKeys[0].split("_");
      const perfilSplit = splitKey[1];
      const estadoSplit = splitKey[2];
      const usuarioSplit = splitKey[3];
      const getInfoData = await redisModel.get(resultKeys[0]);
      const data = JSON.parse(getInfoData);
      if (estado != estadoSplit) {
        const newData = { ...data, estado };
        await redisModel.set(resultKeys[0], newData);
        await redisModel.rename(
          resultKeys[0],
          `usuarios_${perfilSplit}_${estado}_${usuarioSplit}`,
        );
        return { success: true, message: "Estado modificado correctamente." };
      }
      return { success: false, message: "No se pudo actualizar el estado." };
    } catch (error) {
      Logger.error(colors.red("Error UsuariosService estado "), error);
      throw new Error("ERROR TECNICO");
    }
  };
}
