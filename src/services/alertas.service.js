import AlertasModel from "../models/alertas.model.js";
import Logger from "../helpers/logger.js";
import colors from "colors";

class ServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DIAS_SEMANA = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

// p1 = bloque 00:00–01:00 ... p24 = bloque 23:00–00:00 (mismo orden usado en
// las tablas horarias del módulo Pronóstico/Actualización de datos).
const horaLabel = (periodo) => `${String(periodo - 1).padStart(2, "0")}:00`;

const toFechaStr = (fecha) => {
  if (!fecha) return null;
  if (typeof fecha === "string") return fecha.slice(0, 10);
  return fecha.toISOString().slice(0, 10);
};

const round = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;

export default class AlertasService {
  static instance;
  static getInstance() {
    if (!AlertasService.instance) {
      AlertasService.instance = new AlertasService();
    }
    return AlertasService.instance;
  }

  #model = AlertasModel.getInstance();

  // ─── Configuración ────────────────────────────────────────────────────────

  getConfig = async (session) => {
    return this.#model.getConfig(session);
  };

  updateConfig = async (session, categoria, cfg) => {
    if (!["mape", "demanda"].includes(categoria)) {
      throw new ServiceError(`Categoría de alerta no soportada: ${categoria}`, 400);
    }
    const actualizado = await this.#model.updateConfig(session, categoria, cfg);
    if (!actualizado) {
      throw new ServiceError(`No se encontró configuración para la categoría ${categoria}`, 404);
    }
    return actualizado;
  };

  // ─── Listado + KPIs (Panel de alertas) ───────────────────────────────────────

  listarAlertas = async (session, filtros = {}) => {
    const { categoria, ...resto } = filtros;
    const base = await this.#model.listarAlertas(session, resto);
    const rows = categoria && categoria !== "todas"
      ? base.filter((a) => a.categoria === categoria)
      : base;

    const tabs = {
      todas: base.length,
      mape: base.filter((a) => a.categoria === "mape").length,
      demanda: base.filter((a) => a.categoria === "demanda").length,
    };

    const mapeUltimos7 = base.filter((a) => {
      if (a.categoria !== "mape") return false;
      const dias = (Date.now() - new Date(a.creado_en).getTime()) / 86400000;
      return dias <= 7;
    });
    const precision = mapeUltimos7.length
      ? round(100 - mapeUltimos7.reduce((acc, a) => acc + Number(a.metrica_valor), 0) / mapeUltimos7.length, 1)
      : null;

    const kpis = {
      activas: base.filter((a) => a.estado !== "revisado").length,
      criticas: base.filter((a) => a.estado === "critico").length,
      por_revisar: base.filter((a) => a.estado === "por_revisar").length,
      precision_prom_7_dias: precision,
    };

    return { kpis, tabs, rows };
  };

  // ─── Detalle ──────────────────────────────────────────────────────────────

  obtenerDetalle = async (session, codigo) => {
    const alerta = await this.#model.getAlertaByCodigo(session, codigo);
    if (!alerta) throw new ServiceError(`Alerta ${codigo} no encontrada`, 404);

    const historial = await this.#model.getHistorialByAlertaId(session, codigo);

    let serieHoraria = null;
    let causa = "";

    if (alerta.categoria === "mape") {
      const fechaStr = toFechaStr(alerta.fecha);
      const datos = await this.#model.getRealYPronosticoPorFecha(session, alerta.ucp, fechaStr);
      if (datos) {
        serieHoraria = [];
        for (let h = 1; h <= 24; h++) {
          const real = datos[`r${h}`] != null ? Number(datos[`r${h}`]) : null;
          const pronostico = datos[`f${h}`] != null ? Number(datos[`f${h}`]) : null;
          const errorPct = real ? round((Math.abs(real - pronostico) / Math.abs(real)) * 100) : null;
          serieHoraria.push({ hora: horaLabel(h), real, pronostico, error_pct: errorPct });
        }
      }
      const tramo = alerta.periodo_inicio != null
        ? `${horaLabel(alerta.periodo_inicio)}–${horaLabel((alerta.periodo_fin ?? alerta.periodo_inicio) + 1)}`
        : "el día";
      causa = `El tramo ${tramo} concentró el mayor error frente al pronóstico, llevando el MAPE diario a ${Number(alerta.metrica_valor).toFixed(2)}%, por encima del umbral configurado (${Number(alerta.umbral).toFixed(2)}%).`;
    } else if (alerta.categoria === "demanda") {
      const fechaObj = new Date(alerta.fecha);
      const nombreDia = DIAS_SEMANA[fechaObj.getUTCDay()];
      causa = `La demanda total del día se desvió ${Number(alerta.metrica_valor) >= 0 ? "+" : ""}${Number(alerta.metrica_valor).toFixed(1)}% respecto al promedio típico de días ${nombreDia} anteriores, por encima del umbral configurado (±${Number(alerta.umbral).toFixed(1)}%).`;
    }

    return { alerta, historial, serie_horaria: serieHoraria, causa };
  };

  marcarRevisada = async (session, codigo) => {
    const alerta = await this.#model.marcarRevisada(session, codigo);
    if (!alerta) throw new ServiceError(`Alerta ${codigo} no encontrada`, 404);
    await this.#model.insertHistorial(session, codigo, "revisada", "Alerta marcada como revisada por el usuario");
    return alerta;
  };

  // ─── Motor de evaluación ──────────────────────────────────────────────────
  // Evalúa las categorías MAPE y Demanda para todos los mercados (ucp) del
  // tenant identificado por `session`, usando el último día con dato real
  // disponible en cada mercado. Se puede invocar manualmente (endpoint
  // /alertas/evaluar-ahora) o desde el cron multi-tenant (alertas_cron.service.js).
  evaluarTenant = async (session) => {
    await this.#model.ensureTables(session);
    const config = await this.#model.getConfig(session);
    const cfgMape = config.find((c) => c.categoria === "mape");
    const cfgDemanda = config.find((c) => c.categoria === "demanda");

    const ucps = await this.#model.listarUcpActivos(session);
    let creadas = 0;

    for (const ucp of ucps) {
      try {
        const fecha = await this.#model.getUltimaFechaReal(session, ucp);
        if (!fecha) continue;
        const fechaStr = toFechaStr(fecha);

        if (cfgMape) {
          const generada = await this.#evaluarMape(session, ucp, fechaStr, cfgMape);
          if (generada) creadas++;
        }
        if (cfgDemanda) {
          const generada = await this.#evaluarDemanda(session, ucp, fechaStr, cfgDemanda);
          if (generada) creadas++;
        }
      } catch (err) {
        Logger.error(colors.red(`[ALERTAS] Error evaluando mercado ${ucp}: ${err.message}`));
      }
    }

    Logger.info(`[ALERTAS] Evaluación completada: ${ucps.length} mercado(s), ${creadas} alerta(s) nueva(s)`);
    return { mercados_evaluados: ucps.length, alertas_creadas: creadas };
  };

  #evaluarMape = async (session, ucp, fechaStr, cfgMape) => {
    const datos = await this.#model.getRealYPronosticoPorFecha(session, ucp, fechaStr);
    if (!datos) return false;

    const errores = [];
    for (let h = 1; h <= 24; h++) {
      const real = datos[`r${h}`] != null ? Number(datos[`r${h}`]) : null;
      const pronostico = datos[`f${h}`] != null ? Number(datos[`f${h}`]) : null;
      if (!real || pronostico == null) continue;
      errores.push({ hora: h, errorPct: (Math.abs(real - pronostico) / Math.abs(real)) * 100 });
    }
    if (!errores.length) return false;

    const mapeDiario = errores.reduce((acc, e) => acc + e.errorPct, 0) / errores.length;
    if (mapeDiario <= cfgMape.umbral) return false;

    const tramo = this.#peorTramoContiguo(errores, cfgMape.umbral);
    const estado = mapeDiario >= cfgMape.umbral * 1.5 ? "critico" : "por_revisar";
    const descripcion = `MAPE diario superó el umbral configurado (${Number(cfgMape.umbral).toFixed(2)}%) en el tramo ${horaLabel(tramo.inicio)}–${horaLabel(tramo.fin + 1)}`;

    const alerta = await this.#model.insertAlerta(session, {
      ucp,
      categoria: "mape",
      fecha: fechaStr,
      periodo_inicio: tramo.inicio,
      periodo_fin: tramo.fin,
      descripcion,
      metrica_valor: round(mapeDiario),
      metrica_label: "MAPE",
      umbral: cfgMape.umbral,
      estado,
    });
    if (!alerta) return false; // ya existía (mismo ucp/categoria/fecha)
    await this.#model.insertHistorial(session, alerta.codigo, "generada", "Alerta generada automáticamente por el motor de monitoreo MAPE");
    return true;
  };

  #evaluarDemanda = async (session, ucp, fechaStr, cfgDemanda) => {
    const totalReal = await this.#model.getTotalDiarioReal(session, ucp, fechaStr);
    if (totalReal == null) return false;

    const ventana = cfgDemanda.ventana_dias || 30;
    const tipico = await this.#model.getPromedioTotalDiarioTipico(session, ucp, fechaStr, ventana);
    if (!tipico || !tipico.promedio) return false;

    const desviacionPct = ((totalReal - tipico.promedio) / tipico.promedio) * 100;
    if (Math.abs(desviacionPct) <= cfgDemanda.umbral) return false;

    const fechaObj = new Date(`${fechaStr}T00:00:00Z`);
    const nombreDia = DIAS_SEMANA[fechaObj.getUTCDay()];
    const estado = Math.abs(desviacionPct) >= cfgDemanda.umbral * 1.5 ? "critico" : "por_revisar";
    const signo = desviacionPct >= 0 ? "+" : "";
    const descripcion = `La demanda real se desvió ${signo}${round(desviacionPct, 1)}% del comportamiento típico para un ${nombreDia}`;

    const alerta = await this.#model.insertAlerta(session, {
      ucp,
      categoria: "demanda",
      fecha: fechaStr,
      periodo_inicio: null,
      periodo_fin: null,
      descripcion,
      metrica_valor: round(desviacionPct, 1),
      metrica_label: "Demanda",
      umbral: cfgDemanda.umbral,
      estado,
    });
    if (!alerta) return false;
    await this.#model.insertHistorial(session, alerta.codigo, "generada", "Alerta generada automáticamente por el motor de monitoreo de demanda");
    return true;
  };

  // Bloque contiguo de horas con error > umbral que tenga el mayor error
  // promedio; si ninguna hora individual supera el umbral (posible aunque el
  // promedio diario sí lo haga), usa la hora de mayor error como tramo puntual.
  #peorTramoContiguo = (errores, umbral) => {
    const sobreUmbral = errores.filter((e) => e.errorPct > umbral);
    if (!sobreUmbral.length) {
      const peor = errores.reduce((a, b) => (b.errorPct > a.errorPct ? b : a), errores[0]);
      return { inicio: peor.hora, fin: peor.hora };
    }

    const bloques = [];
    let actual = [sobreUmbral[0]];
    for (let i = 1; i < sobreUmbral.length; i++) {
      if (sobreUmbral[i].hora === actual[actual.length - 1].hora + 1) {
        actual.push(sobreUmbral[i]);
      } else {
        bloques.push(actual);
        actual = [sobreUmbral[i]];
      }
    }
    bloques.push(actual);

    const mejorBloque = bloques.reduce((a, b) => {
      const promA = a.reduce((acc, e) => acc + e.errorPct, 0) / a.length;
      const promB = b.reduce((acc, e) => acc + e.errorPct, 0) / b.length;
      return promB > promA ? b : a;
    }, bloques[0]);

    return { inicio: mejorBloque[0].hora, fin: mejorBloque[mejorBloque.length - 1].hora };
  };
}

export { ServiceError };
