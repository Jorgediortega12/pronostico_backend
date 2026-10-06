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

// 'modelo' cuenta desviaciones críticas del pronóstico; ni la propia
// recomendación ni 'medida' (un problema del dato fuente, no del modelo)
// deben contar como una desviación más.
const CATEGORIAS_FUERA_DE_MODELO = new Set(["modelo", "medida", "historico"]);

// Alertas de 'medida': tolerancias del detector (el umbral y la ventana sí
// son configurables desde Configuración de alertas; estos no).
const MEDIDA_MIN_DIAS_HISTORIA = 3; // menos que esto no es un "histórico" confiable
const MEDIDA_MIN_PERIODOS_HISTORIA = 12; // un día histórico con menos periodos con dato no cuenta
const MEDIDA_MIN_PERIODOS_HOY = 20; // el día evaluado debe venir (casi) completo: las cargas parciales dejan los últimos periodos en 0
const MEDIDA_FRACCION_SIGNO_CONSISTENTE = 0.8; // historia "de un solo signo" si ≥80% de sus periodos lo son
const MEDIDA_MIN_PERIODOS_INVERTIDOS = 6; // ≥ 6 de 24 periodos (¼ del día) con el signo opuesto = cambio de signo
const MEDIDA_EPS = 1e-9; // valores ~0 no cuentan como signo ni como dato

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
    if (!["mape", "demanda", "periodo", "evento", "clima", "modelo", "medida", "historico"].includes(categoria)) {
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
      medida: base.filter((a) => a.categoria === "medida").length,
      historico: base.filter((a) => a.categoria === "historico").length,
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
    } else if (alerta.categoria === "medida") {
      const det = alerta.detalle || {};
      // Serie horaria: valores del último día vs. promedio por hora de los
      // días previos de la ventana (misma forma que usa el drawer: real /
      // pronostico -> acá "hoy" / "histórico").
      if (det.codigo_rpm) {
        const fechaStr = toFechaStr(alerta.fecha);
        const inicio = toFechaStr(new Date(new Date(`${fechaStr}T00:00:00Z`).getTime() - (det.ventana_dias || 14) * 86400000));
        const filas = (await this.#model.getMedidasVentanaPorMc(session, alerta.ucp, inicio, fechaStr)).filter(
          (f) => f.barra === det.barra && f.codigo_rpm === det.codigo_rpm && f.flujo === det.flujo,
        );
        const hoy = filas.find((f) => f.fecha === fechaStr);
        const previas = filas.filter((f) => f.fecha < fechaStr);
        if (hoy) {
          serieHoraria = [];
          for (let h = 1; h <= 24; h++) {
            const valor = hoy[`p${h}`] != null ? Number(hoy[`p${h}`]) : null;
            const hist = previas.map((f) => (f[`p${h}`] != null ? Number(f[`p${h}`]) : null)).filter((v) => v != null);
            const historico = hist.length ? round(hist.reduce((a, b) => a + b, 0) / hist.length) : null;
            serieHoraria.push({ hora: horaLabel(h), real: valor, pronostico: historico, error_pct: null });
          }
        }
      }
      causa = det.cambio_signo
        ? `La medida ${det.codigo_rpm} (${det.flujo}) de la barra ${det.barra} venía con un signo estable (promedio ${det.media_historia} en los ${det.dias_historia} días previos) y en esta fecha una parte importante de sus periodos aparece con el signo opuesto (promedio ${det.media_hoy}). Suele indicar un cambio en la medición (polaridad, topología o reasignación del medidor) y afecta las curvas, FDA/FDP y el factor de potencia de la barra — revisa la medida en Medidas factores.`
        : `El promedio diario de la medida ${det.codigo_rpm} (${det.flujo}) de la barra ${det.barra} (${det.media_hoy}) se alejó ${Number(alerta.metrica_valor) >= 0 ? "+" : ""}${Number(alerta.metrica_valor).toFixed(1)}% de su promedio de los ${det.dias_historia} días previos (${det.media_historia}), por encima del umbral configurado (±${Number(alerta.umbral).toFixed(0)}%) — revisa que no sea un dato atípico o un cambio en la configuración de la barra.`;
    } else if (alerta.categoria === "historico") {
      const det = alerta.detalle || {};
      const refPico = det.ref_pico;
      if (refPico) {
        const sumarDias = (f, n) => toFechaStr(new Date(new Date(`${f}T00:00:00Z`).getTime() + n * 86400000));
        const filas = await this.#model.getRealYPronosticoRango(session, alerta.ucp, sumarDias(refPico, -7), sumarDias(refPico, 7));
        serieHoraria = filas
          .map((fila) => ({ fecha: toFechaStr(fila.fecha), mape: this.#mapeDeFila(fila) }))
          .filter((x) => x.mape != null)
          .map((x) => ({
            hora: `${x.fecha.slice(8, 10)}/${x.fecha.slice(5, 7)}${x.fecha === refPico ? " ★" : ""}`,
            real: null,
            pronostico: null,
            error_pct: round(x.mape),
          }));
      }
      const fechas = (det.fechas || []).map((f) => `${f.fecha} ← ${f.festivo ? `"${f.festivo}" ` : ""}${f.ref} (${f.mape}%)`).join("; ");
      causa = `En el año anterior, las fechas equivalentes a las próximas superaron el umbral de MAPE configurado (${Number(alerta.umbral).toFixed(1)}%): ${fechas}. El gráfico muestra el MAPE diario de los días alrededor de la fecha de referencia (★). Conviene revisar que el pronóstico de estas fechas incorpore lo que pasó entonces (eventos, clima, cortes, datos atípicos).`;
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
    const criticasUltimosNDias = criticasUltimosNDiasRaw.filter((a) => !CATEGORIAS_FUERA_DE_MODELO.has(a.categoria));

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
  // `hoy` (YYYY-MM-DD) solo se pasa en pruebas para simular otra fecha.
  evaluarTenant = async (session, { hoy = toFechaStr(new Date()) } = {}) => {
    await this.#model.ensureTables(session);
    const config = await this.#model.getConfig(session);
    const cfgMape = config.find((c) => c.categoria === "mape");
    const cfgDemanda = config.find((c) => c.categoria === "demanda");
    const cfgPeriodo = config.find((c) => c.categoria === "periodo");
    const cfgEvento = config.find((c) => c.categoria === "evento");
    const cfgClima = config.find((c) => c.categoria === "clima");
    const cfgModelo = config.find((c) => c.categoria === "modelo");
    const cfgMedida = config.find((c) => c.categoria === "medida");
    const cfgHistorico = config.find((c) => c.categoria === "historico");

    const ucps = await this.#model.listarUcpActivos(session);
    let creadas = 0;

    for (const ucp of ucps) {
      try {
        // 'evento' es por calendario (festivos), no depende de que haya
        // dato real cargado — se evalúa aparte, antes del "continue" de
        // abajo, para que corra siempre.
        if (cfgEvento?.activo) {
          creadas += await this.#evaluarEvento(session, ucp, cfgEvento, hoy);
        }
        // 'historico' también es por calendario (próximos N días vs. el año
        // anterior), no depende del último dato real.
        if (cfgHistorico?.activo) {
          creadas += await this.#evaluarHistorico(session, ucp, cfgHistorico, hoy);
        }

        // 'medida' tampoco depende de actualizaciondatos: mira la tabla
        // medidas (de las barras del mercado) por su propia última fecha.
        if (cfgMedida?.activo) {
          creadas += await this.#evaluarMedidas(session, ucp, cfgMedida);
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
    const criticas = criticasRaw.filter((a) => !CATEGORIAS_FUERA_DE_MODELO.has(a.categoria));
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

  // Medidas: por cada medida (codigo_rpm + flujo) de las barras de un mercado
  // compara el último día con medidas contra los N días previos
  // (cfgMedida.ventana_dias, 14 por defecto):
  //   - Cambio de signo: la historia es de un solo signo y hoy ≥ ¼ de los
  //     periodos vienen con el signo opuesto (p. ej. GIRARDT1 pasó de
  //     -17…-25 a +23…+27). Siempre crítico.
  //   - Salto abrupto: el promedio del día se aleja del promedio histórico
  //     más de cfgMedida.umbral (%), sin cambiar de signo.
  // Un periodo en 0 se toma como "sin dato" (las cargas parciales del día
  // dejan los últimos periodos en 0) y cada medida se evalúa en su último día
  // completo. Se avisa una vez por medida mientras el cambio siga dentro de
  // la ventana, para no repetir la misma alerta cada día.
  #evaluarMedidas = async (session, mc, cfgMedida) => {
    const ultima = await this.#model.getUltimaFechaMedidasPorMc(session, mc);
    if (!ultima) return 0;
    const ultimaStr = toFechaStr(ultima);
    const ventana = cfgMedida.ventana_dias || 14;
    const restarDias = (fechaStr, dias) =>
      toFechaStr(new Date(new Date(`${fechaStr}T00:00:00Z`).getTime() - dias * 86400000));
    // Margen de unos días extra por si el último día de alguna medida está incompleto.
    const filas = await this.#model.getMedidasVentanaPorMc(session, mc, restarDias(ultimaStr, ventana + 3), ultimaStr);
    if (!filas.length) return 0;

    // Agrupa por medida -> { fecha -> [p1..p24, null si no hay dato] }
    const series = new Map();
    for (const fila of filas) {
      const clave = `${fila.barra}|${fila.codigo_rpm}|${fila.flujo}`;
      let serie = series.get(clave);
      if (!serie) {
        serie = { barra: fila.barra, codigo_rpm: fila.codigo_rpm, flujo: fila.flujo, dias: new Map() };
        series.set(clave, serie);
      }
      const valores = [];
      for (let h = 1; h <= 24; h++) {
        const v = fila[`p${h}`] != null ? Number(fila[`p${h}`]) : null;
        valores.push(v != null && Number.isFinite(v) && Math.abs(v) > MEDIDA_EPS ? v : null);
      }
      serie.dias.set(fila.fecha, valores);
    }

    const promedio = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const signo = (v) => (v > MEDIDA_EPS ? 1 : v < -MEDIDA_EPS ? -1 : 0);
    let creadas = 0;

    for (const serie of series.values()) {
      // Último día (dentro de lo traído) con datos suficientes para esta medida.
      const fechasCompletas = [...serie.dias.keys()]
        .filter((f) => serie.dias.get(f).filter((v) => v != null).length >= MEDIDA_MIN_PERIODOS_HOY)
        .sort();
      const fechaStr = fechasCompletas[fechasCompletas.length - 1];
      if (!fechaStr) continue;
      const inicioStr = restarDias(fechaStr, ventana);
      const hoyValidos = serie.dias.get(fechaStr).filter((v) => v != null);

      const mediasHistoria = [];
      const signosHistoria = [];
      for (const [f, valores] of serie.dias) {
        if (f >= fechaStr || f < inicioStr) continue;
        const validos = valores.filter((v) => v != null);
        if (validos.length < MEDIDA_MIN_PERIODOS_HISTORIA) continue;
        mediasHistoria.push(promedio(validos));
        for (const v of validos) signosHistoria.push(signo(v));
      }
      if (mediasHistoria.length < MEDIDA_MIN_DIAS_HISTORIA) continue;

      const mediaHistoria = promedio(mediasHistoria);
      if (Math.abs(mediaHistoria) <= MEDIDA_EPS) continue;
      const signoHistoria = mediaHistoria > 0 ? 1 : -1;
      const conSigno = signosHistoria.filter((x) => x !== 0);
      if (!conSigno.length) continue;
      const fraccionConsistente = conSigno.filter((x) => x === signoHistoria).length / conSigno.length;
      if (fraccionConsistente < MEDIDA_FRACCION_SIGNO_CONSISTENTE) continue; // historia sin signo estable: no hay referencia

      const mediaHoy = promedio(hoyValidos);
      const desviacionPct = ((mediaHoy - mediaHistoria) / Math.abs(mediaHistoria)) * 100;
      const invertidos = hoyValidos.filter((v) => signo(v) === -signoHistoria).length;
      const cambioSigno = invertidos >= MEDIDA_MIN_PERIODOS_INVERTIDOS;
      if (!cambioSigno && Math.abs(desviacionPct) <= cfgMedida.umbral) continue;

      const referencia = `${serie.barra} · ${serie.codigo_rpm} (${serie.flujo})`;
      if (await this.#model.existeAlertaMedidaReciente(session, mc, referencia, inicioStr, fechaStr)) continue;

      const descripcion = cambioSigno
        ? `La medida ${serie.codigo_rpm} (${serie.flujo}) de la barra ${serie.barra} cambió de signo: ${invertidos} de ${hoyValidos.length} periodos con signo ${signoHistoria > 0 ? "negativo" : "positivo"}, frente a un histórico ${signoHistoria > 0 ? "positivo" : "negativo"} (promedio ${round(mediaHistoria)} en los ${mediasHistoria.length} días previos, hoy ${round(mediaHoy)}).`
        : `La medida ${serie.codigo_rpm} (${serie.flujo}) de la barra ${serie.barra} se alejó ${desviacionPct >= 0 ? "+" : ""}${round(desviacionPct, 1)}% de su promedio histórico (${round(mediaHistoria)} en los ${mediasHistoria.length} días previos, hoy ${round(mediaHoy)}).`;
      const estado = cambioSigno || Math.abs(desviacionPct) >= cfgMedida.umbral * 1.5 ? "critico" : "por_revisar";

      const alerta = await this.#model.insertAlerta(session, {
        ucp: mc,
        categoria: "medida",
        fecha: fechaStr,
        periodo_inicio: null,
        periodo_fin: null,
        descripcion,
        metrica_valor: round(desviacionPct, 1),
        metrica_label: cambioSigno ? "Cambio de signo" : "Desviación",
        umbral: cfgMedida.umbral,
        estado,
        referencia,
        detalle: {
          barra: serie.barra,
          codigo_rpm: serie.codigo_rpm,
          flujo: serie.flujo,
          cambio_signo: cambioSigno,
          media_historia: round(mediaHistoria, 3),
          media_hoy: round(mediaHoy, 3),
          dias_historia: mediasHistoria.length,
          ventana_dias: ventana,
        },
      });
      if (!alerta) continue;
      await this.#model.insertHistorial(
        session,
        alerta.codigo,
        "generada",
        "Alerta generada automáticamente por el motor de monitoreo de medidas",
      );
      creadas++;
    }
    return creadas;
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
  #evaluarEvento = async (session, ucp, cfgEvento, hoy = toFechaStr(new Date())) => {
    const anticipacionDias = cfgEvento.ventana_dias || 3;
    const baseMs = new Date(`${hoy}T00:00:00Z`).getTime();
    const limite = toFechaStr(new Date(baseMs + anticipacionDias * 86400000));
    // El chequeo de "festivo nacional faltante" mira más adelante que el
    // recordatorio de "próximo" (que sí usa la anticipación configurada) —
    // si no, apenas cambie de año esto volcaría de una las 18 fechas del
    // año siguiente completo. 90 días da margen real para configurarlo sin
    // saturar el panel con algo que todavía no es urgente.
    const FALTANTE_LOOKAHEAD_DIAS = 90;
    const limiteFaltante = toFechaStr(new Date(baseMs + FALTANTE_LOOKAHEAD_DIAS * 86400000));

    const anio = Number(hoy.slice(0, 4));
    const festivosConfigurados = await this.#model.getFestivosPorUcpDesde(session, ucp, hoy);
    const cfgMapeRef = (await this.#model.getConfig(session)).find((c) => c.categoria === "mape");
    let creadas = 0;

    for (const f of festivosConfigurados) {
      if (f.fecha > limite) continue;
      // Antecedente: cómo le fue al pronóstico en este mismo festivo el año pasado.
      let antecedente = "";
      try {
        const ref = await this.#fechaAnioAnterior(session, ucp, f.fecha, f.nombre);
        const info = await this.#mapeReferencia(session, ucp, ref, Number(cfgMapeRef?.umbral ?? 2.5));
        if (info) antecedente = ` El año pasado (${ref}) el MAPE de este festivo fue ${round(info.mape)}%.`;
      } catch (err) {
        Logger.warn(`[ALERTAS] No se pudo calcular el antecedente del festivo ${f.nombre}: ${err.message}`);
      }
      const descripcion = `Festivo próximo: "${f.nombre}" el ${f.fecha} — revisa que el pronóstico de ese día lo esté tratando como festivo/atípico.${antecedente}`;
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

  // ─── Antecedentes (año anterior) ───────────────────────────────────────────
  // MAPE diario de una fecha (o de una fila real/pronóstico ya leída).
  #mapeDeFila = (fila) => {
    const errores = [];
    for (let h = 1; h <= 24; h++) {
      const real = fila[`r${h}`] != null ? Number(fila[`r${h}`]) : null;
      const pronostico = fila[`f${h}`] != null ? Number(fila[`f${h}`]) : null;
      if (!real || pronostico == null) continue;
      errores.push((Math.abs(real - pronostico) / Math.abs(real)) * 100);
    }
    return errores.length ? errores.reduce((a, b) => a + b, 0) / errores.length : null;
  };

  // Fecha equivalente del año anterior: para un festivo, el mismo festivo
  // (por nombre — la Ley Emiliani lo mueve de fecha cada año); para una
  // fecha normal, el mismo día del calendario.
  #fechaAnioAnterior = async (session, ucp, fechaStr, nombreFestivo) => {
    const [y, m, d] = fechaStr.split("-").map(Number);
    if (nombreFestivo) {
      const f = await this.#model.getFestivoPorNombreEnRango(session, ucp, nombreFestivo, `${y - 1}-01-01`, `${y - 1}-12-31`);
      if (f) return f.fecha;
    }
    let ref = new Date(Date.UTC(y - 1, m - 1, d));
    if (ref.getUTCMonth() !== m - 1) ref = new Date(Date.UTC(y - 1, m, 0)); // 29/feb -> 28/feb
    return toFechaStr(ref);
  };

  // MAPE de una fecha de referencia y racha de días seguidos sobre el umbral
  // que la incluye. null si ese día no tiene real + pronóstico guardados.
  #mapeReferencia = async (session, ucp, refStr, umbral) => {
    const sumarDias = (f, n) => toFechaStr(new Date(new Date(`${f}T00:00:00Z`).getTime() + n * 86400000));
    const filas = await this.#model.getRealYPronosticoRango(session, ucp, sumarDias(refStr, -7), sumarDias(refStr, 7));
    const porFecha = new Map();
    for (const fila of filas) {
      const mape = this.#mapeDeFila(fila);
      if (mape != null) porFecha.set(toFechaStr(fila.fecha), mape);
    }
    if (!porFecha.has(refStr)) return null;
    const sobre = (f) => porFecha.has(f) && porFecha.get(f) > umbral;
    let racha = 0;
    if (sobre(refStr)) {
      racha = 1;
      for (let i = 1; sobre(sumarDias(refStr, -i)); i++) racha++;
      for (let i = 1; sobre(sumarDias(refStr, i)); i++) racha++;
    }
    return { mape: porFecha.get(refStr), racha };
  };

  // Recordatorio con antecedentes: para cada fecha de los próximos N días
  // (cfgHistorico.ventana_dias, "anticipación") mira cómo le fue al pronóstico
  // en la misma fecha del año anterior (mismo festivo si es festivo). Si el
  // MAPE de esa fecha superó el umbral, avisa — crítico si fueron
  // cfgHistorico.dias_consecutivos días seguidos o más sobre el umbral, o el
  // MAPE llegó a 1,5× el umbral. Fechas contiguas se agrupan en una sola alerta.
  // Solo avisa si el año anterior tiene real + pronóstico guardados.
  #evaluarHistorico = async (session, ucp, cfgHistorico, hoy) => {
    const anticipacion = cfgHistorico.ventana_dias || 7;
    const minRacha = cfgHistorico.dias_consecutivos || 2;
    const umbral = Number(cfgHistorico.umbral);
    const sumarDias = (f, n) => toFechaStr(new Date(new Date(`${f}T00:00:00Z`).getTime() + n * 86400000));

    const festivos = await this.#model.getFestivosPorUcpDesde(session, ucp, hoy);
    const nombrePorFecha = new Map(festivos.map((f) => [f.fecha, f.nombre]));

    const items = [];
    for (let i = 1; i <= anticipacion; i++) {
      const fecha = sumarDias(hoy, i);
      const festivo = nombrePorFecha.get(fecha) || null;
      const ref = await this.#fechaAnioAnterior(session, ucp, fecha, festivo);
      const info = await this.#mapeReferencia(session, ucp, ref, umbral);
      if (!info || info.mape <= umbral) continue;
      items.push({ fecha, ref, festivo, mape: info.mape, racha: info.racha });
    }
    if (!items.length) return 0;

    // Agrupar fechas consecutivas en rangos.
    const rangos = [];
    for (const it of items) {
      const ultimo = rangos[rangos.length - 1];
      if (ultimo && sumarDias(ultimo[ultimo.length - 1].fecha, 1) === it.fecha) ultimo.push(it);
      else rangos.push([it]);
    }

    let creadas = 0;
    for (const rango of rangos) {
      const pico = rango.reduce((a, b) => (b.mape > a.mape ? b : a));
      const maxRacha = Math.max(...rango.map((r) => r.racha));
      const estado = maxRacha >= minRacha || pico.mape >= umbral * 1.5 ? "critico" : "por_revisar";
      const festivosRango = [...new Set(rango.map((r) => r.festivo).filter(Boolean))];
      const referencia = festivosRango.length ? festivosRango.join(", ").slice(0, 200) : null;

      const cuando = rango.length === 1
        ? rango[0].fecha
        : `${rango[0].fecha} al ${rango[rango.length - 1].fecha}`;
      const sujeto = pico.festivo
        ? `El festivo "${pico.festivo}" del año pasado (${pico.ref})`
        : `La misma fecha del año pasado (${pico.ref})`;
      const rachaTxt = maxRacha >= 2 ? `, dentro de una racha de ${maxRacha} días seguidos sobre el umbral` : "";
      const descripcion = `Fecha cercana con antecedentes (${cuando}): ${sujeto.charAt(0).toLowerCase() + sujeto.slice(1)} tuvo un MAPE de ${round(pico.mape)}% (umbral ${round(umbral)}%)${rachaTxt}. Revisa el pronóstico con más cuidado.`;

      const alerta = await this.#model.insertAlerta(session, {
        ucp,
        categoria: "historico",
        fecha: rango[0].fecha,
        periodo_inicio: null,
        periodo_fin: null,
        descripcion,
        metrica_valor: round(pico.mape),
        metrica_label: "MAPE año anterior",
        umbral,
        estado,
        referencia,
        detalle: {
          dias_consecutivos: minRacha,
          ref_pico: pico.ref,
          fechas: rango.map((r) => ({
            fecha: r.fecha,
            ref: r.ref,
            festivo: r.festivo,
            mape: round(r.mape),
            racha: r.racha,
          })),
        },
      });
      if (!alerta) continue;
      await this.#model.insertHistorial(
        session,
        alerta.codigo,
        "generada",
        "Alerta generada automáticamente por antecedentes del año anterior (MAPE de fechas equivalentes)",
      );
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
