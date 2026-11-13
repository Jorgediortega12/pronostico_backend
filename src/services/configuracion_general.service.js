import ConfiguracionGeneralModel from "../models/configuracion_general.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = ConfiguracionGeneralModel.getInstance();

// Hora a la que termina el "día actual" para la edición de pronósticos (HH:MM, hora de Colombia). Con 00:00 el día
// cambia a la medianoche; con 06:00, hasta las 6 a.m. todavía cuenta como "hoy" la fecha de ayer, de modo que el
// día que ya es de calendario "hoy" sigue editable como "día siguiente".
export const CLAVE_HORA_FIN_DIA = "hora_fin_dia_actual";
export const HORA_FIN_DIA_DEFECTO = "00:00";
// Tope razonable: el cambio de día solo se puede correr hasta el mediodía.
export const HORA_FIN_DIA_MAXIMA = "12:00";

export default class ConfiguracionGeneralService {
  static instance;
  static getInstance() {
    if (!ConfiguracionGeneralService.instance) {
      ConfiguracionGeneralService.instance = new ConfiguracionGeneralService();
    }
    return ConfiguracionGeneralService.instance;
  }

  obtenerHoraFinDia = async (session) => {
    try {
      const valor = await model.obtenerValor(session, CLAVE_HORA_FIN_DIA);
      return {
        success: true,
        data: { hora_fin_dia: valor ?? HORA_FIN_DIA_DEFECTO },
        message: "Hora fin del día actual obtenida.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionGeneralService obtenerHoraFinDia"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al obtener la hora fin del día actual.",
      };
    }
  };

  guardarHoraFinDia = async (session, { hora_fin_dia }) => {
    try {
      if (hora_fin_dia > HORA_FIN_DIA_MAXIMA) {
        return {
          success: false,
          data: null,
          message: `La hora fin del día no puede ser posterior a ${HORA_FIN_DIA_MAXIMA}.`,
        };
      }
      const guardado = await model.guardarValor(
        session,
        CLAVE_HORA_FIN_DIA,
        hora_fin_dia,
      );
      return {
        success: true,
        data: { hora_fin_dia: guardado?.valor ?? hora_fin_dia },
        message: "Hora fin del día actual guardada correctamente.",
      };
    } catch (error) {
      Logger.error(
        colors.red("Error ConfiguracionGeneralService guardarHoraFinDia"),
        error,
      );
      return {
        success: false,
        data: null,
        message: "Error al guardar la hora fin del día actual.",
      };
    }
  };
}
