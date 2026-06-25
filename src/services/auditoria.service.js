import AuditoriaModel from "../models/auditoria.model.js";
import Logger from "../helpers/logger.js";

export default class AuditoriaService {
  static instance;
  static getInstance() {
    if (!AuditoriaService.instance) {
      AuditoriaService.instance = new AuditoriaService();
    }
    return AuditoriaService.instance;
  }

  #model = AuditoriaModel.getInstance();

  registrar = async (session, { usuario, modulo, accion = "Ingreso", status = null }) => {
    try {
      const row = await this.#model.registrar(session, { usuario, modulo, accion, status });
      return { success: true, data: row };
    } catch (err) {
      Logger.error(`[AuditoriaService.registrar] ${err}`);
      return { success: false, message: "Error al registrar auditoría" };
    }
  };

  listar = async (session, filtros) => {
    try {
      const limit = parseInt(filtros.limit ?? 20, 10);
      const page = parseInt(filtros.page ?? 1, 10);
      const offset = (page - 1) * limit;
      const result = await this.#model.listar(session, { ...filtros, limit, offset });
      return { success: true, data: result.rows, total: result.total, page, limit };
    } catch (err) {
      Logger.error(`[AuditoriaService.listar] ${err}`);
      return { success: false, message: "Error al obtener registros de auditoría" };
    }
  };
}
