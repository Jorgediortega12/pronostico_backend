import MedidasFactoresModel from "../models/medidas_factores.model.js";
import Logger from "../helpers/logger.js";
import { aplicarConfigAgrupacion } from "../helpers/agrupacionCalculo.js";

const LIMIT_MAXIMO = 200; // "son muchísimas" — nunca dejar traer todo de golpe
const PERIODOS = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);

// La fila trae el valor crudo de `medidas` — se le aplica acá
// dividir_por_1000 -> factor -> valor_absoluto, en ese orden, en vez de
// depender de que la ingesta ya lo haya normalizado.
const aplicarConfigAFila = (fila) => {
  const config = {
    factor: fila.factor,
    dividir_por_1000: fila.dividir_por_1000,
    valor_absoluto: fila.valor_absoluto,
  };
  const filaProcesada = { ...fila };
  for (const p of PERIODOS) {
    filaProcesada[p] = aplicarConfigAgrupacion(fila[p], config);
  }
  return filaProcesada;
};

export default class MedidasFactoresService {
  static instance;
  static getInstance() {
    if (!MedidasFactoresService.instance) {
      MedidasFactoresService.instance = new MedidasFactoresService();
    }
    return MedidasFactoresService.instance;
  }

  #model = MedidasFactoresModel.getInstance();

  listar = async (session, filtros) => {
    try {
      if (!filtros.mc) {
        return { success: false, message: "Debe seleccionar un UCP" };
      }

      const limitPedido = parseInt(filtros.limit ?? 20, 10) || 20;
      const limit = Math.min(limitPedido, LIMIT_MAXIMO);
      const page = Math.max(parseInt(filtros.page ?? 1, 10) || 1, 1);
      const offset = (page - 1) * limit;

      const result = await this.#model.listar(session, {
        ...filtros,
        limit,
        offset,
      });

      return {
        success: true,
        data: result.rows.map(aplicarConfigAFila),
        total: result.total,
        page,
        limit,
      };
    } catch (err) {
      Logger.error(`[MedidasFactoresService.listar] ${err}`);
      return { success: false, message: "Error al obtener las medidas" };
    }
  };

  #validarFiltrosInversion = (filtros) => {
    if (!filtros.mc) return "Debe seleccionar un UCP";
    if (!filtros.fechaInicio || !filtros.fechaFin) {
      return "Debe indicar fecha inicio y fecha fin";
    }
    return null;
  };

  // Vista previa: cuántas filas/fechas tienen algún periodo negativo dentro
  // del rango — se muestra ANTES de aplicar el cambio.
  contarSignoNegativo = async (session, filtros) => {
    try {
      const errorValidacion = this.#validarFiltrosInversion(filtros);
      if (errorValidacion) return { success: false, message: errorValidacion };

      const result = await this.#model.contarSignoNegativo(session, filtros);
      return { success: true, data: result };
    } catch (err) {
      Logger.error(`[MedidasFactoresService.contarSignoNegativo] ${err}`);
      return { success: false, message: "Error al contar las medidas afectadas" };
    }
  };

  // Aplica la inversión de signo (p = -p, en los 24 periodos) sólo sobre
  // las filas que ya tienen algún periodo negativo dentro del rango elegido.
  invertirSignoNegativo = async (session, filtros) => {
    try {
      const errorValidacion = this.#validarFiltrosInversion(filtros);
      if (errorValidacion) return { success: false, message: errorValidacion };

      const result = await this.#model.invertirSignoNegativo(session, filtros);
      return { success: true, data: result };
    } catch (err) {
      Logger.error(`[MedidasFactoresService.invertirSignoNegativo] ${err}`);
      return { success: false, message: "Error al invertir el signo de las medidas" };
    }
  };
}
