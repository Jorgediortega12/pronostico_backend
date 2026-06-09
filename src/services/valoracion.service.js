import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import ValoracionModel from "../models/valoracion.model.js";
import Logger from "../helpers/logger.js";

// Error de negocio con código HTTP asociado (replica las HTTPException del origen).
class ServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ─── Utilidades numéricas (reemplazan a numpy) ─────────────────────────────────
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const isClose = (a, b, rtol = 1e-3) => Math.abs(a - b) <= rtol * Math.max(1, Math.abs(b)) + 1e-9;

// Gaussiana (Box-Muller). Equivalente a random.gauss(mu, sigma).
const randGauss = (mu = 0, sigma = 1) => {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + sigma * z;
};

const safeFloat = (v) => (Number.isFinite(v) ? v : 0.0);

export default class ValoracionService {
  static instance;
  static getInstance() {
    if (!ValoracionService.instance) {
      ValoracionService.instance = new ValoracionService();
    }
    return ValoracionService.instance;
  }

  #model = ValoracionModel.getInstance();

  // Cede el control al event loop para que el GA (CPU-bound) no bloquee el server
  // durante la ejecución en background → permite atender el polling de /estado.
  #tick = () => new Promise((resolve) => setImmediate(resolve));

  // Configuración de producción optimizada (equivale a DEFAULT_CONFIG).
  DEFAULT_CONFIG = {
    tamano_poblacion: 500,
    numero_generaciones: 200,
    tolerancia_funcion: 1e-8,
    generaciones_estancamiento: 50,
    numero_contratos_max: null,
    restricciones_adicionales: null,
    cobertura_objetivo: 0.98,
    cobertura_maxima_periodo: 1.0,
    tolerancia_cobertura: 0.02,
    penalizacion_exceso: 10000,
    penalizacion_deficit: 100,
    elitismo: 0.1,
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  Helpers de restricciones por tipo / corrección (núcleo del GA)
  // ════════════════════════════════════════════════════════════════════════════

  // Convierte el vector plano a matriz (ofertas × períodos).
  #convertirAMatrizPeriodos = (individual, numOfertas, numPeriodos) => {
    const matriz = [];
    for (let i = 0; i < numOfertas; i++) {
      matriz.push(individual.slice(i * numPeriodos, i * numPeriodos + numPeriodos));
    }
    return matriz;
  };

  // Energía por contrato/período: (porcentaje/100) * En_Of.
  #energiaPorContratoPeriodo = (matrizPorcentajes, EnOf, numOfertas, numPeriodos) => {
    const res = [];
    for (let i = 0; i < numOfertas; i++) {
      const fila = new Array(numPeriodos);
      for (let j = 0; j < numPeriodos; j++) {
        fila[j] = (matrizPorcentajes[i][j] / 100.0) * EnOf[i][j];
      }
      res.push(fila);
    }
    return res;
  };

  #energiaPorPeriodo = (energiaContratoPeriodo, numOfertas, numPeriodos) => {
    const res = new Array(numPeriodos).fill(0);
    for (let i = 0; i < numOfertas; i++) {
      for (let j = 0; j < numPeriodos; j++) res[j] += energiaContratoPeriodo[i][j];
    }
    return res;
  };

  // Valida que la solución respete las restricciones por tipo de contrato.
  #validarRestriccionesTipos = (individual, tiposOferta, numOfertas, numPeriodos) => {
    try {
      for (let i = 0; i < numOfertas; i++) {
        const tipo = Math.trunc(tiposOferta[i]);
        const inicio = i * numPeriodos;
        const porcentajes = individual.slice(inicio, inicio + numPeriodos);

        if (tipo === 1) {
          // Oferta Total: todo o nada (mismo valor, 0% o 100%).
          const unicos = [...new Set(porcentajes)];
          if (unicos.length > 1) return false;
          if (unicos.length === 1) {
            const valor = unicos[0];
            if (!(isClose(valor, 0.0) || isClose(valor, 100.0))) return false;
          }
        } else if (tipo === 2) {
          // % Iguales: mismo porcentaje en todos los períodos.
          const primero = porcentajes[0];
          if (!porcentajes.every((p) => isClose(p, primero))) return false;
        }
        // Tipo 3: sin restricciones.
      }
      return true;
    } catch (e) {
      Logger.error(`Error en validación de tipos: ${e.message}`);
      return false;
    }
  };

  // Repara un individuo para que cumpla las restricciones por tipo.
  #repararIndividualTipos = (individual, tiposOferta, numOfertas, numPeriodos) => {
    const x = individual.slice();
    for (let i = 0; i < numOfertas; i++) {
      const tipo = Math.trunc(tiposOferta[i]);
      const inicio = i * numPeriodos;
      const fin = inicio + numPeriodos;
      const porcentajes = x.slice(inicio, fin);

      if (tipo === 1) {
        const promedio = mean(porcentajes);
        const nuevo = promedio > 50.0 ? 100.0 : 0.0;
        for (let j = inicio; j < fin; j++) x[j] = nuevo;
      } else if (tipo === 2) {
        const promedio = clamp(mean(porcentajes), 0.0, 100.0);
        for (let j = inicio; j < fin; j++) x[j] = promedio;
      }
      // Tipo 3: sin reparación.
    }
    return x;
  };

  // Crea un individuo que respeta las restricciones por tipo desde el inicio.
  #crearIndividuoRespetandoTipos = (tiposOferta, numOfertas, numPeriodos, energiaObjetivo, EnOf, EnRes) => {
    const individuo = [];
    let energiaAcumulada = 0.0;
    const energiaTotalObjetivo =
      energiaObjetivo != null
        ? energiaObjetivo
        : EnRes != null
          ? sum(EnRes) * 0.95
          : 1000000;

    for (let i = 0; i < numOfertas; i++) {
      const tipo = Math.trunc(tiposOferta[i]);

      if (tipo === 1) {
        let tomar;
        if (EnOf != null && energiaAcumulada < energiaTotalObjetivo) {
          const energiaContratoTotal = sum(EnOf[i]);
          const prob = Math.min(
            0.8,
            energiaContratoTotal > 0 ? (energiaTotalObjetivo - energiaAcumulada) / energiaContratoTotal : 0.3
          );
          tomar = Math.random() < prob;
        } else {
          tomar = Math.random() < 0.3;
        }
        const porcentaje = tomar ? 100.0 : 0.0;
        if (EnOf != null) energiaAcumulada += (porcentaje / 100.0) * sum(EnOf[i]);
        for (let j = 0; j < numPeriodos; j++) individuo.push(porcentaje);
      } else if (tipo === 2) {
        let porcentaje;
        if (EnOf != null && energiaAcumulada < energiaTotalObjetivo) {
          const energiaContratoTotal = sum(EnOf[i]);
          if (energiaContratoTotal > 0) {
            const contribucionDeseada = Math.min(1.0, (energiaTotalObjetivo - energiaAcumulada) / energiaContratoTotal);
            const base = contribucionDeseada * 100;
            porcentaje = clamp(base + randGauss(0, 10), 0.0, 100.0);
          } else {
            porcentaje = 0.0;
          }
        } else {
          porcentaje = Math.random() * 100;
        }
        if (EnOf != null) energiaAcumulada += (porcentaje / 100.0) * sum(EnOf[i]);
        for (let j = 0; j < numPeriodos; j++) individuo.push(porcentaje);
      } else {
        // Tipo 3: independiente por período.
        for (let j = 0; j < numPeriodos; j++) {
          let porcentaje;
          if (EnOf != null && EnRes != null && energiaAcumulada < energiaTotalObjetivo) {
            const disponible = EnOf[i][j];
            if (disponible > 0) {
              const faltante = Math.max(0, EnRes[j] - energiaAcumulada / numPeriodos);
              const contribucionDeseada = Math.min(1.0, faltante / disponible);
              const base = contribucionDeseada * 100;
              porcentaje = clamp(base + randGauss(0, 15), 0.0, 100.0);
            } else {
              porcentaje = 0.0;
            }
          } else {
            porcentaje = Math.random() * 100;
          }
          individuo.push(porcentaje);
        }
      }
    }
    return individuo;
  };

  // Corrección inteligente y gradual de excesos de cobertura por período.
  #corregirExcesosGradualmente = (individual, tiposOferta, EnOf, EnRes, numOfertas, numPeriodos) => {
    try {
      let corregido = individual.slice();
      const maxIteraciones = 10;

      for (let iteracion = 0; iteracion < maxIteraciones; iteracion++) {
        const matrizPorcentajes = this.#convertirAMatrizPeriodos(corregido, numOfertas, numPeriodos);
        const energiaContratoPeriodo = this.#energiaPorContratoPeriodo(matrizPorcentajes, EnOf, numOfertas, numPeriodos);
        const energiaPeriodo = this.#energiaPorPeriodo(energiaContratoPeriodo, numOfertas, numPeriodos);

        const periodosConExceso = [];
        for (let i = 0; i < EnRes.length; i++) {
          if (EnRes[i] > 0) {
            const cobertura = energiaPeriodo[i] / EnRes[i];
            if (cobertura > 1.001) {
              periodosConExceso.push({
                periodo: i,
                coberturaActual: cobertura,
                excesoPorcentual: (cobertura - 1.0) * 100,
                energiaExceso: energiaPeriodo[i] - EnRes[i],
              });
            }
          }
        }

        if (periodosConExceso.length === 0) break;

        periodosConExceso.sort((a, b) => a.excesoPorcentual - b.excesoPorcentual);
        let ajusteRealizado = false;

        // ESTRATEGIA 1: ajustar tipos 3 (independientes).
        for (const info of periodosConExceso) {
          const periodo = info.periodo;
          const contratosTipo3 = [];
          for (let contrato = 0; contrato < numOfertas; contrato++) {
            if (
              Math.trunc(tiposOferta[contrato]) === 3 &&
              EnOf[contrato][periodo] > 0 &&
              energiaContratoPeriodo[contrato][periodo] > 0
            ) {
              contratosTipo3.push({
                contrato,
                contribucion: energiaContratoPeriodo[contrato][periodo],
                indice: contrato * numPeriodos + periodo,
                porcentajeActual: corregido[contrato * numPeriodos + periodo],
              });
            }
          }
          contratosTipo3.sort((a, b) => b.contribucion - a.contribucion);

          for (const ci of contratosTipo3.slice(0, 2)) {
            if (ci.porcentajeActual > 10) {
              const reduccion = Math.min(15, ci.porcentajeActual * 0.2);
              corregido[ci.indice] = Math.max(0, ci.porcentajeActual - reduccion);
              ajusteRealizado = true;
              break;
            }
          }
          if (ajusteRealizado) break;
        }

        // ESTRATEGIA 2: ajustar tipos 2 (porcentaje uniforme).
        if (!ajusteRealizado) {
          for (const info of periodosConExceso) {
            const periodo = info.periodo;
            const contratosTipo2 = [];
            for (let contrato = 0; contrato < numOfertas; contrato++) {
              if (
                Math.trunc(tiposOferta[contrato]) === 2 &&
                EnOf[contrato][periodo] > 0 &&
                energiaContratoPeriodo[contrato][periodo] > 0
              ) {
                contratosTipo2.push({
                  contrato,
                  contribucion: energiaContratoPeriodo[contrato][periodo],
                  porcentajeActual: corregido[contrato * numPeriodos],
                });
              }
            }
            if (contratosTipo2.length) {
              contratosTipo2.sort((a, b) => b.contribucion - a.contribucion);
              const ci = contratosTipo2[0];
              if (ci.porcentajeActual > 10) {
                const reduccion = Math.min(10, ci.porcentajeActual * 0.15);
                const nuevo = Math.max(0, ci.porcentajeActual - reduccion);
                const inicio = ci.contrato * numPeriodos;
                for (let j = inicio; j < inicio + numPeriodos; j++) corregido[j] = nuevo;
                ajusteRealizado = true;
                break;
              }
            }
          }
        }

        // ESTRATEGIA 3: como último recurso, eliminar tipos 1 con exceso grande.
        if (!ajusteRealizado) {
          for (const info of periodosConExceso) {
            const periodo = info.periodo;
            if (info.excesoPorcentual > 10) {
              for (let contrato = 0; contrato < numOfertas; contrato++) {
                if (
                  Math.trunc(tiposOferta[contrato]) === 1 &&
                  EnOf[contrato][periodo] > 0 &&
                  energiaContratoPeriodo[contrato][periodo] > 0
                ) {
                  const contribucion = energiaContratoPeriodo[contrato][periodo];
                  const porcentajeContribucion = (contribucion / energiaPeriodo[periodo]) * 100;
                  const porcentajeActual = corregido[contrato * numPeriodos];
                  if (porcentajeContribucion > 30 && porcentajeActual > 90) {
                    const energiaTotalSinContrato = sum(energiaPeriodo) - sum(energiaContratoPeriodo[contrato]);
                    const coberturaSin = energiaTotalSinContrato / sum(EnRes);
                    if (coberturaSin >= 0.8) {
                      const inicio = contrato * numPeriodos;
                      for (let j = inicio; j < inicio + numPeriodos; j++) corregido[j] = 0.0;
                      ajusteRealizado = true;
                      break;
                    }
                  }
                }
              }
              if (ajusteRealizado) break;
            }
          }
        }

        if (!ajusteRealizado) break;
      }

      return corregido;
    } catch (e) {
      Logger.error(`Error en corrección gradual: ${e.message}`);
      return individual;
    }
  };

  #validarYCorregirGradualmente = (individual, tiposOferta, EnOf, EnRes, numOfertas, numPeriodos) => {
    const tiposOk = this.#repararIndividualTipos(individual, tiposOferta, numOfertas, numPeriodos);
    return this.#corregirExcesosGradualmente(tiposOk, tiposOferta, EnOf, EnRes, numOfertas, numPeriodos);
  };

  #crearIndividuoConMejorCobertura = (tiposOferta, numOfertas, numPeriodos, EnOf, EnRes) => {
    const energiaObjetivo = EnRes != null ? sum(EnRes) * 0.98 : null;
    let individuo = this.#crearIndividuoRespetandoTipos(tiposOferta, numOfertas, numPeriodos, energiaObjetivo, EnOf, EnRes);
    if (EnOf != null && EnRes != null) {
      individuo = this.#corregirExcesosGradualmente(individuo, tiposOferta, EnOf, EnRes, numOfertas, numPeriodos);
    }
    return individuo;
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  Métricas detalladas
  // ════════════════════════════════════════════════════════════════════════════

  #calcularMetricasDetalladas = (solucion, datos) => {
    const EnOf = datos.En_Of;
    const EnRes = datos.En_Res;
    const PriOf = datos.Pri_Of;
    const TypOf = datos.Typ_Of;

    const numOfertas = EnOf.length;
    const numPeriodos = EnOf[0].length;

    let matrizPorcentajes = this.#convertirAMatrizPeriodos(solucion, numOfertas, numPeriodos);

    if (!this.#validarRestriccionesTipos(solucion, TypOf, numOfertas, numPeriodos)) {
      Logger.warn("Solución no cumple restricciones por tipo - aplicando reparación");
      const reparada = this.#repararIndividualTipos(solucion, TypOf, numOfertas, numPeriodos);
      matrizPorcentajes = this.#convertirAMatrizPeriodos(reparada, numOfertas, numPeriodos);
    }

    const energiaContratoPeriodo = this.#energiaPorContratoPeriodo(matrizPorcentajes, EnOf, numOfertas, numPeriodos);
    const energiaPeriodo = this.#energiaPorPeriodo(energiaContratoPeriodo, numOfertas, numPeriodos);
    const energiaTotal = sum(energiaPeriodo);

    const costoContratoPeriodo = [];
    for (let i = 0; i < numOfertas; i++) {
      const fila = new Array(numPeriodos);
      for (let j = 0; j < numPeriodos; j++) fila[j] = energiaContratoPeriodo[i][j] * PriOf[i][j];
      costoContratoPeriodo.push(fila);
    }
    const costoPeriodo = this.#energiaPorPeriodo(costoContratoPeriodo, numOfertas, numPeriodos);
    const costoTotal = sum(costoPeriodo);

    const energiaTotalRequerida = sum(EnRes);
    const coberturaTotal = energiaTotalRequerida > 0 ? (energiaTotal / energiaTotalRequerida) * 100 : 0;

    const coberturaPeriodo = energiaPeriodo.map((e, i) => (EnRes[i] > 0 ? (e / EnRes[i]) * 100 : 0));

    const diferencias = EnRes.map((r, i) => r - energiaPeriodo[i]);
    const lse = Math.sqrt(mean(diferencias.map((d) => d * d)));

    const tarifaPonderada = energiaTotal > 0 ? costoTotal / energiaTotal : 0;

    const contratosSeleccionados = [];
    for (let i = 0; i < numOfertas; i++) {
      if (matrizPorcentajes[i].some((p) => p > 1.0)) {
        contratosSeleccionados.push({
          indice: i,
          tipo: Math.trunc(TypOf[i]),
          porcentajes_por_periodo: matrizPorcentajes[i].slice(),
          energia_por_periodo: energiaContratoPeriodo[i].slice(),
          costo_por_periodo: costoContratoPeriodo[i].slice(),
          energia_total_contrato: sum(energiaContratoPeriodo[i]),
          costo_total_contrato: sum(costoContratoPeriodo[i]),
        });
      }
    }

    const tipoPeriodo = datos.tipo_periodo || "mensual";

    return {
      porcentajes_por_periodo: matrizPorcentajes.map((f) => f.slice()),
      porcentajes_contratos: matrizPorcentajes.map((f) => mean(f)),
      energia_total_comprada: energiaTotal,
      cobertura_porcentual: coberturaTotal,
      error_cuadratico_medio: lse,
      tarifa_ponderada: tarifaPonderada,
      costo_total: costoTotal,
      tipo_periodo: tipoPeriodo,
      energia_mensual: energiaPeriodo,
      costo_mensual: costoPeriodo,
      cobertura_mensual: coberturaPeriodo,
      energia_por_contrato_periodo: energiaContratoPeriodo,
      costo_por_contrato_periodo: costoContratoPeriodo,
      tipos_contratos_utilizados: Array.from({ length: numOfertas }, (_, i) => Math.trunc(TypOf[i])),
      contratos_seleccionados: contratosSeleccionados,
      num_contratos_seleccionados: contratosSeleccionados.length,
      distribucion_por_tipo: {
        tipo_1: contratosSeleccionados.filter((c) => c.tipo === 1).length,
        tipo_2: contratosSeleccionados.filter((c) => c.tipo === 2).length,
        tipo_3: contratosSeleccionados.filter((c) => c.tipo === 3).length,
      },
    };
  };

  // Sanea NaN/Inf antes de persistir (equivale a _calcular_metricas_seguras).
  #calcularMetricasSeguras = (solucion, datos) => {
    const m = this.#calcularMetricasDetalladas(solucion, datos);
    for (const key of [
      "energia_total_comprada",
      "cobertura_porcentual",
      "error_cuadratico_medio",
      "tarifa_ponderada",
      "costo_total",
    ]) {
      m[key] = safeFloat(m[key]);
    }
    for (const key of ["energia_mensual", "costo_mensual", "cobertura_mensual", "porcentajes_contratos"]) {
      m[key] = m[key].map(safeFloat);
    }
    for (const key of ["porcentajes_por_periodo", "energia_por_contrato_periodo", "costo_por_contrato_periodo"]) {
      m[key] = m[key].map((row) => row.map(safeFloat));
    }
    return m;
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  Operadores genéticos genéricos (reemplazan a DEAP)
  // ════════════════════════════════════════════════════════════════════════════

  // Cruce uniforme in-place (equivale a tools.cxUniform).
  #cxUniform = (ind1, ind2, indpb) => {
    for (let i = 0; i < ind1.length; i++) {
      if (Math.random() < indpb) {
        const tmp = ind1[i];
        ind1[i] = ind2[i];
        ind2[i] = tmp;
      }
    }
  };

  // Torneo: selecciona el de mayor fitness (FitnessMax) entre `tournsize` aleatorios.
  #selTournament = (population, k, tournsize) => {
    const seleccionados = [];
    for (let i = 0; i < k; i++) {
      let mejor = null;
      for (let t = 0; t < tournsize; t++) {
        const cand = population[Math.floor(Math.random() * population.length)];
        if (mejor === null || cand.fitness > mejor.fitness) mejor = cand;
      }
      seleccionados.push(mejor);
    }
    return seleccionados;
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  GA simple (maximiza energía con penalización gradual)
  // ════════════════════════════════════════════════════════════════════════════

  #ejecutarGaSimple = async (datos, escenario) => {
    Logger.info("Configurando GA simple con corrección gradual inteligente...");

    const EnOf = datos.En_Of;
    const EnRes = datos.En_Res;
    const PriOf = datos.Pri_Of;
    const PriRes = datos.Pri_Res;
    const TypOf = datos.Typ_Of;
    const numOfertas = EnOf.length;
    const numPeriodos = EnOf[0].length;

    // Verifica si algún precio ofertado supera al de reserva.
    const algunPrecioSuperaReserva = () => {
      for (let i = 0; i < numOfertas; i++) {
        for (let j = 0; j < numPeriodos; j++) {
          if (PriOf[i][j] > PriRes[j]) return true;
        }
      }
      return false;
    };
    const preciosInvalidos = algunPrecioSuperaReserva();

    const evaluar = (individual) => {
      try {
        if (!this.#validarRestriccionesTipos(individual, TypOf, numOfertas, numPeriodos)) return 1e8;

        const matriz = this.#convertirAMatrizPeriodos(individual, numOfertas, numPeriodos);
        const ecp = this.#energiaPorContratoPeriodo(matriz, EnOf, numOfertas, numPeriodos);
        const energiaPeriodo = this.#energiaPorPeriodo(ecp, numOfertas, numPeriodos);

        let penalizacionExceso = 0;
        let excesosGraves = 0;
        for (let i = 0; i < EnRes.length; i++) {
          if (EnRes[i] > 0) {
            const cobertura = energiaPeriodo[i] / EnRes[i];
            if (cobertura > 1.001) {
              const exceso = cobertura - 1.0;
              if (exceso > 0.2) {
                penalizacionExceso += exceso * 100000;
                excesosGraves += 1;
              } else {
                penalizacionExceso += exceso * 10000;
              }
            }
          }
        }
        if (excesosGraves > 3) return 1e8;
        if (preciosInvalidos) return 1e8;

        const energiaTotal = sum(energiaPeriodo);
        const coberturaTotal = energiaTotal / sum(EnRes);
        let bonusCobertura = 0;
        if (coberturaTotal >= 0.95) bonusCobertura = -50000;
        else if (coberturaTotal >= 0.9) bonusCobertura = -25000;
        else if (coberturaTotal >= 0.85) bonusCobertura = -10000;

        return -energiaTotal + penalizacionExceso + bonusCobertura;
      } catch (e) {
        Logger.error(`Error en evaluación: ${e.message}`);
        return 1e8;
      }
    };

    const crearIndividuo = () => {
      const genes = this.#crearIndividuoConMejorCobertura(TypOf, numOfertas, numPeriodos, EnOf, EnRes);
      return { genes, fitness: null };
    };

    const clonar = (ind) => ({ genes: ind.genes.slice(), fitness: ind.fitness });

    const mate = (a, b) => {
      this.#cxUniform(a.genes, b.genes, 0.3);
      a.genes = this.#validarYCorregirGradualmente(a.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
      b.genes = this.#validarYCorregirGradualmente(b.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
    };

    const mutate = (ind, indpb = 0.1) => {
      for (let i = 0; i < ind.genes.length; i++) {
        if (Math.random() < indpb) ind.genes[i] = clamp(ind.genes[i] + randGauss(0, 15), 0, 100);
      }
      ind.genes = this.#validarYCorregirGradualmente(ind.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
    };

    Logger.info("Creando población con buena cobertura inicial...");
    let population = Array.from({ length: escenario.tamano_poblacion }, crearIndividuo);
    Logger.info(`Población inicial creada: ${population.length} individuos`);

    // Hall of Fame de tamaño 10 (mejores por fitness).
    const hof = [];
    const actualizarHof = () => {
      for (const ind of population) {
        if (ind.fitness === null) continue;
        hof.push(clonar(ind));
      }
      hof.sort((a, b) => b.fitness - a.fitness);
      hof.length = Math.min(hof.length, 10);
    };

    const generaciones = Math.min(escenario.numero_generaciones, 150);
    Logger.info("Iniciando evolución con corrección gradual...");

    for (let gen = 0; gen < generaciones; gen++) {
      await this.#tick(); // cede el control para no bloquear el server
      for (const ind of population) ind.fitness = evaluar(ind.genes);

      let offspring = this.#selTournament(population, population.length, 5).map(clonar);

      for (let i = 0; i + 1 < offspring.length; i += 2) {
        if (Math.random() < 0.7) {
          mate(offspring[i], offspring[i + 1]);
          offspring[i].fitness = null;
          offspring[i + 1].fitness = null;
        }
      }
      for (const mutant of offspring) {
        if (Math.random() < 0.2) {
          mutate(mutant);
          mutant.fitness = null;
        }
      }

      population = offspring;
      for (const ind of population) if (ind.fitness === null) ind.fitness = evaluar(ind.genes);
      actualizarHof();

      if (gen % 25 === 0 && hof.length) {
        const m = this.#calcularMetricasDetalladas(hof[0].genes, datos);
        Logger.info(`Gen ${gen}: Cobertura ${m.cobertura_porcentual.toFixed(1)}% - Max período: ${Math.max(...m.cobertura_mensual).toFixed(1)}%`);
      }
    }

    const mejor = hof.length ? hof[0].genes : population[0].genes;
    const mejorFinal = this.#validarYCorregirGradualmente(mejor, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
    const metricasFinales = this.#calcularMetricasSeguras(mejorFinal, datos);

    Logger.info(`RESULTADO GA SIMPLE → Cobertura ${metricasFinales.cobertura_porcentual.toFixed(1)}%, Contratos ${metricasFinales.num_contratos_seleccionados}`);

    return { solucion: mejorFinal, metricas: metricasFinales };
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  GA multiobjetivo (NSGA-II)
  // ════════════════════════════════════════════════════════════════════════════

  // Dominación maximizando ambos valores ponderados (wvalues).
  #domina = (a, b) => {
    let algunoMejor = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return false;
      if (a[i] > b[i]) algunoMejor = true;
    }
    return algunoMejor;
  };

  #fastNonDominatedSort = (pop) => {
    const fronts = [[]];
    const S = pop.map(() => []);
    const n = pop.map(() => 0);
    const rank = pop.map(() => 0);

    for (let p = 0; p < pop.length; p++) {
      for (let qi = 0; qi < pop.length; qi++) {
        if (p === qi) continue;
        if (this.#domina(pop[p].wvalues, pop[qi].wvalues)) S[p].push(qi);
        else if (this.#domina(pop[qi].wvalues, pop[p].wvalues)) n[p] += 1;
      }
      if (n[p] === 0) {
        rank[p] = 0;
        fronts[0].push(p);
      }
    }

    let i = 0;
    while (fronts[i].length) {
      const next = [];
      for (const p of fronts[i]) {
        for (const qi of S[p]) {
          n[qi] -= 1;
          if (n[qi] === 0) {
            rank[qi] = i + 1;
            next.push(qi);
          }
        }
      }
      i += 1;
      fronts.push(next);
    }
    fronts.pop();
    return fronts;
  };

  #crowdingDistance = (pop, frontIdx) => {
    const dist = {};
    for (const idx of frontIdx) dist[idx] = 0;
    if (frontIdx.length === 0) return dist;
    const numObj = pop[frontIdx[0]].wvalues.length;

    for (let m = 0; m < numObj; m++) {
      const ordenado = frontIdx.slice().sort((a, b) => pop[a].wvalues[m] - pop[b].wvalues[m]);
      dist[ordenado[0]] = Infinity;
      dist[ordenado[ordenado.length - 1]] = Infinity;
      const minV = pop[ordenado[0]].wvalues[m];
      const maxV = pop[ordenado[ordenado.length - 1]].wvalues[m];
      const rango = maxV - minV || 1;
      for (let k = 1; k < ordenado.length - 1; k++) {
        dist[ordenado[k]] += (pop[ordenado[k + 1]].wvalues[m] - pop[ordenado[k - 1]].wvalues[m]) / rango;
      }
    }
    return dist;
  };

  // selNSGA2: ordena por frentes y, dentro del frente de corte, por crowding distance.
  #selNSGA2 = (pop, k) => {
    const fronts = this.#fastNonDominatedSort(pop);
    const seleccion = [];
    for (const front of fronts) {
      if (seleccion.length + front.length <= k) {
        for (const idx of front) seleccion.push(idx);
      } else {
        const dist = this.#crowdingDistance(pop, front);
        const ordenado = front.slice().sort((a, b) => dist[b] - dist[a]);
        for (const idx of ordenado) {
          if (seleccion.length >= k) break;
          seleccion.push(idx);
        }
        break;
      }
      if (seleccion.length >= k) break;
    }
    return seleccion.map((idx) => pop[idx]);
  };

  #sortNondominatedFirstFront = (pop) => {
    const fronts = this.#fastNonDominatedSort(pop);
    return (fronts[0] || []).map((idx) => pop[idx]);
  };

  #ejecutarGaMultiobjetivo = async (datos, escenario) => {
    Logger.info("Configurando multiobjetivo (NSGA-II) con corrección gradual...");

    const EnOf = datos.En_Of;
    const EnRes = datos.En_Res;
    const PriOf = datos.Pri_Of;
    const PriRes = datos.Pri_Res;
    const TypOf = datos.Typ_Of;
    const numOfertas = EnOf.length;
    const numPeriodos = EnOf[0].length;

    const preciosInvalidos = (() => {
      for (let i = 0; i < numOfertas; i++) {
        for (let j = 0; j < numPeriodos; j++) if (PriOf[i][j] > PriRes[j]) return true;
      }
      return false;
    })();

    const validarMultiobj = (individual) => {
      try {
        if (!this.#validarRestriccionesTipos(individual, TypOf, numOfertas, numPeriodos)) return false;

        const matriz = this.#convertirAMatrizPeriodos(individual, numOfertas, numPeriodos);
        const ecp = this.#energiaPorContratoPeriodo(matriz, EnOf, numOfertas, numPeriodos);
        const energiaPeriodo = this.#energiaPorPeriodo(ecp, numOfertas, numPeriodos);

        let excesosGraves = 0;
        for (let i = 0; i < EnRes.length; i++) {
          if (EnRes[i] > 0 && energiaPeriodo[i] / EnRes[i] > 1.1) excesosGraves += 1;
        }
        if (excesosGraves > 2) return false;

        const coberturaTotal = sum(energiaPeriodo) / sum(EnRes);
        if (coberturaTotal < 0.8) return false;
        if (preciosInvalidos) return false;
        return true;
      } catch (e) {
        return false;
      }
    };

    // Objetivos: (desviacion_cobertura, tarifa_ponderada).
    // Pesos DEAP (1.0, -1.0) → wvalues = (desviacion, -tarifa), maximizando.
    const evaluar = (individual) => {
      try {
        if (!validarMultiobj(individual)) return [-1e10, -1e10];

        const matriz = this.#convertirAMatrizPeriodos(individual, numOfertas, numPeriodos);
        const ecp = this.#energiaPorContratoPeriodo(matriz, EnOf, numOfertas, numPeriodos);
        const energiaPeriodo = this.#energiaPorPeriodo(ecp, numOfertas, numPeriodos);

        const energiaTotal = sum(energiaPeriodo);
        const coberturaTotal = energiaTotal / sum(EnRes);
        let desviacionCobertura = Math.abs(coberturaTotal - 0.98);
        if (coberturaTotal >= 0.95) desviacionCobertura *= 0.5;

        let sumaCosto = 0;
        for (let i = 0; i < numOfertas; i++) {
          for (let j = 0; j < numPeriodos; j++) sumaCosto += ecp[i][j] * PriOf[i][j];
        }
        const tarifaPonderada = energiaTotal > 0 ? sumaCosto / energiaTotal : 1e10;

        return [desviacionCobertura, -tarifaPonderada];
      } catch (e) {
        return [-1e10, -1e10];
      }
    };

    const crearIndividuo = () => {
      const genes = this.#crearIndividuoConMejorCobertura(TypOf, numOfertas, numPeriodos, EnOf, EnRes);
      return { genes, wvalues: null };
    };
    const clonar = (ind) => ({ genes: ind.genes.slice(), wvalues: ind.wvalues ? ind.wvalues.slice() : null });

    const mate = (a, b) => {
      this.#cxUniform(a.genes, b.genes, 0.1);
      a.genes = this.#validarYCorregirGradualmente(a.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
      b.genes = this.#validarYCorregirGradualmente(b.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
    };
    const mutate = (ind, indpb = 0.05) => {
      for (let i = 0; i < ind.genes.length; i++) {
        if (Math.random() < indpb) ind.genes[i] = clamp(ind.genes[i] + randGauss(0, 1), 0, 100);
      }
      ind.genes = this.#validarYCorregirGradualmente(ind.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
    };

    // varAnd: clona y aplica cruce (cxpb) y mutación (mutpb).
    const varAnd = (pop, cxpb, mutpb) => {
      const off = pop.map(clonar);
      for (let i = 1; i < off.length; i += 2) {
        if (Math.random() < cxpb) {
          mate(off[i - 1], off[i]);
          off[i - 1].wvalues = null;
          off[i].wvalues = null;
        }
      }
      for (let i = 0; i < off.length; i++) {
        if (Math.random() < mutpb) {
          mutate(off[i]);
          off[i].wvalues = null;
        }
      }
      return off;
    };

    Logger.info("Ejecutando NSGA-II con corrección gradual...");
    let population = Array.from({ length: escenario.tamano_poblacion }, crearIndividuo);
    for (const ind of population) ind.wvalues = evaluar(ind.genes);

    for (let gen = 0; gen < escenario.numero_generaciones; gen++) {
      await this.#tick(); // cede el control para no bloquear el server
      const offspring = varAnd(population, 0.3, 0.1);
      for (const ind of offspring) ind.wvalues = evaluar(ind.genes);
      population = this.#selNSGA2(population.concat(offspring), escenario.tamano_poblacion);

      const paso = Math.max(1, Math.floor(escenario.numero_generaciones / 10));
      if (gen % paso === 0) Logger.info(`Gen multiobj ${gen}/${escenario.numero_generaciones}`);
    }

    const paretoFront = this.#sortNondominatedFirstFront(population);

    const resultadosValidos = [];
    for (const ind of paretoFront) {
      const corregido = this.#validarYCorregirGradualmente(ind.genes, TypOf, EnOf, EnRes, numOfertas, numPeriodos);
      if (validarMultiobj(corregido)) {
        const metricas = this.#calcularMetricasSeguras(corregido, datos);
        const maxCoberturaPeriodo = Math.max(...metricas.cobertura_mensual);
        if (metricas.cobertura_porcentual >= 80 && maxCoberturaPeriodo <= 110) {
          resultadosValidos.push({ solucion: corregido, metricas });
        }
      }
    }

    resultadosValidos.sort(
      (a, b) =>
        b.metricas.cobertura_porcentual - a.metricas.cobertura_porcentual ||
        a.metricas.tarifa_ponderada - b.metricas.tarifa_ponderada
    );

    Logger.info(`RESULTADO MULTIOBJETIVO → ${resultadosValidos.length} soluciones válidas`);
    return resultadosValidos.slice(0, 5);
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  Lectura de Excel de ofertas
  // ════════════════════════════════════════════════════════════════════════════

  #detectarTipoPeriodo = (headerCells) => {
    const headerText = headerCells
      .filter((c) => c != null)
      .map((c) => String(c))
      .join(" ")
      .toLowerCase();

    const mesesPalabras = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
      "mes", "month", "mensual", "monthly",
    ];
    const anosPalabras = [
      "2024", "2025", "2026", "2027", "2028", "2029", "2030",
      "2031", "2032", "2033", "2034", "2035", "2036", "2037",
      "año", "year", "anual", "annual",
    ];

    const mesesCount = mesesPalabras.filter((p) => headerText.includes(p)).length;
    const anosCount = anosPalabras.filter((p) => headerText.includes(p)).length;

    if (mesesCount === 0 && anosCount === 0) return "mensual";
    return anosCount > mesesCount ? "anual" : "mensual";
  };

  #leerExcelOfertas = (rutaArchivo) => {
    const wb = XLSX.readFile(rutaArchivo);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: true });

    if (!aoa.length) throw new Error("El archivo está vacío");

    // pandas usa la primera fila como header → las filas de datos son aoa[1:].
    const columnas = aoa[0] || [];
    const dataRows = aoa.slice(1);

    const contiene = (row, texto) =>
      row.some((cell) => cell != null && String(cell).includes(texto));

    let energiaRowIdx = -1;
    for (let i = 0; i < dataRows.length; i++) {
      if (contiene(dataRows[i], "Energía solicitada")) {
        energiaRowIdx = i;
        break;
      }
    }
    if (energiaRowIdx === -1) {
      throw new Error("No se encontró la fila 'Energía solicitada' en el archivo");
    }

    const headerCells = [...columnas];
    for (let i = 0; i <= energiaRowIdx; i++) headerCells.push(...(dataRows[i] || []));
    const periodoDetectado = this.#detectarTipoPeriodo(headerCells);

    const data = dataRows.slice(energiaRowIdx); // data[0] = energía solicitada
    const num = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error("Valor numérico inválido en el archivo");
      return n;
    };

    const EnRes = [];
    const PriRes = [];
    for (let j = 1; j <= 12; j++) EnRes.push(num(data[0][j]));
    for (let j = 13; j <= 24; j++) PriRes.push(num(data[0][j]));

    // Ofertas: filas cuyo primer campo contiene 'OFERTA', excluyendo data[0].
    const ofertaIndices = [];
    for (let i = 1; i < data.length; i++) {
      const primera = data[i][0];
      if (primera != null && String(primera).includes("OFERTA")) ofertaIndices.push(i);
    }

    const nOf = ofertaIndices.length;
    if (nOf === 0) {
      throw new Error("No se encontraron ofertas en el archivo. Deben empezar con 'OFERTA'");
    }

    const EnOf = [];
    const PriOf = [];
    const TypOf = [];
    for (const idx of ofertaIndices) {
      const filaE = [];
      const filaP = [];
      for (let j = 1; j <= 12; j++) filaE.push(num(data[idx][j]));
      for (let j = 13; j <= 24; j++) filaP.push(num(data[idx][j]));
      EnOf.push(filaE);
      PriOf.push(filaP);
      const tipoCell = data[idx][25];
      TypOf.push(tipoCell == null || tipoCell === "" ? 1 : num(tipoCell));
    }

    return {
      numero_ofertas: nOf,
      energia_reserva: EnRes,
      precios_reserva: PriRes,
      energia_ofertada: EnOf,
      precios_ofertados: PriOf,
      tipos_oferta: TypOf,
      es_anual: periodoDetectado === "anual",
      tipo_periodo: periodoDetectado,
    };
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  Casos de uso (API)
  // ════════════════════════════════════════════════════════════════════════════

  procesarArchivoOferta = async (archivo, usuarioId) => {
    if (!archivo) throw new ServiceError("No se proporcionó ningún archivo", 422);
    const rutaArchivo = archivo.path;

    try {
      const datosExcel = this.#leerExcelOfertas(rutaArchivo);

      const anios = datosExcel.es_anual ? Array.from({ length: 12 }, (_, i) => 2026 + i) : null;

      const fila = await this.#model.insertOferta([
        archivo.originalname,
        rutaArchivo,
        usuarioId ?? null,
        datosExcel.numero_ofertas,
        JSON.stringify(datosExcel.energia_reserva),
        JSON.stringify(datosExcel.precios_reserva),
        JSON.stringify(datosExcel.energia_ofertada),
        JSON.stringify(datosExcel.precios_ofertados),
        JSON.stringify(datosExcel.tipos_oferta),
        datosExcel.es_anual ? "anual" : "mensual",
        anios ? JSON.stringify(anios) : null,
      ]);

      return {
        id: fila.id,
        nombre: fila.nombre,
        numero_ofertas: fila.numero_ofertas,
        fecha_carga: fila.fecha_carga,
        tipo_datos: datosExcel.es_anual ? "anual" : "mensual",
        mensaje: `Archivo procesado exitosamente. ${datosExcel.numero_ofertas} ofertas encontradas.`,
      };
    } catch (err) {
      if (rutaArchivo && fs.existsSync(rutaArchivo)) {
        try { fs.unlinkSync(rutaArchivo); } catch { /* ignore */ }
      }
      if (err instanceof ServiceError) throw err;
      throw new ServiceError(`Error al procesar archivo: ${err.message}`, 422);
    }
  };

  listarOfertas = async (activas = true) => {
    const ofertas = await this.#model.listOfertas(activas);
    return ofertas.map((o) => ({
      id: o.id,
      nombre: o.nombre,
      fecha_carga: o.fecha_carga,
      numero_ofertas: o.numero_ofertas,
      activo: o.activo,
      tipo_periodo: o.tipo_periodo,
    }));
  };

  obtenerDetalleOferta = async (ofertaId) => {
    const oferta = await this.#model.getOfertaById(ofertaId);
    if (!oferta) throw new ServiceError("Oferta no encontrada", 404);

    const energiaReserva = JSON.parse(oferta.energia_reserva);
    const preciosReserva = JSON.parse(oferta.precios_reserva);

    const response = {
      id: oferta.id,
      nombre: oferta.nombre,
      fecha_carga: oferta.fecha_carga,
      numero_ofertas: oferta.numero_ofertas,
      energia_reserva: energiaReserva,
      precios_reserva: preciosReserva,
      tipo_periodo: oferta.tipo_periodo,
      resumen: {
        energia_total_reserva: sum(energiaReserva),
        precio_promedio_reserva: sum(preciosReserva) / 12,
      },
    };

    if (oferta.tipo_periodo === "anual") {
      response.anios_datos = oferta.anios_datos
        ? JSON.parse(oferta.anios_datos)
        : Array.from({ length: 12 }, (_, i) => 2026 + i);
      response.unidades_energia = "GWh";
      response.unidades_precio = "$/GWh";
    } else {
      response.meses_datos = oferta.meses_datos
        ? JSON.parse(oferta.meses_datos)
        : ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      response.unidades_energia = "MWh";
      response.unidades_precio = "$/MWh";
    }

    return response;
  };

  crearEscenario = async ({ nombre, oferta_id, usuario_id, ipp_base = 1.0 }) => {
    const oferta = await this.#model.getOfertaById(oferta_id);
    if (!oferta) throw new ServiceError("La oferta especificada no existe", 422);

    const c = this.DEFAULT_CONFIG;
    const fila = await this.#model.insertEscenario([
      nombre,
      oferta_id,
      usuario_id ?? null,
      ipp_base,
      c.numero_contratos_max,
      c.restricciones_adicionales ? JSON.stringify(c.restricciones_adicionales) : null,
      c.tamano_poblacion,
      c.numero_generaciones,
      c.tolerancia_funcion,
      c.generaciones_estancamiento,
    ]);

    const evaluaciones = c.tamano_poblacion * c.numero_generaciones;
    return {
      id: fila.id,
      nombre: fila.nombre,
      oferta_id: fila.oferta_id,
      ipp_base: fila.ipp_base,
      fecha_creacion: fila.fecha_creacion,
      configuracion_aplicada: {
        poblacion: c.tamano_poblacion,
        generaciones: c.numero_generaciones,
        evaluaciones_totales: evaluaciones,
        tiempo_estimado: "2-5 minutos",
        optimizacion_multiobjetivo: true,
      },
      mensaje: "Escenario creado - Tiempo estimado: 2-5 minutos",
    };
  };

  listarEscenariosSimplificado = async (ofertaId = null) => {
    const escenarios = await this.#model.listEscenarios(ofertaId);
    const resultado = [];
    for (const e of escenarios) {
      const numResultados = await this.#model.countResultadosByEscenario(e.id);
      const oferta = await this.#model.getOfertaById(e.oferta_id);
      resultado.push({
        id: e.id,
        nombre: e.nombre,
        ipp_base: e.ipp_base,
        fecha_creacion: e.fecha_creacion,
        num_resultados: numResultados,
        estado: numResultados > 0 ? "completado" : "pendiente",
        oferta_nombre: oferta ? oferta.nombre : null,
        config_tecnica: {
          poblacion: e.tamano_poblacion,
          generaciones: e.numero_generaciones,
          configuracion_optima:
            e.tamano_poblacion === this.DEFAULT_CONFIG.tamano_poblacion &&
            e.numero_generaciones === this.DEFAULT_CONFIG.numero_generaciones,
        },
      });
    }
    return resultado;
  };

  obtenerEscenario = async (escenarioId) => {
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);
    const oferta = await this.#model.getOfertaById(escenario.oferta_id);
    const numResultados = await this.#model.countResultadosByEscenario(escenarioId);
    return {
      id: escenario.id,
      nombre: escenario.nombre,
      oferta_id: escenario.oferta_id,
      fecha_creacion: escenario.fecha_creacion,
      numero_contratos_max: escenario.numero_contratos_max,
      ipp_base: escenario.ipp_base,
      oferta_nombre: oferta ? oferta.nombre : null,
      num_resultados: numResultados,
      estado: numResultados > 0 ? "completado" : "pendiente",
    };
  };

  eliminarEscenario = async (escenarioId) => {
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);
    await this.#model.deleteEscenario(escenarioId);
    return { mensaje: "Escenario eliminado exitosamente" };
  };

  // ─── Optimización ───────────────────────────────────────────────────────────

  ejecutarOptimizacion = async (escenarioId, tipo = "completa") => {
    const inicio = Date.now();
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);

    const oferta = await this.#model.getOfertaById(escenario.oferta_id);
    if (!oferta) throw new ServiceError("La oferta del escenario no existe", 404);

    const datos = {
      nOf: oferta.numero_ofertas,
      En_Res: JSON.parse(oferta.energia_reserva),
      Pri_Res: JSON.parse(oferta.precios_reserva),
      En_Of: JSON.parse(oferta.energia_ofertada),
      Pri_Of: JSON.parse(oferta.precios_ofertados),
      Typ_Of: JSON.parse(oferta.tipos_oferta),
      tipo_periodo: oferta.tipo_periodo,
      es_anual: oferta.tipo_periodo === "anual",
    };

    // Aplicar IPP si difiere de 1.0.
    if (escenario.ipp_base !== 1.0) {
      Logger.info(`Aplicando IPP: ${escenario.ipp_base}`);
      datos.Pri_Of = datos.Pri_Of.map((fila) => fila.map((p) => p * escenario.ipp_base));
      datos.Pri_Res = datos.Pri_Res.map((p) => p * escenario.ipp_base);
    }

    Logger.info(`INICIANDO OPTIMIZACIÓN: ${escenario.nombre} (${datos.nOf} ofertas)`);

    const resultados = [];

    let resultadoSimple = null;
    if (tipo === "simple" || tipo === "completa") {
      Logger.info("Ejecutando optimización simple...");
      resultadoSimple = await this.#ejecutarGaSimple(datos, escenario);
      resultados.push(await this.#guardarResultado(escenarioId, resultadoSimple, "simple", 0));
      if (tipo === "simple") return resultados;
    }

    if (tipo === "multiobjetivo" || tipo === "completa") {
      Logger.info("Ejecutando optimización multiobjetivo...");
      const resultadosMulti = await this.#ejecutarGaMultiobjetivo(datos, escenario);
      for (let i = 0; i < resultadosMulti.length; i++) {
        resultados.push(await this.#guardarResultado(escenarioId, resultadosMulti[i], "multiobjetivo", i));
      }
    }

    Logger.info(`OPTIMIZACIÓN TOTAL: ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    return resultados;
  };

  // Inicia la optimización en background y responde de inmediato. El progreso se
  // consulta vía verificarEstadoOptimizacion (endpoint /optimizar/estado).
  iniciarOptimizacion = async (escenarioId, tipo = "completa") => {
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);

    const job = await this.#model.getJobByEscenario(escenarioId);
    if (job && job.estado === "procesando") {
      throw new ServiceError("Ya hay una optimización en curso para este escenario", 409);
    }

    await this.#model.upsertJobProcesando(escenarioId, tipo, "Iniciando optimización");

    // Fire-and-forget: el GA cede el control (#tick) para no bloquear el server.
    this.#correrEnBackground(escenarioId, tipo);

    return {
      escenario_id: escenarioId,
      estado: "procesando",
      tipo_optimizacion: tipo,
      tiempo_estimado: "2-5 minutos",
      mensaje: "Optimización iniciada. Consulte el progreso en /optimizar/estado/:escenario_id",
    };
  };

  #correrEnBackground = async (escenarioId, tipo) => {
    try {
      const resultados = await this.ejecutarOptimizacion(escenarioId, tipo);
      await this.#model.completeJob(escenarioId, "Completado", resultados.length);
      Logger.info(`Job optimización escenario ${escenarioId} completado: ${resultados.length} resultado(s)`);
    } catch (err) {
      Logger.error(`Job optimización escenario ${escenarioId} falló: ${err.message}`);
      await this.#model.failJob(escenarioId, err.message).catch(() => {});
    }
  };

  #guardarResultado = async (escenarioId, resultado, tipo, iteracion = 0) => {
    const m = resultado.metricas;
    const fila = await this.#model.insertResultado([
      escenarioId,
      tipo,
      iteracion,
      JSON.stringify(m.porcentajes_contratos || []),
      JSON.stringify(m.porcentajes_por_periodo || []),
      m.energia_total_comprada,
      m.cobertura_porcentual,
      m.error_cuadratico_medio,
      m.tarifa_ponderada,
      m.costo_total,
      JSON.stringify(m.energia_mensual),
      JSON.stringify(m.costo_mensual),
      JSON.stringify(m.cobertura_mensual),
      JSON.stringify(m.energia_por_contrato_periodo || []),
      JSON.stringify(m.costo_por_contrato_periodo || []),
      JSON.stringify(m.tipos_contratos_utilizados || []),
    ]);

    return {
      id: fila.id,
      escenario_id: fila.escenario_id,
      fecha_ejecucion: fila.fecha_ejecucion,
      tipo_optimizacion: fila.tipo_optimizacion,
      iteracion: fila.iteracion,
      porcentajes_por_periodo: m.porcentajes_por_periodo,
      porcentajes_contratos: m.porcentajes_contratos,
      energia_total_comprada: m.energia_total_comprada,
      cobertura_porcentual: m.cobertura_porcentual,
      error_cuadratico_medio: m.error_cuadratico_medio,
      tarifa_ponderada: m.tarifa_ponderada,
      costo_total: m.costo_total,
      energia_mensual: m.energia_mensual,
      costo_mensual: m.costo_mensual,
      cobertura_mensual: m.cobertura_mensual,
      energia_por_contrato_periodo: m.energia_por_contrato_periodo,
      costo_por_contrato_periodo: m.costo_por_contrato_periodo,
      tipos_contratos_utilizados: m.tipos_contratos_utilizados,
      contratos_seleccionados: m.contratos_seleccionados || [],
      distribucion_por_tipo: m.distribucion_por_tipo || {},
    };
  };

  verificarEstadoOptimizacion = async (escenarioId) => {
    const resultados = await this.#model.countResultadosByEscenario(escenarioId);
    const job = await this.#model.getJobByEscenario(escenarioId);
    const configuracion = { poblacion: 500, generaciones: 200, tiempo_estimado: "2-5 minutos" };

    if (job && job.estado === "procesando") {
      return {
        estado: "procesando",
        progreso: 50,
        fase: job.fase || "Procesando",
        resultados_disponibles: resultados,
        fecha_inicio: job.fecha_inicio,
        configuracion,
      };
    }

    if (job && job.estado === "error") {
      return {
        estado: "error",
        progreso: 0,
        fase: `Error: ${job.error}`,
        error: job.error,
        resultados_disponibles: resultados,
        configuracion,
      };
    }

    // Completado (job o resultados de una corrida previa) / pendiente.
    const completado = (job && job.estado === "completado") || resultados > 0;
    return {
      estado: completado ? "completado" : "pendiente",
      progreso: completado ? 100 : 0,
      fase: completado ? "Completado" : "No iniciado",
      resultados_disponibles: resultados,
      fecha_fin: job?.fecha_fin,
      configuracion,
    };
  };

  // ─── Lectura de resultados ──────────────────────────────────────────────────

  #parseResultadoRow = (r) => {
    const j = (v) => (v ? JSON.parse(v) : []);
    const porcentajesPorPeriodo = j(r.porcentajes_por_periodo);
    const tiposUtilizados = j(r.tipos_contratos_utilizados);
    const energiaCP = j(r.energia_por_contrato_periodo);
    const costoCP = j(r.costo_por_contrato_periodo);
    return {
      id: r.id,
      escenario_id: r.escenario_id,
      fecha_ejecucion: r.fecha_ejecucion,
      tipo_optimizacion: r.tipo_optimizacion,
      iteracion: r.iteracion,
      porcentajes_por_periodo: porcentajesPorPeriodo,
      porcentajes_contratos: j(r.porcentajes_contratos),
      energia_total_comprada: r.energia_total_comprada,
      cobertura_porcentual: r.cobertura_porcentual,
      error_cuadratico_medio: r.error_cuadratico_medio,
      tarifa_ponderada: r.tarifa_ponderada,
      costo_total: r.costo_total,
      energia_mensual: j(r.energia_mensual),
      costo_mensual: j(r.costo_mensual),
      cobertura_mensual: j(r.cobertura_mensual),
      energia_por_contrato_periodo: energiaCP,
      costo_por_contrato_periodo: costoCP,
      tipos_contratos_utilizados: tiposUtilizados,
      contratos_seleccionados: this.#extraerContratosSeleccionados(porcentajesPorPeriodo, tiposUtilizados, energiaCP, costoCP),
      distribucion_por_tipo: this.#calcularDistribucionPorTipo(porcentajesPorPeriodo, tiposUtilizados),
    };
  };

  #extraerContratosSeleccionados = (porcentajesPorPeriodo, tipos, energiaCP, costoCP) => {
    const seleccionados = [];
    porcentajesPorPeriodo.forEach((porcentajes, i) => {
      if (porcentajes.some((p) => p > 1.0)) {
        const energia = energiaCP[i] || new Array(12).fill(0);
        const costo = costoCP[i] || new Array(12).fill(0);
        seleccionados.push({
          indice: i,
          tipo: tipos[i] ?? 1,
          porcentajes_por_periodo: porcentajes,
          energia_por_periodo: energia,
          costo_por_periodo: costo,
          energia_total_contrato: sum(energia),
          costo_total_contrato: sum(costo),
        });
      }
    });
    return seleccionados;
  };

  #calcularDistribucionPorTipo = (porcentajesPorPeriodo, tipos) => {
    const seleccionados = [];
    porcentajesPorPeriodo.forEach((porcentajes, i) => {
      if (porcentajes.some((p) => p > 1.0)) seleccionados.push(tipos[i] ?? 1);
    });
    return {
      tipo_1: seleccionados.filter((t) => t === 1).length,
      tipo_2: seleccionados.filter((t) => t === 2).length,
      tipo_3: seleccionados.filter((t) => t === 3).length,
    };
  };

  obtenerResultadosEscenario = async (escenarioId) => {
    const filas = await this.#model.getResultadosByEscenario(escenarioId);
    return filas.map((r) => this.#parseResultadoRow(r));
  };

  obtenerDetallesResultado = async (resultadoId) => {
    const resultado = await this.#model.getResultadoById(resultadoId);
    if (!resultado) throw new ServiceError("Resultado no encontrado", 404);

    const escenario = await this.#model.getEscenarioById(resultado.escenario_id);
    const oferta = await this.#model.getOfertaById(escenario.oferta_id);

    const porcentajes = resultado.porcentajes_contratos ? JSON.parse(resultado.porcentajes_contratos) : [];
    const tiposOferta = JSON.parse(oferta.tipos_oferta);
    const energiaOfertada = JSON.parse(oferta.energia_ofertada);
    const preciosOfertados = JSON.parse(oferta.precios_ofertados);

    const contratosDetalle = [];
    for (let i = 0; i < porcentajes.length; i++) {
      if (porcentajes[i] > 0) {
        let energiaContrato = 0;
        let costoContrato = 0;
        for (let j = 0; j < 12; j++) {
          energiaContrato += (energiaOfertada[i][j] * porcentajes[i]) / 100;
          costoContrato += (energiaOfertada[i][j] * preciosOfertados[i][j] * porcentajes[i]) / 100;
        }
        contratosDetalle.push({
          indice: i + 1,
          porcentaje_seleccionado: porcentajes[i],
          energia_total: energiaContrato,
          costo_total: costoContrato,
          tarifa_promedio: energiaContrato > 0 ? costoContrato / energiaContrato : 0,
          tipo_oferta: tiposOferta[i],
        });
      }
    }

    return {
      resultado: this.#parseResultadoRow(resultado),
      escenario: {
        id: escenario.id,
        nombre: escenario.nombre,
        oferta_id: escenario.oferta_id,
        fecha_creacion: escenario.fecha_creacion,
        numero_contratos_max: escenario.numero_contratos_max,
        ipp_base: escenario.ipp_base,
      },
      contratos_seleccionados: contratosDetalle,
      metricas_mensuales: {
        energia: JSON.parse(resultado.energia_mensual),
        costo: JSON.parse(resultado.costo_mensual),
        cobertura: JSON.parse(resultado.cobertura_mensual),
      },
    };
  };

  // Detalle de contratos por período (replica el endpoint del origen).
  obtenerDetalleContratosPorPeriodo = async (resultadoId) => {
    const resultado = await this.#model.getResultadoById(resultadoId);
    if (!resultado) throw new ServiceError("Resultado no encontrado", 404);

    const j = (v) => (v ? JSON.parse(v) : []);
    const porcentajesPorPeriodo = j(resultado.porcentajes_por_periodo);
    const energiaCP = j(resultado.energia_por_contrato_periodo);
    const costoCP = j(resultado.costo_por_contrato_periodo);
    const tiposUtilizados = j(resultado.tipos_contratos_utilizados);

    const escenario = await this.#model.getEscenarioById(resultado.escenario_id);
    const oferta = await this.#model.getOfertaById(escenario.oferta_id);

    const descripcionTipo = {
      1: "Todo o nada (0% o 100% en todos los períodos)",
      2: "Porcentaje uniforme (mismo % en todos los períodos)",
      3: "Independiente (% puede variar por período)",
    };

    const contratosDetalle = [];
    porcentajesPorPeriodo.forEach((porcentajes, i) => {
      if (porcentajes.some((p) => p > 0.1)) {
        const tipo = tiposUtilizados[i] ?? 0;
        const energia = energiaCP[i] || new Array(12).fill(0);
        const costo = costoCP[i] || new Array(12).fill(0);
        const energiaTotal = sum(energia);
        const costoTotal = sum(costo);
        const unicos = [...new Set(porcentajes)];
        contratosDetalle.push({
          indice_contrato: i + 1,
          tipo_contrato: tipo,
          descripcion_tipo: descripcionTipo[tipo] || "Tipo desconocido",
          porcentajes_por_periodo: porcentajes,
          energia_por_periodo: energia,
          costo_por_periodo: costo,
          energia_total: energiaTotal,
          costo_total: costoTotal,
          tarifa_promedio: energiaTotal > 0 ? costoTotal / energiaTotal : 0,
          cumple_restricciones:
            (tipo === 1 && unicos.length === 1 && [0, 100].includes(unicos[0])) ||
            (tipo === 2 && unicos.length === 1) ||
            tipo === 3,
        });
      }
    });

    const tipoPeriodo = oferta ? oferta.tipo_periodo : "mensual";
    const periodosNombres =
      tipoPeriodo === "anual"
        ? Array.from({ length: 12 }, (_, i) => String(2026 + i))
        : ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    return {
      resultado_id: resultadoId,
      tipo_periodo: tipoPeriodo,
      periodos_nombres: periodosNombres,
      contratos_seleccionados: contratosDetalle,
      resumen: {
        total_contratos_seleccionados: contratosDetalle.length,
        distribucion_por_tipo: {
          tipo_1: contratosDetalle.filter((c) => c.tipo_contrato === 1).length,
          tipo_2: contratosDetalle.filter((c) => c.tipo_contrato === 2).length,
          tipo_3: contratosDetalle.filter((c) => c.tipo_contrato === 3).length,
        },
        restricciones_cumplidas: contratosDetalle.filter((c) => c.cumple_restricciones).length,
        restricciones_violadas: contratosDetalle.filter((c) => !c.cumple_restricciones).length,
      },
    };
  };

  // Análisis detallado de contratos con métricas avanzadas.
  obtenerAnalisisDetallado = async (resultadoId) => {
    const resultado = await this.#model.getResultadoById(resultadoId);
    if (!resultado) throw new ServiceError("Resultado no encontrado", 404);

    const j = (v) => (v ? JSON.parse(v) : []);
    const porcentajesPorPeriodo = j(resultado.porcentajes_por_periodo);
    const energiaCP = j(resultado.energia_por_contrato_periodo);
    const costoCP = j(resultado.costo_por_contrato_periodo);
    const tiposUtilizados = j(resultado.tipos_contratos_utilizados);

    const escenario = await this.#model.getEscenarioById(resultado.escenario_id);
    const oferta = await this.#model.getOfertaById(escenario.oferta_id);

    const validar = (porcentajes, tipo) => {
      const validacion = { cumple_restricciones: true, detalle_restriccion: "", advertencias: [] };
      if (tipo === 1) {
        const unicos = [...new Set(porcentajes)];
        if (unicos.length > 1) {
          validacion.cumple_restricciones = false;
          validacion.detalle_restriccion = `Tipo 1 debe tener valores iguales. Encontrados: ${unicos}`;
        } else if (unicos.length === 1) {
          const valor = unicos[0];
          if (!(Math.abs(valor) < 0.1 || Math.abs(valor - 100) < 0.1)) {
            validacion.cumple_restricciones = false;
            validacion.detalle_restriccion = `Tipo 1 solo permite 0% o 100%. Valor: ${valor}%`;
          }
        }
      } else if (tipo === 2) {
        const primero = porcentajes[0];
        if (!porcentajes.every((p) => Math.abs(p - primero) < 0.1)) {
          validacion.cumple_restricciones = false;
          validacion.detalle_restriccion = `Tipo 2 debe tener mismo % en todos los períodos. Variación: ${Math.min(...porcentajes)}-${Math.max(...porcentajes)}%`;
        }
      }
      if (Math.max(...porcentajes) > 100) validacion.advertencias.push(`Porcentaje excede 100%: ${Math.max(...porcentajes)}%`);
      if (porcentajes.some((p) => p < 0)) validacion.advertencias.push("Porcentajes negativos encontrados");
      return validacion;
    };

    const metricasContrato = (porcentajes, energia, costo) => {
      const energiaTotal = sum(energia);
      const costoTotal = sum(costo);
      return {
        energia_total: energiaTotal,
        costo_total: costoTotal,
        tarifa_promedio: energiaTotal > 0 ? costoTotal / energiaTotal : 0,
        porcentaje_promedio: mean(porcentajes),
        porcentaje_maximo: Math.max(...porcentajes),
        porcentaje_minimo: Math.min(...porcentajes),
        variabilidad_porcentajes: Math.max(...porcentajes) - Math.min(...porcentajes),
        periodos_activos: porcentajes.filter((p) => p > 0.1).length,
        uniformidad: 1 - (Math.max(...porcentajes) - Math.min(...porcentajes)) / 100,
        eficiencia_costo_energia: energiaTotal > 0 ? costoTotal / energiaTotal : Infinity,
      };
    };

    const descripcionTipo = {
      1: "Todo o Nada (0% o 100% uniforme en todos los períodos)",
      2: "Porcentaje Uniforme (mismo % en todos los períodos)",
      3: "Independiente (% puede variar libremente por período)",
    };

    const contratosDetalle = [];
    porcentajesPorPeriodo.forEach((porcentajes, i) => {
      if (porcentajes.some((p) => p > 0.1)) {
        const tipo = tiposUtilizados[i] ?? 1;
        const energia = energiaCP[i] || new Array(12).fill(0);
        const costo = costoCP[i] || new Array(12).fill(0);
        const mc = metricasContrato(porcentajes, energia, costo);
        contratosDetalle.push({
          indice_contrato: i + 1,
          tipo_contrato: tipo,
          descripcion_tipo: descripcionTipo[tipo] || "Tipo desconocido",
          porcentajes_por_periodo: porcentajes,
          energia_por_periodo: energia,
          costo_por_periodo: costo,
          metricas: mc,
          validacion: validar(porcentajes, tipo),
          contribucion_energia_total: resultado.energia_total_comprada > 0 ? (sum(energia) / resultado.energia_total_comprada) * 100 : 0,
          contribucion_costo_total: resultado.costo_total > 0 ? (sum(costo) / resultado.costo_total) * 100 : 0,
        });
      }
    });

    const tipoPeriodo = oferta ? oferta.tipo_periodo : "mensual";
    const periodosNombres =
      tipoPeriodo === "anual"
        ? Array.from({ length: 12 }, (_, i) => String(2026 + i))
        : ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const cumplidas = contratosDetalle.filter((c) => c.validacion.cumple_restricciones).length;

    return {
      resumen: {
        informacion_general: {
          resultado_id: resultadoId,
          tipo_periodo: tipoPeriodo,
          periodos_nombres: periodosNombres,
          total_contratos_disponibles: porcentajesPorPeriodo.length,
          total_contratos_seleccionados: contratosDetalle.length,
        },
        distribucion_por_tipo: {
          tipo_1: contratosDetalle.filter((c) => c.tipo_contrato === 1).length,
          tipo_2: contratosDetalle.filter((c) => c.tipo_contrato === 2).length,
          tipo_3: contratosDetalle.filter((c) => c.tipo_contrato === 3).length,
        },
        validacion_global: {
          restricciones_cumplidas: cumplidas,
          restricciones_violadas: contratosDetalle.length - cumplidas,
          porcentaje_cumplimiento: contratosDetalle.length ? (cumplidas / contratosDetalle.length) * 100 : 100,
        },
        metricas_globales: {
          energia_total_contratada: resultado.energia_total_comprada,
          cobertura_porcentual: resultado.cobertura_porcentual,
          tarifa_ponderada: resultado.tarifa_ponderada,
          costo_total: resultado.costo_total,
          error_cuadratico_medio: resultado.error_cuadratico_medio,
        },
        analisis_eficiencia: {
          contratos_mas_eficientes: contratosDetalle
            .map((c) => ({ contrato: c.indice_contrato, eficiencia: c.metricas.eficiencia_costo_energia }))
            .sort((a, b) => a.eficiencia - b.eficiencia)
            .slice(0, 3),
          contratos_mayor_contribucion: contratosDetalle
            .map((c) => ({ contrato: c.indice_contrato, contribucion: c.contribucion_energia_total }))
            .sort((a, b) => b.contribucion - a.contribucion)
            .slice(0, 3),
        },
      },
      contratos_detalle: contratosDetalle,
    };
  };

  obtenerResumenEscenario = async (escenarioId) => {
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);

    const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
    const resumen = {
      escenario: {
        id: escenario.id,
        nombre: escenario.nombre,
        ipp_base: escenario.ipp_base,
        fecha_creacion: escenario.fecha_creacion,
      },
      estado: mejor ? "completado" : "pendiente",
      resultados: null,
    };

    if (mejor) {
      resumen.resultados = {
        cobertura_porcentual: Number(mejor.cobertura_porcentual?.toFixed(2)),
        tarifa_ponderada: Number(mejor.tarifa_ponderada?.toFixed(2)),
        costo_total_millones: Number((mejor.costo_total / 1e6).toFixed(2)),
        energia_total_gwh: Number((mejor.energia_total_comprada / 1000).toFixed(2)),
        error_cuadratico: Number(mejor.error_cuadratico_medio?.toFixed(3)),
        fecha_optimizacion: mejor.fecha_ejecucion,
      };
    }
    return resumen;
  };

  // ─── Comparación / IPP ──────────────────────────────────────────────────────

  compararEscenarios = async (escenarioIds) => {
    const comparacion = {
      escenarios: [],
      resumen: { mejor_cobertura: null, mejor_tarifa: null, mejor_balance: null },
    };
    let mejorCobertura = { valor: 0, escenario: null };
    let mejorTarifa = { valor: Infinity, escenario: null };
    let mejorBalance = { valor: 0, escenario: null };

    for (const escenarioId of escenarioIds) {
      const escenario = await this.#model.getEscenarioById(escenarioId);
      if (!escenario) continue;
      const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
      if (!mejor) continue;

      const info = {
        id: escenario.id,
        nombre: escenario.nombre,
        ipp_base: escenario.ipp_base,
        numero_contratos_max: escenario.numero_contratos_max,
        cobertura_porcentual: mejor.cobertura_porcentual,
        tarifa_ponderada: mejor.tarifa_ponderada,
        costo_total: mejor.costo_total,
        error_cuadratico: mejor.error_cuadratico_medio,
        energia_total: mejor.energia_total_comprada,
      };
      comparacion.escenarios.push(info);

      if (mejor.cobertura_porcentual > mejorCobertura.valor) mejorCobertura = { valor: mejor.cobertura_porcentual, escenario: info };
      if (mejor.tarifa_ponderada < mejorTarifa.valor) mejorTarifa = { valor: mejor.tarifa_ponderada, escenario: info };
      const balance = mejor.cobertura_porcentual / mejor.tarifa_ponderada;
      if (balance > mejorBalance.valor) mejorBalance = { valor: balance, escenario: info };
    }

    comparacion.resumen.mejor_cobertura = mejorCobertura.escenario;
    comparacion.resumen.mejor_tarifa = mejorTarifa.escenario;
    comparacion.resumen.mejor_balance = mejorBalance.escenario;
    return comparacion;
  };

  actualizarIpp = async (escenarioId, nuevoIpp) => {
    const escenario = await this.#model.getEscenarioById(escenarioId);
    if (!escenario) throw new ServiceError("Escenario no encontrado", 404);

    const ippAnterior = escenario.ipp_base;
    await this.#model.updateEscenarioIpp(escenarioId, nuevoIpp);
    await this.#model.deleteResultadosByEscenario(escenarioId);

    return {
      id: escenario.id,
      nombre: escenario.nombre,
      ipp_anterior: ippAnterior,
      ipp_nuevo: nuevoIpp,
      cambio_porcentual: ((nuevoIpp - ippAnterior) / ippAnterior) * 100,
      mensaje: `IPP actualizado de ${ippAnterior} a ${nuevoIpp}. Resultados anteriores eliminados.`,
    };
  };

  guardarConfiguracionIpp = async ({ fecha_vigencia, valor_ipp, descripcion, usuario_id }) => {
    const fila = await this.#model.insertConfiguracionIpp([
      fecha_vigencia,
      valor_ipp,
      descripcion,
      usuario_id ?? null,
    ]);
    return { mensaje: "Configuración IPP guardada", id: fila.id };
  };

  listarConfiguracionesIpp = async () => {
    const filas = await this.#model.listConfiguracionesIpp();
    return filas.map((c) => ({
      id: c.id,
      fecha_vigencia: c.fecha_vigencia,
      valor_ipp: c.valor_ipp,
      descripcion: c.descripcion,
      usuario_id: c.usuario_id,
    }));
  };

  // ─── Gráficas ───────────────────────────────────────────────────────────────

  obtenerGraficaCobertura = async (escenarioId) => {
    const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
    if (!mejor) throw new ServiceError("No hay resultados para este escenario", 404);

    const escenario = await this.#model.getEscenarioById(escenarioId);
    const oferta = await this.#model.getOfertaById(escenario.oferta_id);

    const energiaReserva = JSON.parse(oferta.energia_reserva);
    const energiaContratada = JSON.parse(mejor.energia_mensual);
    const tipoPeriodo = oferta.tipo_periodo;

    let categorias;
    if (tipoPeriodo === "anual") {
      categorias = oferta.anios_datos
        ? JSON.parse(oferta.anios_datos).map((a) => String(a))
        : Array.from({ length: 12 }, (_, i) => String(2026 + i));
    } else {
      categorias = oferta.meses_datos
        ? JSON.parse(oferta.meses_datos)
        : ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    }

    return {
      tipo: `cobertura_${tipoPeriodo}`,
      datos: {
        categorias,
        series: [
          { nombre: "Energía Solicitada", datos: energiaReserva },
          { nombre: "Energía Contratada", datos: energiaContratada },
        ],
      },
      cobertura_total: mejor.cobertura_porcentual,
      tipo_periodo: tipoPeriodo,
      unidades: tipoPeriodo === "anual" ? "GWh" : "MWh",
    };
  };

  obtenerGraficaPareto = async (escenarioIdsStr) => {
    const ids = escenarioIdsStr.split(",").map((id) => parseInt(id.trim(), 10));
    const series = [];
    for (const escenarioId of ids) {
      const resultados = await this.#model.getResultadosMultiobjByEscenario(escenarioId);
      if (resultados.length) {
        series.push({
          nombre: `Escenario ${escenarioId}`,
          datos: resultados.map((r) => ({
            x: r.energia_total_comprada,
            y: r.tarifa_ponderada,
            cobertura: r.cobertura_porcentual,
          })),
        });
      }
    }
    return {
      tipo: "frente_pareto",
      datos: { series, ejes: { x: "Energía Total Comprada", y: "Tarifa Ponderada" } },
    };
  };

  // ─── Exportación ────────────────────────────────────────────────────────────

  exportarResultados = async (escenarioIds, formato = "excel") => {
    if (formato === "json") return this.#exportarJson(escenarioIds);
    if (formato === "excel") return this.#exportarExcel(escenarioIds);
    throw new ServiceError(`Formato no soportado: ${formato}`, 422);
  };

  #exportarJson = async (escenarioIds) => {
    const escenarios = [];
    for (const escenarioId of escenarioIds) {
      const escenario = await this.#model.getEscenarioById(escenarioId);
      if (!escenario) continue;
      const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
      escenarios.push({
        escenario: {
          id: escenario.id,
          nombre: escenario.nombre,
          ipp_base: escenario.ipp_base,
          fecha_creacion: escenario.fecha_creacion,
        },
        mejor_resultado: mejor ? this.#parseResultadoRow(mejor) : null,
      });
    }
    return { escenarios };
  };

  // Exportación Excel con ExcelJS (resumen + energía por período).
  #exportarExcel = async (escenarioIds) => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "SphaerAI";
    wb.created = new Date();

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } };
    const titleFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A71C0" } };

    // Hoja 1: Resumen
    const wsResumen = wb.addWorksheet("Resumen");
    wsResumen.mergeCells("A1:H1");
    const titulo = wsResumen.getCell("A1");
    titulo.value = "VALORACIÓN DE OFERTAS - RESUMEN EJECUTIVO";
    titulo.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titulo.fill = titleFill;
    titulo.alignment = { horizontal: "center", vertical: "middle" };

    wsResumen.getCell("A3").value = `Fecha de Generación: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;
    wsResumen.getCell("A4").value = `Escenarios Analizados: ${escenarioIds.length}`;

    const headersResumen = ["Escenario", "IPP Base", "Fecha Creación", "Cobertura %", "Energía Total", "Tarifa Ponderada", "Costo Total", "Contratos Sel."];
    const headerRow = wsResumen.getRow(6);
    headersResumen.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center" };
    });

    let row = 7;
    for (const escenarioId of escenarioIds) {
      const escenario = await this.#model.getEscenarioById(escenarioId);
      if (!escenario) continue;
      const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
      if (!mejor) continue;

      const porcentajesPorPeriodo = mejor.porcentajes_por_periodo ? JSON.parse(mejor.porcentajes_por_periodo) : [];
      const contratosSeleccionados = porcentajesPorPeriodo.filter((p) => p.some((v) => v > 1.0)).length;

      const valores = [
        escenario.nombre,
        escenario.ipp_base,
        escenario.fecha_creacion ? new Date(escenario.fecha_creacion).toISOString().slice(0, 10) : "",
        `${mejor.cobertura_porcentual.toFixed(1)}%`,
        Math.round(mejor.energia_total_comprada).toLocaleString("en-US"),
        mejor.tarifa_ponderada.toFixed(2),
        `$${Math.round(mejor.costo_total).toLocaleString("en-US")}`,
        contratosSeleccionados,
      ];
      const r = wsResumen.getRow(row);
      valores.forEach((v, idx) => {
        const cell = r.getCell(idx + 1);
        cell.value = v;
        cell.alignment = { horizontal: "center" };
      });
      row += 1;
    }
    wsResumen.columns.forEach((col) => { col.width = 18; });

    // Hoja 2: Energía por período
    const wsEnergia = wb.addWorksheet("Energía por Período");
    let currentRow = 1;
    const periodos = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12"];

    for (const escenarioId of escenarioIds) {
      const escenario = await this.#model.getEscenarioById(escenarioId);
      if (!escenario) continue;
      const mejor = await this.#model.getMejorResultadoByEscenario(escenarioId);
      if (!mejor) continue;
      const oferta = await this.#model.getOfertaById(escenario.oferta_id);
      const energiaReserva = JSON.parse(oferta.energia_reserva);

      const subt = wsEnergia.getCell(`A${currentRow}`);
      subt.value = `Escenario: ${escenario.nombre}`;
      subt.font = { size: 12, bold: true };
      currentRow += 2;

      const headers = ["Concepto", ...periodos, "TOTAL"];
      const hr = wsEnergia.getRow(currentRow);
      headers.forEach((h, idx) => {
        const cell = hr.getCell(idx + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = headerFill;
        cell.alignment = { horizontal: "center" };
      });
      currentRow += 1;

      const energiaMensual = JSON.parse(mejor.energia_mensual);
      const coberturaMensual = JSON.parse(mejor.cobertura_mensual);

      const escribirFila = (concepto, arr, total) => {
        const fr = wsEnergia.getRow(currentRow);
        fr.getCell(1).value = concepto;
        arr.forEach((v, idx) => { fr.getCell(idx + 2).value = Number(v.toFixed(1)); });
        fr.getCell(arr.length + 2).value = Number(total.toFixed(1));
        currentRow += 1;
      };

      escribirFila("Energía Solicitada", energiaReserva, sum(energiaReserva));
      escribirFila("Energía Contratada", energiaMensual, sum(energiaMensual));
      escribirFila("Cobertura %", coberturaMensual, mejor.cobertura_porcentual);
      currentRow += 2;
    }
    wsEnergia.columns.forEach((col) => { col.width = 14; });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  };
}