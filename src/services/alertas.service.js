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

// ─── Festivos nacionales de Colombia (Ley 51 de 1983 / Ley Emiliani) ────────
// Cálculo determinístico, sin API externa — validado contra los festivos ya
// configurados en la tabla `festivos` (coincide exacto con los 18
// nacionales; lo que sobra ahí son festivos locales, que este cálculo nunca
// marca como "faltantes" porque solo compara en un sentido: nacional ->
// ¿está configurado?, nunca al revés.
const moverALunesSiguiente = (fecha) => {
  const dow = fecha.getUTCDay();
  if (dow === 1) return fecha;
  const dias = (1 - dow + 7) % 7 || 7;
  const nueva = new Date(fecha);
  nueva.setUTCDate(nueva.getUTCDate() + dias);
  return nueva;
};

// Algoritmo de Gauss/anónimo para el Domingo de Pascua (calendario gregoriano).
const calcularPascua = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, mes - 1, dia));
};

const calcularFestivosNacionalesColombia = (year) => {
  const fecha = (mes, dia) => new Date(Date.UTC(year, mes - 1, dia));
  const sumarDias = (d, n) => new Date(d.getTime() + n * 86400000);

  const fijos = [
    { nombre: "Año Nuevo", fecha: fecha(1, 1) },
    { nombre: "Día del Trabajo", fecha: fecha(5, 1) },
    { nombre: "Día de la Independencia", fecha: fecha(7, 20) },
    { nombre: "Batalla de Boyacá", fecha: fecha(8, 7) },
    { nombre: "Inmaculada Concepción", fecha: fecha(12, 8) },
    { nombre: "Navidad", fecha: fecha(12, 25) },
  ];

  const trasladables = [
    { nombre: "Reyes Magos", fecha: fecha(1, 6) },
    { nombre: "San José", fecha: fecha(3, 19) },
    { nombre: "San Pedro y San Pablo", fecha: fecha(6, 29) },
    { nombre: "Asunción de la Virgen", fecha: fecha(8, 15) },
    { nombre: "Día de la Raza", fecha: fecha(10, 12) },
    { nombre: "Todos los Santos", fecha: fecha(11, 1) },
    { nombre: "Independencia de Cartagena", fecha: fecha(11, 11) },
  ].map((f) => ({ nombre: f.nombre, fecha: moverALunesSiguiente(f.fecha) }));

  const pascua = calcularPascua(year);
  const moviles = [
    { nombre: "Jueves Santo", fecha: sumarDias(pascua, -3) },
    { nombre: "Viernes Santo", fecha: sumarDias(pascua, -2) },
    { nombre: "Ascensión del Señor", fecha: moverALunesSiguiente(sumarDias(pascua, 39)) },
    { nombre: "Corpus Christi", fecha: moverALunesSiguiente(sumarDias(pascua, 60)) },
    { nombre: "Sagrado Corazón", fecha: moverALunesSiguiente(sumarDias(pascua, 68)) },
  ];

  return [...fijos, ...trasladables, ...moviles]
    .map((f) => ({ nombre: f.nombre, fecha: toFechaStr(f.fecha) }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
};

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
    if (!["mape", "demanda", "periodo", "evento", "clima", "modelo"].includes(categoria)) {
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
      periodo: base.filter((a) => a.categoria === "periodo").length,
      evento: base.filter((a) => a.categoria === "evento").length,
      clima: base.filter((a) => a.categoria === "clima").length,
      modelo: base.filter((a) => a.categoria === "modelo").length,
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

    // ─── Contexto adicional para las tarjetas KPI del panel ──────────────
    const mapeTodas = base.filter((a) => a.categoria === "mape");
    const mapeGlobal = mapeTodas.length
      ? round(mapeTodas.reduce((acc, a) => acc + Number(a.metrica_valor), 0) / mapeTodas.length, 1)
      : null;
    const categoriasActivas = new Set(
      base.filter((a) => a.estado !== "revisado").map((a) => a.categoria),
    ).size;
    const hoy = toFechaStr(new Date());
    const porRevisarHoy = base.filter(
      (a) => a.estado === "por_revisar" && toFechaStr(a.creado_en) === hoy,
    ).length;

    // ─── Tendencia vs. el periodo inmediatamente anterior de igual
    // longitud (solo si el filtro trae un rango de fechas explícito) ────
    let tendencias = null;
    if (resto.fecha_inicio && resto.fecha_fin) {
      const inicio = new Date(`${resto.fecha_inicio}T00:00:00Z`);
      const fin = new Date(`${resto.fecha_fin}T00:00:00Z`);
      const diasRango = Math.round((fin - inicio) / 86400000) + 1;
      const finAnterior = toFechaStr(new Date(inicio.getTime() - 86400000));
      const inicioAnterior = toFechaStr(new Date(inicio.getTime() - diasRango * 86400000));

      const basePrevia = await this.#model.listarAlertas(session, {
        ...resto,
        fecha_inicio: inicioAnterior,
        fecha_fin: finAnterior,
      });

      const criticasPrevias = basePrevia.filter((a) => a.estado === "critico").length;
      const mapePrevias = basePrevia.filter((a) => a.categoria === "mape");
      const precisionPrevia = mapePrevias.length
        ? round(100 - mapePrevias.reduce((acc, a) => acc + Number(a.metrica_valor), 0) / mapePrevias.length, 1)
        : null;

      tendencias = {
        criticas_pct: criticasPrevias > 0 ? round(((kpis.criticas - criticasPrevias) / criticasPrevias) * 100, 1) : null,
        precision_pp: precisionPrevia != null && precision != null ? round(precision - precisionPrevia, 1) : null,
      };
    }

    return {
      kpis,
      tabs,
      rows,
      tendencias,
      mape_global: mapeGlobal,
      categorias_activas: categoriasActivas,
      por_revisar_hoy: porRevisarHoy,
    };
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
    } else if (alerta.categoria === "periodo") {
      const tramo = alerta.periodo_inicio != null
        ? `${horaLabel(alerta.periodo_inicio)}–${horaLabel((alerta.periodo_fin ?? alerta.periodo_inicio) + 1)}`
        : "un mismo bloque horario";
      causa = `El tramo ${tramo} viene mostrando un error frente al pronóstico por encima del umbral configurado (${Number(alerta.umbral).toFixed(2)}%) de forma sostenida — un sesgo puntual que un promedio diario no alcanza a mostrar.`;
    } else if (alerta.categoria === "evento") {
      causa = alerta.metrica_label === "Festivo faltante"
        ? `Este festivo es de calendario nacional (Colombia) y no está configurado en los festivos de este mercado — revisa que el pronóstico no lo esté tratando como un día ordinario.`
        : `Este festivo ya está configurado para este mercado y se acerca — revisa que el pronóstico de ese día lo esté tratando como festivo/atípico.`;
    } else if (alerta.categoria === "clima") {
      const signo = Number(alerta.metrica_valor) >= 0 ? "+" : "";
      causa = `La temperatura observada se desvió ${signo}${Number(alerta.metrica_valor).toFixed(1)}°C respecto al comportamiento típico reciente, por encima del umbral configurado (±${Number(alerta.umbral).toFixed(1)}°C) — condiciones distintas a las habituales pueden afectar la demanda proyectada.`;
    } else if (alerta.categoria === "modelo") {
      causa = `Se acumularon ${Number(alerta.metrica_valor)} desviaciones críticas en los últimos días para ${alerta.ucp}, por encima del máximo configurado (${Number(alerta.umbral)}) — un patrón sostenido, no un evento puntual, sugiere que el modelo perdió ajuste con el comportamiento reciente del mercado.`;
    }

    // Recomendación de reentrenamiento: más de N desviaciones críticas
    // acumuladas en los últimos M días (categoría 'modelo' en
    // alertas_config, configurable desde Configuración de alertas) para
    // este mismo mercado sugieren que el modelo se desvió de forma
    // sostenida, no puntual.
    const config = await this.#model.getConfig(session);
    const cfgModelo = config.find((c) => c.categoria === "modelo");
    const ventanaDias = cfgModelo?.ventana_dias || 7;
    const umbralDesviaciones = cfgModelo ? Number(cfgModelo.umbral) : 4;
    const haceNDias = toFechaStr(new Date(Date.now() - ventanaDias * 86400000));
    const criticasUltimosNDiasRaw = await this.#model.listarAlertas(session, {
      ucp: alerta.ucp,
      estado: "critico",
      fecha_inicio: haceNDias,
    });
    // La propia categoría "modelo" no cuenta como una desviación crítica más
    // (evita que la recomendación se retroalimente a sí misma).
    const criticasUltimosNDias = criticasUltimosNDiasRaw.filter((a) => a.categoria !== "modelo");

    return {
      alerta,
      historial,
      serie_horaria: serieHoraria,
      causa,
      criticas_ultimos_7_dias: criticasUltimosNDias.length,
      ventana_reentrenamiento_dias: ventanaDias,
      umbral_reentrenamiento: umbralDesviaciones,
      // Si ya estamos viendo la alerta de categoría "modelo" (la recomendación
      // en sí), no repetir la misma tarjeta debajo — sería redundante.
      sugerir_reentrenamiento:
        alerta.categoria !== "modelo" &&
        cfgModelo?.activo !== false &&
        criticasUltimosNDias.length > umbralDesviaciones,
    };
  };

  marcarRevisada = async (session, codigo) => {
    const alerta = await this.#model.marcarRevisada(session, codigo);
    if (!alerta) throw new ServiceError(`Alerta ${codigo} no encontrada`, 404);
    await this.#model.insertHistorial(session, codigo, "revisada", "Alerta marcada como revisada por el usuario");
    return alerta;
  };

  sugerirReentrenamiento = async (session, codigo) => {
    const alerta = await this.#model.getAlertaByCodigo(session, codigo);
    if (!alerta) throw new ServiceError(`Alerta ${codigo} no encontrada`, 404);
    await this.#model.insertHistorial(
      session,
      codigo,
      "reentreno_sugerido",
      `Reentrenamiento sugerido manualmente por el usuario para el mercado ${alerta.ucp}.`,
    );
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
    const cfgPeriodo = config.find((c) => c.categoria === "periodo");
    const cfgEvento = config.find((c) => c.categoria === "evento");
    const cfgClima = config.find((c) => c.categoria === "clima");
    const cfgModelo = config.find((c) => c.categoria === "modelo");

    const ucps = await this.#model.listarUcpActivos(session);
    let creadas = 0;

    for (const ucp of ucps) {
      try {
        // 'evento' es por calendario (festivos), no depende de que haya
        // dato real cargado — se evalúa aparte, antes del "continue" de
        // abajo, para que corra siempre.
        if (cfgEvento?.activo) {
          creadas += await this.#evaluarEvento(session, ucp, cfgEvento);
        }

        const fecha = await this.#model.getUltimaFechaReal(session, ucp);
        if (!fecha) continue;
        const fechaStr = toFechaStr(fecha);

        if (cfgMape?.activo) {
          const generada = await this.#evaluarMape(session, ucp, fechaStr, cfgMape);
          if (generada) creadas++;
        }
        if (cfgDemanda?.activo) {
          const generada = await this.#evaluarDemanda(session, ucp, fechaStr, cfgDemanda);
          if (generada) creadas++;
        }
        if (cfgPeriodo?.activo) {
          const generada = await this.#evaluarPeriodo(session, ucp, fechaStr, cfgPeriodo);
          if (generada) creadas++;
        }
        if (cfgClima?.activo) {
          const generada = await this.#evaluarClima(session, ucp, fechaStr, cfgClima);
          if (generada) creadas++;
        }
        // 'modelo' va al final: cuenta las críticas generadas por las
        // categorías anteriores (de hoy y de días previos) para decidir si
        // el mercado acumula suficientes desviaciones como para sugerir un
        // reentrenamiento.
        if (cfgModelo?.activo) {
          const generada = await this.#evaluarModelo(session, ucp, fechaStr, cfgModelo);
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

  // Variación climática: temperatura observada del día vs. el promedio
  // móvil de los últimos N días (cfgClima.ventana_dias, 30 por defecto) —
  // a diferencia de Demanda, la temperatura no tiene un patrón semanal
  // fuerte, así que el "típico" acá no filtra por día de la semana. Datos
  // en jano_proxy (datos_clima), conexión fija — no depende de la sesión.
  #evaluarClima = async (session, ucp, fechaStr, cfgClima) => {
    const tempHoy = await this.#model.getTemperaturaPromedioPorFecha(ucp, fechaStr);
    if (tempHoy == null) return false;

    const ventana = cfgClima.ventana_dias || 30;
    const tipico = await this.#model.getTemperaturaPromedioTipico(ucp, fechaStr, ventana);
    if (!tipico || tipico.muestras < 5) return false; // muy poca historia para un "típico" confiable

    const desviacion = tempHoy - tipico.promedio;
    if (Math.abs(desviacion) <= cfgClima.umbral) return false;

    const estado = Math.abs(desviacion) >= cfgClima.umbral * 1.5 ? "critico" : "por_revisar";
    const signo = desviacion >= 0 ? "+" : "";
    const descripcion = `Temperatura observada ${signo}${round(desviacion, 1)}°C respecto al comportamiento típico reciente, por encima del umbral configurado (±${Number(cfgClima.umbral).toFixed(1)}°C).`;

    const alerta = await this.#model.insertAlerta(session, {
      ucp,
      categoria: "clima",
      fecha: fechaStr,
      periodo_inicio: null,
      periodo_fin: null,
      descripcion,
      metrica_valor: round(desviacion, 1),
      metrica_label: "Temperatura",
      umbral: cfgClima.umbral,
      estado,
    });
    if (!alerta) return false;
    await this.#model.insertHistorial(session, alerta.codigo, "generada", "Alerta generada automáticamente por el motor de monitoreo de clima");
    return true;
  };

  // Desempeño del modelo: más de N desviaciones críticas (cfgModelo.umbral,
  // 4 por defecto) acumuladas en los últimos M días (cfgModelo.ventana_dias,
  // 7 por defecto) para un mismo mercado sugieren que el modelo se desvió de
  // forma sostenida — no una desviación puntual — y conviene reentrenar.
  #evaluarModelo = async (session, ucp, fechaStr, cfgModelo) => {
    const ventanaDias = cfgModelo.ventana_dias || 7;
    const umbralDesviaciones = cfgModelo.umbral != null ? Number(cfgModelo.umbral) : 4;
    const haceNDias = toFechaStr(new Date(new Date(`${fechaStr}T00:00:00Z`).getTime() - ventanaDias * 86400000));

    const criticasRaw = await this.#model.listarAlertas(session, {
      ucp,
      estado: "critico",
      fecha_inicio: haceNDias,
      fecha_fin: fechaStr,
    });
    const criticas = criticasRaw.filter((a) => a.categoria !== "modelo");
    if (criticas.length <= umbralDesviaciones) return false;

    const descripcion = `Recomendación de reentrenamiento: ${criticas.length} desviación${criticas.length === 1 ? "" : "es"} crítica${criticas.length === 1 ? "" : "s"} acumulada${criticas.length === 1 ? "" : "s"} en ${ventanaDias} días`;

    const alerta = await this.#model.insertAlerta(session, {
      ucp,
      categoria: "modelo",
      fecha: fechaStr,
      periodo_inicio: null,
      periodo_fin: null,
      descripcion,
      metrica_valor: criticas.length,
      metrica_label: "Desviaciones",
      umbral: umbralDesviaciones,
      estado: "critico",
    });
    if (!alerta) return false;
    await this.#model.insertHistorial(
      session,
      alerta.codigo,
      "generada",
      "Alerta generada automáticamente por acumulación de desviaciones críticas del modelo",
    );
    return true;
  };

  // Desviación por periodo: mismo bloque horario con error por encima del
  // umbral durante N días consecutivos (cfgPeriodo.ventana_dias, 3 por
  // defecto) — a diferencia de MAPE (que mira un solo día), esto detecta
  // un sesgo sostenido en una hora puntual que un promedio diario puede
  // disimular.
  #evaluarPeriodo = async (session, ucp, fechaStr, cfgPeriodo) => {
    const diasConsecutivos = cfgPeriodo.ventana_dias || 3;
    const fechaInicio = toFechaStr(
      new Date(new Date(`${fechaStr}T00:00:00Z`).getTime() - (diasConsecutivos - 1) * 86400000),
    );
    const filas = await this.#model.getRealYPronosticoRango(session, ucp, fechaInicio, fechaStr);
    if (filas.length < diasConsecutivos) return false; // faltan días en el rango

    const fechasRango = filas.map((f) => toFechaStr(f.fecha));
    const errorPorHora = {}; // hora -> { [fecha]: errorPct }
    for (const fila of filas) {
      const fecha = toFechaStr(fila.fecha);
      for (let h = 1; h <= 24; h++) {
        const real = fila[`r${h}`] != null ? Number(fila[`r${h}`]) : null;
        const pronostico = fila[`f${h}`] != null ? Number(fila[`f${h}`]) : null;
        if (!real || pronostico == null) continue;
        (errorPorHora[h] ??= {})[fecha] = (Math.abs(real - pronostico) / Math.abs(real)) * 100;
      }
    }

    // Se busca la hora cuyo error superó el umbral EN TODOS los días del
    // rango; si hay varias, se reporta la de mayor error promedio.
    let peorHora = null;
    let peorPromedio = -Infinity;
    for (let h = 1; h <= 24; h++) {
      const porFecha = errorPorHora[h];
      if (!porFecha) continue;
      const valores = fechasRango.map((f) => porFecha[f]);
      if (valores.some((v) => v == null || v <= cfgPeriodo.umbral)) continue;
      const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      if (promedio > peorPromedio) {
        peorPromedio = promedio;
        peorHora = h;
      }
    }
    if (peorHora == null) return false;

    const estado = peorPromedio >= cfgPeriodo.umbral * 1.5 ? "critico" : "por_revisar";
    const descripcion = `Desviación sostenida en el bloque horario ${horaLabel(peorHora)}–${horaLabel(peorHora + 1)} durante ${diasConsecutivos} días consecutivos`;

    const alerta = await this.#model.insertAlerta(session, {
      ucp,
      categoria: "periodo",
      fecha: fechaStr,
      periodo_inicio: peorHora,
      periodo_fin: peorHora,
      descripcion,
      metrica_valor: round(peorPromedio),
      metrica_label: "MAPE",
      umbral: cfgPeriodo.umbral,
      estado,
    });
    if (!alerta) return false;
    await this.#model.insertHistorial(
      session,
      alerta.codigo,
      "generada",
      `Alerta generada automáticamente por el motor de monitoreo de desviación por periodo (${diasConsecutivos} días consecutivos)`,
    );
    return true;
  };

  // Eventos/festivos — dos chequeos por calendario, independientes de que
  // haya dato real cargado:
  //   1) Recordatorio: un festivo YA configurado para este mercado está a
  //      pocos días (cfgEvento.ventana_dias, "anticipación") — para que se
  //      revise que el pronóstico de ese día lo trate como atípico.
  //   2) Festivo nacional faltante: cruza los festivos nacionales de
  //      Colombia (calculados, Ley Emiliani) contra lo configurado en este
  //      mercado — si falta uno, es una alerta crítica (dato de
  //      configuración, no una desviación del modelo). Nunca marca como
  //      "falta" un festivo local que no sea nacional — solo compara en un
  //      sentido (nacional -> ¿configurado?).
  #evaluarEvento = async (session, ucp, cfgEvento) => {
    const anticipacionDias = cfgEvento.ventana_dias || 3;
    const hoy = toFechaStr(new Date());
    const limite = toFechaStr(new Date(Date.now() + anticipacionDias * 86400000));
    // El chequeo de "festivo nacional faltante" mira más adelante que el
    // recordatorio de "próximo" (que sí usa la anticipación configurada) —
    // si no, apenas cambie de año esto volcaría de una las 18 fechas del
    // año siguiente completo. 90 días da margen real para configurarlo sin
    // saturar el panel con algo que todavía no es urgente.
    const FALTANTE_LOOKAHEAD_DIAS = 90;
    const limiteFaltante = toFechaStr(new Date(Date.now() + FALTANTE_LOOKAHEAD_DIAS * 86400000));

    const anio = new Date().getUTCFullYear();
    const festivosConfigurados = await this.#model.getFestivosPorUcpDesde(session, ucp, hoy);
    let creadas = 0;

    for (const f of festivosConfigurados) {
      if (f.fecha > limite) continue;
      const descripcion = `Festivo próximo: "${f.nombre}" el ${f.fecha} — revisa que el pronóstico de ese día lo esté tratando como festivo/atípico.`;
      const alerta = await this.#model.insertAlerta(session, {
        ucp,
        categoria: "evento",
        fecha: f.fecha,
        periodo_inicio: null,
        periodo_fin: null,
        descripcion,
        metrica_valor: anticipacionDias,
        metrica_label: "Días de anticipación",
        umbral: anticipacionDias,
        estado: "por_revisar",
      });
      if (!alerta) continue; // ya se había avisado de este festivo
      await this.#model.insertHistorial(session, alerta.codigo, "generada", "Recordatorio automático de festivo próximo ya configurado.");
      creadas++;
    }

    const configuradosSet = new Set(festivosConfigurados.map((f) => f.fecha));
    const nacionales = [
      ...calcularFestivosNacionalesColombia(anio),
      ...calcularFestivosNacionalesColombia(anio + 1),
    ];
    for (const nf of nacionales) {
      if (nf.fecha < hoy || nf.fecha > limiteFaltante || configuradosSet.has(nf.fecha)) continue;
      const descripcion = `Falta configurar el festivo nacional "${nf.nombre}" (${nf.fecha}) para este mercado.`;
      const alerta = await this.#model.insertAlerta(session, {
        ucp,
        categoria: "evento",
        fecha: nf.fecha,
        periodo_inicio: null,
        periodo_fin: null,
        descripcion,
        metrica_valor: 0,
        metrica_label: "Festivo faltante",
        umbral: anticipacionDias,
        estado: "critico",
      });
      if (!alerta) continue;
      await this.#model.insertHistorial(session, alerta.codigo, "generada", "Detección automática de festivo nacional no configurado.");
      creadas++;
    }

    return creadas;
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
