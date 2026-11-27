import AdemAgenteConfigModel from "../models/adem_agente_config.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

const model = AdemAgenteConfigModel.getInstance();

/** Código de agente válido: letras, números o guion bajo (los de XM son 4 letras, p. ej. CMMC, ATEC, EPMC). */
export const AGENTE_VALIDO = /^[A-Z0-9_]{2,20}$/;

/** "  atec " -> "ATEC". Vacío o null -> null (modo automático). Devuelve undefined si el código no es válido. */
export const normalizarAgente = (valor) => {
  if (valor === null || valor === undefined) return null;
  const limpio = String(valor).trim().toUpperCase();
  if (limpio === "") return null;
  return AGENTE_VALIDO.test(limpio) ? limpio : undefined;
};

export default class AdemAgenteConfigService {
  static instance;
  static getInstance() {
    if (!AdemAgenteConfigService.instance) {
      AdemAgenteConfigService.instance = new AdemAgenteConfigService();
    }
    return AdemAgenteConfigService.instance;
  }

  obtener = async (session) => {
    try {
      const config = await model.obtener(session);
      if (!config) return { success: false, data: null, message: "No se pudo obtener la configuración del agente ADEM." };
      return { success: true, data: config, message: "Configuración del agente ADEM." };
    } catch (error) {
      Logger.error(colors.red("Error AdemAgenteConfigService obtener"), error);
      return { success: false, data: null, message: "Error al obtener la configuración del agente ADEM." };
    }
  };

  /** Agente fijo para cargar archivos, o null si está en automático. Lanza error si no se puede leer: no se debe cargar con otro agente sin avisar. */
  agenteParaCarga = async (session) => {
    const config = await model.obtener(session);
    return config?.agente ? String(config.agente).trim().toUpperCase() : null;
  };

  actualizar = async (session, { agente }) => {
    try {
      const normalizado = normalizarAgente(agente);
      if (normalizado === undefined) {
        return { success: false, data: null, message: "El agente debe tener entre 2 y 20 letras o números (por ejemplo ATEC)." };
      }
      const config = await model.actualizar(session, { agente: normalizado });
      if (!config) return { success: false, data: null, message: "No se pudo actualizar la configuración del agente ADEM." };
      return {
        success: true,
        data: config,
        message: normalizado ? `Los archivos ADEM se cargarán con el agente ${normalizado}.` : "Los archivos ADEM se cargarán con el agente automático (CMMC, CMC o CMEC).",
      };
    } catch (error) {
      Logger.error(colors.red("Error AdemAgenteConfigService actualizar"), error);
      return { success: false, data: null, message: "Error al actualizar la configuración del agente ADEM." };
    }
  };
}
