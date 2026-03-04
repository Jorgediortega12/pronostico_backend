import expressLoader from "./express.js";
import colors from "colors";
import Logger from "../helpers/logger.js";
import client from "./redis.js";
import moment from "moment";

export default async (app) => {
  try {
    // Load Express
    await expressLoader(app);
    Logger.info(colors.cyan("✓ All loaders initialized successfully"));
  } catch (error) {
    Logger.error(colors.red("Error initializing loaders:"), error);
    throw error;
  }
  //Verificando el servicio de Redis
  let dateRegister = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
  try {
    await client.set(
      `RedisStatus`,
      JSON.stringify({ RedisStatus: "OK", dateRegister }),
    );
    Logger.info(colors.green("Redis Status Ok! ✌️"));
  } catch (error) {
    Logger.error(colors.red("error loading or connecting Redis"), error);
    throw error;
  }
  // Create credentials admin
  const objectCredentials = {
    perfil: 1,
    estado: 1,
    correo: process.env.EMAIL_ADMIN,
    usuario: process.env.USER_ADMIN,
    contrasenia: process.env.PASS_ADMIN,
    nombre: "Usuario administrador",
    registro: dateRegister,
  };
  try {
    //Key: usuario_perfil_estado_usuario
    await client.set(
      `usuarios_1_1_${process.env.USER_ADMIN}`,
      JSON.stringify(objectCredentials),
    );
    Logger.info(colors.green("Credentials created! ✌️"));
  } catch (error) {
    Logger.error(colors.red("Error creating admin credentials"), error);
    throw error;
  }
};
