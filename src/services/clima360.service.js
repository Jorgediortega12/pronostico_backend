// UI "Clima 360°" del Mapa climático — datos reales.
//
// Ciudades = puntos activos del mapa (clima_mapa_puntos):
//   · actual / por hora / por día / alertas -> tablas del tenant, alimentadas por la
//     ingesta de OpenWeatherMap (clima_mapa_ingesta.service.js).
//   · histórico -> datos_clima (jano_proxy), resuelto por la ciudad/mercado del punto.
//
// Lo que NO existe en ninguna fuente se devuelve null (el frontend lo muestra como
// "—"): índice UV, lluvia acumulada histórica en mm. La sensación térmica histórica
// se ESTIMA con la fórmula de temperatura aparente (Steadman/BoM) a partir de
// temperatura, humedad y viento — y se marca como estimada.

import Clima360Model from "../models/clima360.model.js";
import Logger from "../helpers/logger.js";
import fs from "fs";
import path from "path";
import { tablasAXlsx, tablasACsv, tablasAPdf } from "../utils/generarReporteClima360.js";
import { monthNameSpanish } from "../utils/folders.js";
import colors from "colors";

const model = Clima360Model.getInstance();

const MS_A_KMH = 3.6;

// ─── Utilidades puras (exportadas para pruebas) ──────────────────────────────

export const redondear = (n, d = 1) => (n == null || Number.isNaN(Number(n)) ? null : Math.round(Number(n) * 10 ** d) / 10 ** d);
export const kmh = (ms) => (ms == null ? null : Number(ms) * MS_A_KMH);

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sumarDias = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + n);
  return isoLocal(f);
};
export const hoyIso = () => isoLocal(new Date());

const DIRS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export const direccionViento = (grados) => (grados == null ? null : DIRS[Math.round((((Number(grados) % 360) + 360) % 360) / 45) % 8]);

// Temperatura aparente (°C): AT = T + 0.33·e − 0.70·v − 4.00 (BoM), v en m/s.
export const sensacionAparente = (tC, humedad, vientoMs) => {
  if (tC == null || humedad == null) return null;
  const e = (humedad / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
  return tC + 0.33 * e - 0.7 * (vientoMs ?? 0) - 4.0;
};

// OWM icon -> icono de la UI
export const iconoUi = (icon) => {
  const n = String(icon ?? "").slice(0, 2);
  if (n === "01") return "sol";
  if (n === "02" || n === "03") return "parcial";
  if (n === "09" || n === "10") return "lluvia";
  if (n === "11") return "tormenta";
  return "nublado";
};

const TRADUCCION = {
  "clear sky": "Despejado",
  "few clouds": "Pocas nubes",
  "scattered clouds": "Nubes dispersas",
  "broken clouds": "Parcialmente nublado",
  "overcast clouds": "Nublado",
  mist: "Neblina",
  haze: "Bruma",
  fog: "Niebla",
  "light rain": "Lluvias ligeras",
  "moderate rain": "Lluvias moderadas",
  "heavy intensity rain": "Lluvias fuertes",
  "very heavy rain": "Lluvias muy fuertes",
  "extreme rain": "Lluvias extremas",
  "shower rain": "Chubascos",
  "light intensity shower rain": "Chubascos ligeros",
  drizzle: "Llovizna",
  "light intensity drizzle": "Llovizna ligera",
  thunderstorm: "Tormenta eléctrica",
  "thunderstorm with rain": "Tormenta con lluvia",
  "thunderstorm with light rain": "Tormenta con lluvia ligera",
  "thunderstorm with heavy rain": "Tormenta con lluvia fuerte",
};
export const traducirCondicion = (d) => (d ? (TRADUCCION[String(d).toLowerCase()] ?? d) : null);

// Código de condición OWM (columnas p*_i de datos_clima): 2xx tormenta, 3xx llovizna, 5xx lluvia.
const esLluvia = (codigo) => codigo != null && Number(codigo) >= 200 && Number(codigo) < 600;

// Fila de datos_clima -> arrays de 24
const arreglo = (fila, suf) => Array.from({ length: 24 }, (_, i) => (fila[`p${i + 1}_${suf}`] == null ? null : Number(fila[`p${i + 1}_${suf}`])));

const promedio = (xs) => {
  const v = xs.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const maximo = (xs) => {
  const v = xs.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? Math.max(...v) : null;
};
const minimo = (xs) => {
  const v = xs.filter((x) => x != null && !Number.isNaN(x));
  return v.length ? Math.min(...v) : null;
};

// Agrega filas diarias de datos_clima en un resumen (usado por mensual y por periodo).
export const agregarFilas = (filas) => {
  const t = [];
  const h = [];
  const v = [];
  const s = [];
  let diasLluvia = 0;
  for (const f of filas) {
    const T = arreglo(f, "t");
    const H = arreglo(f, "h");
    const V = arreglo(f, "v");
    const I = arreglo(f, "i");
    t.push(...T);
    h.push(...H);
    v.push(...V);
    s.push(...T.map((x, i) => sensacionAparente(x, H[i], V[i])));
    if (I.some(esLluvia)) diasLluvia++;
  }
  return {
    dias: filas.length,
    tempProm: redondear(promedio(t)),
    tempMax: redondear(maximo(t)),
    tempMin: redondear(minimo(t)),
    sensProm: redondear(promedio(s)),
    sensMax: redondear(maximo(s)),
    humProm: redondear(promedio(h), 0),
    humMax: redondear(maximo(h), 0),
    vientoProm: redondear(kmh(promedio(v)), 0),
    vientoMax: redondear(kmh(maximo(v)), 0),
    diasLluvia,
    lluviaTotalMm: null, // no existe lluvia histórica en mm
  };
};

// ─── Pronóstico (bloques de 3 h) ─────────────────────────────────────────────

// OpenWeatherMap entrega los bloques en UTC (dt_txt); se pasan a la hora local del
// servidor para que "hoy" y "las 14:00" signifiquen lo mismo que ve el usuario.
const aBloques = (horaRows, idPunto) =>
  horaRows
    .filter((r) => r.id_punto === idPunto)
    .flatMap((r) =>
      (r.bloques ?? []).map((b) => {
        const [y, m, d] = r.fecha.split("-").map(Number);
        const [hh, mm] = String(b.hora).split(":").map(Number);
        const ts = new Date(Date.UTC(y, m - 1, d, hh, mm || 0));
        return { ...b, fecha: isoLocal(ts), h: ts.getHours(), ts };
      }),
    );

const bloquesDelDia = (bloques, fecha) => bloques.filter((b) => b.fecha === fecha);

// ── Alertas calculadas sobre el pronóstico ───────────────────────────────────
// Cada alerta es una ventana de bloques consecutivos de 3 h que superan un umbral.
export const REGLAS_ALERTAS = [
  {
    tipo: "lluvia",
    titulo: "Lluvias fuertes",
    medir: (b) => Number(b.rain) || 0,
    niveles: [[20, "Alto"], [10, "Moderado"], [5, "Bajo"]],
    texto: (v) => `Se esperan lluvias de hasta ${redondear(v)} mm en 3 horas.`,
  },
  {
    tipo: "viento",
    titulo: "Vientos fuertes",
    medir: (b) => kmh(b.rafaga ?? b.viento) ?? 0,
    niveles: [[60, "Alto"], [50, "Moderado"], [40, "Bajo"]],
    texto: (v) => `Ráfagas de viento de hasta ${redondear(v, 0)} km/h.`,
  },
  {
    tipo: "calor",
    titulo: "Ola de calor",
    medir: (b) => (b.sensacion != null ? Number(b.sensacion) : b.temp != null ? Number(b.temp) : 0),
    niveles: [[41, "Alto"], [38, "Moderado"], [35, "Bajo"]],
    texto: (v) => `Sensación térmica de hasta ${redondear(v)} °C.`,
  },
  {
    tipo: "frio",
    titulo: "Descenso de temperatura",
    medir: (b) => (b.temp != null ? -Number(b.temp) : -99),
    niveles: [[-4, "Alto"], [-6, "Moderado"], [-8, "Bajo"]], // temp ≤ 4 / ≤ 6 / ≤ 8 °C
    texto: (v) => `Temperatura mínima esperada de ${redondear(-v)} °C.`,
  },
];

const nivelDe = (valor, niveles) => niveles.find(([umbral]) => valor >= umbral)?.[1] ?? null;

export const calcularAlertas = (puntos, horaRows) => {
  const salida = [];
  for (const p of puntos) {
    const bloques = aBloques(horaRows, p.id).sort((a, b) => a.ts - b.ts);
    for (const regla of REGLAS_ALERTAS) {
      let ventana = null;
      const cerrar = () => {
        if (!ventana) return;
        salida.push({
          id_punto: p.id,
          tipo: regla.tipo,
          titulo: regla.titulo,
          nivel: ventana.nivel,
          inicio: ventana.inicio,
          fin: ventana.fin,
          descripcion: regla.texto(ventana.max),
          valor_max: ventana.max,
        });
        ventana = null;
      };
      for (const b of bloques) {
        const v = regla.medir(b);
        const nivel = nivelDe(v, regla.niveles);
        if (!nivel) {
          cerrar();
          continue;
        }
        // fin = fin del bloque (3 h)
        const ini = new Date(b.ts);
        const fin = new Date(b.ts.getTime() + 3 * 3600 * 1000);
        if (!ventana) ventana = { inicio: ini, fin, max: v, nivel };
        else {
          ventana.fin = fin;
          if (v > ventana.max) ventana.max = v;
          const orden = ["Bajo", "Moderado", "Alto"];
          if (orden.indexOf(nivel) > orden.indexOf(ventana.nivel)) ventana.nivel = nivel;
        }
      }
      cerrar();
    }
  }
  return salida;
};

// ─── Servicio ────────────────────────────────────────────────────────────────

export default class Clima360Service {
  static instance;
  static getInstance() {
    if (!Clima360Service.instance) Clima360Service.instance = new Clima360Service();
    return Clima360Service.instance;
  }

  #ids = (ids) =>
    String(ids ?? "")
      .split(",")
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x) && x > 0);

  // Lista de ciudades disponibles (puntos activos).
  ciudades = async (session) => {
    const puntos = await model.puntosConActual(session, []);
    return puntos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      ucp: p.ucp,
      lat: Number(p.lat),
      lng: Number(p.lng),
      tiene_historico: !!(p.ucp || p.accuweather_id || p.openweather_id),
    }));
  };

  #actual = (p, bloquesHoy) => {
    if (p.stemp == null) return null;
    const lluviaHoy = bloquesHoy.reduce((s, b) => s + (Number(b.rain) || 0), 0) + (Number(p.lluvia_1h) || 0);
    return {
      actualizado: p.actual_fecha,
      temp: redondear(p.stemp),
      sensacion: redondear(p.sensacion),
      condicion: traducirCondicion(p.icon_des),
      icono: iconoUi(p.icon),
      humedad: p.humedad != null ? Math.round(p.humedad) : null,
      viento_kmh: redondear(kmh(p.vel_viento), 0),
      viento_dir: direccionViento(p.viento_dir),
      rafaga_kmh: redondear(kmh(p.rafaga), 0),
      presion_hpa: p.presion != null ? Math.round(p.presion) : null,
      lluvia_hoy_mm: redondear(lluviaHoy),
      uv: null,
    };
  };

  // Serie de 24 h de un día: observado de datos_clima si existe + forecast 3 h interpolado.
  #serieHoraria = (filaHistorico, bloquesDia) => {
    const T = filaHistorico ? arreglo(filaHistorico, "t") : Array(24).fill(null);
    const H = filaHistorico ? arreglo(filaHistorico, "h") : Array(24).fill(null);
    const V = filaHistorico ? arreglo(filaHistorico, "v") : Array(24).fill(null);

    // forecast: valores por hora de cada bloque (hora del bloque = hora UTC del dt_txt)
    const porHora = (campo) => {
      const arr = Array(24).fill(null);
      for (const b of bloquesDia) if (b.h >= 0 && b.h < 24 && b[campo] != null) arr[b.h] = Number(b[campo]);
      // interpola entre bloques conocidos
      const idx = arr.map((x, i) => (x != null ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < idx.length - 1; k++) {
        const a = idx[k];
        const b = idx[k + 1];
        for (let i = a + 1; i < b; i++) arr[i] = arr[a] + ((arr[b] - arr[a]) * (i - a)) / (b - a);
      }
      return arr;
    };
    const fT = porHora("temp");
    const fH = porHora("humedad");
    const fV = porHora("viento");
    const fS = porHora("sensacion");
    const precip = Array(24).fill(0);
    for (const b of bloquesDia) {
      // la lluvia de 3 h se reparte en las 3 horas del bloque
      for (let k = 0; k < 3; k++) if (b.h + k < 24) precip[b.h + k] += (Number(b.rain) || 0) / 3;
    }

    return Array.from({ length: 24 }, (_, i) => {
      const temp = T[i] ?? fT[i];
      const humedad = H[i] ?? fH[i];
      const viento = V[i] ?? fV[i];
      const sensacion = fS[i] ?? sensacionAparente(temp, humedad, viento);
      return {
        hora: `${pad(i)}:00`,
        temp: redondear(temp),
        sensacion: redondear(sensacion),
        humedad: humedad != null ? Math.round(humedad) : null,
        viento_kmh: redondear(kmh(viento), 0),
        precip_mm: redondear(precip[i]),
        fuente: T[i] != null ? "observado" : fT[i] != null ? "pronostico" : null,
      };
    });
  };

  // ── Resumen ───────────────────────────────────────────────────────────────
  resumen = async (session, idsTxt, fechaOpt) => {
    const ids = this.#ids(idsTxt);
    const hoy = fechaOpt || hoyIso();
    const puntos = await model.puntosConActual(session, ids);
    if (!puntos.length) return { fecha: hoy, ciudades: [], indicadores: [], resumen_dia: "", actualizacion: null };

    const idsPuntos = puntos.map((p) => p.id);
    const [horaRows, diaRows] = await Promise.all([
      model.horaRango(session, idsPuntos, sumarDias(hoy, -1), sumarDias(hoy, 7)),
      model.diaRango(session, idsPuntos, hoy),
    ]);

    const hasta12m = hoy;
    const desde12m = sumarDias(hoy, -365);

    const ciudades = [];
    for (const p of puntos) {
      const bloques = aBloques(horaRows, p.id);
      const bloquesHoy = bloquesDelDia(bloques, hoy);
      const dias = diaRows.filter((d) => d.id_punto === p.id);

      let historico = [];
      try {
        historico = await model.historicoDiario(p, desde12m, hasta12m);
      } catch (e) {
        Logger.error(colors.red(`[CLIMA360] histórico del punto ${p.id}: ${e.message}`));
      }
      const filaHoy = historico.find((f) => f.fecha === hoy) ?? null;
      const filaAyer = historico.find((f) => f.fecha === sumarDias(hoy, -1)) ?? null;
      const actual = this.#actual(p, bloquesHoy);

      // vs ayer: temperatura actual contra la de ayer a la misma hora
      let vsAyer = null;
      if (actual && filaAyer) {
        const h = new Date().getHours();
        const tAyer = Number(filaAyer[`p${h + 1}_t`]);
        if (!Number.isNaN(tAyer)) vsAyer = redondear(actual.temp - tAyer);
      }

      // pop máximo y ráfaga de hoy+mañana (siguientes 24-48 h)
      const proximos = bloques.filter((b) => b.fecha <= sumarDias(hoy, 1));
      const popMax = maximo(proximos.map((b) => (b.pop != null ? Number(b.pop) : null)));
      const rafagaMax = maximo([...proximos.map((b) => (b.rafaga != null ? Number(b.rafaga) : b.viento != null ? Number(b.viento) : null)), p.rafaga != null ? Number(p.rafaga) : null]);
      const sensMax = maximo([...bloquesHoy.map((b) => (b.sensacion != null ? Number(b.sensacion) : null)), p.sensacion != null ? Number(p.sensacion) : null]);

      // tendencia 7 días: compara el máximo medio del pronóstico con el del histórico reciente
      const maxPron = promedio(dias.map((d) => (d.stemp_dia != null ? Number(d.stemp_dia) : null)));
      const popPron = promedio(dias.map((d) => (d.pop_max != null ? Number(d.pop_max) : null)));
      const maxRecientes = promedio(historico.slice(-14).map((f) => maximo(arreglo(f, "t"))));
      let tendencia = { texto: "Estable", tono: "estable", icono: "sol" };
      if (popPron != null && popPron >= 0.5) tendencia = { texto: "Más lluvioso", tono: "lluvioso", icono: "lluvia" };
      else if (maxPron != null && maxRecientes != null && maxPron - maxRecientes >= 1.5) tendencia = { texto: "Más cálido", tono: "calido", icono: "sol" };
      else if (!dias.length) tendencia = null;

      ciudades.push({
        id: p.id,
        nombre: p.nombre,
        actual: actual ? { ...actual, vs_ayer: vsAyer } : null,
        horario: this.#serieHoraria(filaHoy, bloquesHoy),
        pop_max: popMax != null ? Math.round(popMax * 100) : null,
        rafaga_max_kmh: redondear(kmh(rafagaMax), 0),
        sensacion_max: redondear(sensMax),
        humedad_prom: filaHoy ? redondear(promedio(arreglo(filaHoy, "h")), 0) : actual?.humedad ?? null,
        tendencia_7d: tendencia,
        mensual: this.#mensual(historico),
        resumen_12m: agregarFilas(historico),
        tiene_historico: historico.length > 0,
      });
    }

    return {
      fecha: hoy,
      ciudades,
      indicadores: this.#indicadores(ciudades),
      resumen_dia: this.#textoResumen(ciudades),
      actualizacion: ciudades.map((c) => c.actual?.actualizado).filter(Boolean).sort().pop() ?? null,
      sensacion_estimada: true,
    };
  };

  // Indicadores clave (hoy): la ciudad que lidera cada uno.
  #indicadores = (ciudades) => {
    const lider = (f) => ciudades.filter((c) => f(c) != null).sort((a, b) => f(b) - f(a))[0];
    const out = [];
    const lluvia = lider((c) => c.pop_max);
    if (lluvia) out.push({ id: "pop", titulo: "Prob. de lluvia", ciudad: lluvia.nombre, valor: lluvia.pop_max, unidad: "%" });
    const rafaga = lider((c) => c.rafaga_max_kmh);
    if (rafaga) out.push({ id: "rafaga", titulo: "Ráfaga de viento máx.", ciudad: rafaga.nombre, valor: rafaga.rafaga_max_kmh, unidad: "km/h" });
    const hum = lider((c) => c.humedad_prom);
    if (hum) out.push({ id: "humedad", titulo: "Humedad promedio", ciudad: hum.nombre, valor: hum.humedad_prom, unidad: "%" });
    const sens = lider((c) => c.sensacion_max);
    if (sens) out.push({ id: "sensacion", titulo: "Sensación térmica máx.", ciudad: sens.nombre, valor: sens.sensacion_max, unidad: "°C" });
    return out;
  };

  #textoResumen = (ciudades) => {
    const frases = [];
    const calor = ciudades.filter((c) => (c.sensacion_max ?? 0) >= 35).map((c) => c.nombre);
    if (calor.length) frases.push(`Alta sensación térmica en ${calor.join(", ")}.`);
    const lluvia = ciudades.filter((c) => (c.pop_max ?? 0) >= 60).map((c) => c.nombre);
    if (lluvia.length) frases.push(`Probabilidad alta de lluvias en ${lluvia.join(", ")}.`);
    const viento = ciudades.filter((c) => (c.rafaga_max_kmh ?? 0) >= 40).map((c) => c.nombre);
    if (viento.length) frases.push(`Ráfagas de viento fuertes en ${viento.join(", ")}.`);
    if (!frases.length) return ciudades.length ? "Condiciones estables en las ciudades seleccionadas." : "";
    return `Condiciones variadas en las ciudades seleccionadas. ${frases.join(" ")}`;
  };

  // Agrupa por mes (YYYY-MM) las filas diarias de datos_clima.
  #mensual = (filas) => {
    const porMes = new Map();
    for (const f of filas) {
      const mes = f.fecha.slice(0, 7);
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(f);
    }
    return [...porMes.entries()].map(([mes, fs]) => ({ mes, ...agregarFilas(fs) }));
  };

  // ── Histórico ─────────────────────────────────────────────────────────────
  historico = async (session, idsTxt, desde, hasta) => {
    const puntos = await model.puntosConActual(session, this.#ids(idsTxt));
    const ciudades = [];
    for (const p of puntos) {
      let filas = [];
      try {
        filas = await model.historicoDiario(p, desde, hasta);
      } catch (e) {
        Logger.error(colors.red(`[CLIMA360] histórico del punto ${p.id}: ${e.message}`));
      }
      ciudades.push({ id: p.id, nombre: p.nombre, tiene_historico: filas.length > 0, mensual: this.#mensual(filas), periodo: agregarFilas(filas) });
    }
    return { desde, hasta, ciudades, sensacion_estimada: true };
  };

  // ── Comparador: perfil por hora del día promediado en el rango ───────────
  comparador = async (session, idsTxt, desde, hasta) => {
    const puntos = await model.puntosConActual(session, this.#ids(idsTxt));
    const ciudades = [];
    for (const p of puntos) {
      let filas = [];
      try {
        filas = await model.historicoDiario(p, desde, hasta);
      } catch (e) {
        Logger.error(colors.red(`[CLIMA360] comparador punto ${p.id}: ${e.message}`));
      }
      const horas = Array.from({ length: 24 }, (_, i) => {
        const T = filas.map((f) => (f[`p${i + 1}_t`] != null ? Number(f[`p${i + 1}_t`]) : null));
        const H = filas.map((f) => (f[`p${i + 1}_h`] != null ? Number(f[`p${i + 1}_h`]) : null));
        const V = filas.map((f) => (f[`p${i + 1}_v`] != null ? Number(f[`p${i + 1}_v`]) : null));
        const I = filas.map((f) => (f[`p${i + 1}_i`] != null ? Number(f[`p${i + 1}_i`]) : null));
        const S = T.map((t, k) => sensacionAparente(t, H[k], V[k]));
        const conDato = I.filter((x) => x != null);
        return {
          hora: `${pad(i)}:00`,
          temp: redondear(promedio(T)),
          sensacion: redondear(promedio(S)),
          humedad: redondear(promedio(H), 0),
          viento: redondear(kmh(promedio(V)), 0),
          // sin mm históricos: % de días del periodo con lluvia a esa hora
          precip: conDato.length ? redondear((conDato.filter(esLluvia).length / conDato.length) * 100, 0) : null,
        };
      });
      ciudades.push({ id: p.id, nombre: p.nombre, tiene_historico: filas.length > 0, dias: filas.length, horas });
    }
    return { desde, hasta, ciudades, precip_unidad: "% de días con lluvia", sensacion_estimada: true };
  };

  // ── Pronóstico de una ciudad ──────────────────────────────────────────────
  pronostico = async (session, id, fechaOpt) => {
    const hoy = fechaOpt || hoyIso();
    const [p] = await model.puntosConActual(session, [Number(id)]);
    if (!p) return null;
    const [horaRows, diaRows] = await Promise.all([
      model.horaRango(session, [p.id], sumarDias(hoy, -1), sumarDias(hoy, 8)),
      model.diaRango(session, [p.id], hoy),
    ]);
    const bloques = aBloques(horaRows, p.id);
    const bloquesHoy = bloquesDelDia(bloques, hoy);

    const dias = diaRows.map((d) => {
      const bs = bloquesDelDia(bloques, d.fecha);
      const lluvia = bs.reduce((s, b) => s + (Number(b.rain) || 0), 0);
      return {
        fecha: d.fecha,
        icono: iconoUi(d.icon),
        condicion: traducirCondicion(d.icon_des),
        max: redondear(d.stemp_dia),
        min: redondear(d.stemp_noche),
        prob_lluvia: d.pop_max != null ? Math.round(Number(d.pop_max) * 100) : null,
        viento_kmh: redondear(kmh(promedio(bs.map((b) => (b.viento != null ? Number(b.viento) : null)))), 0),
        viento_dir: direccionViento(promedio(bs.map((b) => (b.viento_dir != null ? Number(b.viento_dir) : null)))),
        lluvia_mm: redondear(lluvia),
        horas: bs.map((b) => ({
          hora: `${pad(b.h)}:00`,
          temp: redondear(b.temp),
          icono: iconoUi(b.icon),
          prob_lluvia: b.pop != null ? Math.round(Number(b.pop) * 100) : null,
          lluvia_mm: redondear(b.rain),
          viento_kmh: redondear(kmh(b.viento), 0),
        })),
      };
    });

    const actual = this.#actual(p, bloquesHoy);
    return {
      id: p.id,
      nombre: p.nombre,
      fecha: hoy,
      actual,
      dias,
      detalle: actual && {
        humedad: actual.humedad,
        viento_kmh: actual.viento_kmh,
        viento_dir: actual.viento_dir,
        rafaga_kmh: actual.rafaga_kmh,
        lluvia_mm: actual.lluvia_hoy_mm,
        uv: null,
        presion_hpa: actual.presion_hpa,
      },
      fuente: "OpenWeatherMap",
    };
  };

  // ── Alertas calculadas sobre el pronóstico (reglas y cálculo: ver calcularAlertas) ──
  alertas = async (session, idsTxt) => {
    const ids = this.#ids(idsTxt);
    const ahora = new Date();
    const puntos = await model.puntosConActual(session, ids);
    if (puntos.length) {
      const horaRows = await model.horaRango(session, puntos.map((p) => p.id), sumarDias(hoyIso(), -1), sumarDias(hoyIso(), 7));
      const calculadas = calcularAlertas(puntos, horaRows);
      await model.guardarAlertas(session, calculadas);
    }
    // últimos 30 días + vigentes
    const desde = `${sumarDias(hoyIso(), -30)}T00:00:00`;
    const filas = await model.listarAlertas(session, ids, desde);
    const parse = (s) => new Date(s);
    const lista = filas.map((a) => {
      const ini = parse(a.inicio);
      const fin = parse(a.fin);
      const estado = fin < ahora ? "resuelta" : ini > ahora ? "programada" : "activa";
      return {
        id: a.id,
        ciudad_id: a.id_punto,
        ciudad: a.ciudad,
        tipo: a.tipo,
        alerta: a.titulo,
        nivel: a.nivel,
        inicio: a.inicio,
        fin: a.fin,
        descripcion: a.descripcion,
        estado,
      };
    });
    return {
      alertas: lista,
      resumen: {
        activas: lista.filter((a) => a.estado === "activa").length,
        programadas: lista.filter((a) => a.estado === "programada").length,
        resueltas: lista.filter((a) => a.estado === "resuelta").length,
      },
    };
  };

  // ── Reportes (descarga directa, sin guardar) ──────────────────────────────
  // tipo: resumen | comparativo | pronostico | alertas
  // variables: temperatura | sensacion | humedad | viento | lluvia
  reporte = async (session, { tipo, ids, desde, hasta, variables, formato }, usuarioId = null) => {
    const idsTxt = (ids ?? []).join(",");
    const vars = new Set(variables?.length ? variables : ["temperatura", "humedad", "viento", "lluvia"]);
    const tablas = [];
    let subtitulo = `Periodo ${desde} a ${hasta}`;

    if (tipo === "resumen") {
      const h = await this.historico(session, idsTxt, desde, hasta);
      const columnas = ["Ciudad", "Mes"];
      if (vars.has("temperatura")) columnas.push("Temp. prom. (°C)", "Temp. máx. (°C)", "Temp. mín. (°C)");
      if (vars.has("sensacion")) columnas.push("Sensación prom.* (°C)", "Sensación máx.* (°C)");
      if (vars.has("humedad")) columnas.push("Humedad prom. (%)", "Humedad máx. (%)");
      if (vars.has("viento")) columnas.push("Viento prom. (km/h)", "Viento máx. (km/h)");
      if (vars.has("lluvia")) columnas.push("Días con lluvia");
      const filas = [];
      for (const c of h.ciudades) {
        for (const m of c.mensual) {
          const f = [c.nombre, m.mes];
          if (vars.has("temperatura")) f.push(m.tempProm, m.tempMax, m.tempMin);
          if (vars.has("sensacion")) f.push(m.sensProm, m.sensMax);
          if (vars.has("humedad")) f.push(m.humProm, m.humMax);
          if (vars.has("viento")) f.push(m.vientoProm, m.vientoMax);
          if (vars.has("lluvia")) f.push(m.diasLluvia);
          filas.push(f);
        }
      }
      tablas.push({ nombre: "Resumen mensual", columnas, filas, nota: "* Sensación estimada (temperatura aparente). Sin lluvia histórica en mm: se cuentan los días con lluvia." });
    } else if (tipo === "comparativo") {
      const c = await this.comparador(session, idsTxt, desde, hasta);
      const defs = [
        ["temperatura", "temp", "Temperatura (°C)"],
        ["sensacion", "sensacion", "Sensación* (°C)"],
        ["humedad", "humedad", "Humedad (%)"],
        ["viento", "viento", "Viento (km/h)"],
        ["lluvia", "precip", "Días con lluvia (%)"],
      ];
      for (const [v, campo, titulo] of defs) {
        if (!vars.has(v)) continue;
        const filas = Array.from({ length: 24 }, (_, i) => [`${pad(i)}:00`, ...c.ciudades.map((x) => x.horas[i]?.[campo] ?? null)]);
        tablas.push({ nombre: titulo, columnas: ["Hora", ...c.ciudades.map((x) => x.nombre)], filas, nota: "Promedio por hora del día en el periodo." });
      }
    } else if (tipo === "pronostico") {
      subtitulo = "Pronóstico de OpenWeatherMap";
      const filas = [];
      for (const id of ids ?? []) {
        const p = await this.pronostico(session, id);
        if (!p) continue;
        for (const d of p.dias) filas.push([p.nombre, d.fecha, d.condicion, d.max, d.min, d.prob_lluvia, d.lluvia_mm, d.viento_kmh]);
      }
      tablas.push({ nombre: "Pronóstico diario", columnas: ["Ciudad", "Fecha", "Condición", "Máx. (°C)", "Mín. (°C)", "Prob. lluvia (%)", "Lluvia (mm)", "Viento (km/h)"], filas });
    } else if (tipo === "alertas") {
      subtitulo = "Alertas de los últimos 30 días";
      const a = await this.alertas(session, idsTxt);
      tablas.push({
        nombre: "Alertas",
        columnas: ["Alerta", "Ciudad", "Tipo", "Nivel", "Estado", "Inicio", "Fin", "Descripción"],
        filas: a.alertas.map((x) => [x.alerta, x.ciudad, x.tipo, x.nivel, x.estado, x.inicio, x.fin, x.descripcion]),
      });
    } else {
      return null;
    }

    const titulos = { resumen: "Resumen climatológico", comparativo: "Comparativo de ciudades", pronostico: "Pronóstico", alertas: "Reporte de alertas" };
    // nombre de archivo ASCII (un acento en Content-Disposition rompe el header)
    const ahora = new Date();
    const hora = `${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
    const base = `Clima360_${titulos[tipo].normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "")}_${hoyIso()}_${hora}`;

    let out;
    if (formato === "csv") out = { buffer: tablasACsv(tablas), filename: `${base}.csv`, contentType: "text/csv; charset=utf-8" };
    else if (formato === "pdf") out = { buffer: await tablasAPdf(tablas, { titulo: titulos[tipo], subtitulo }), filename: `${base}.pdf`, contentType: "application/pdf" };
    else
      out = {
        buffer: await tablasAXlsx(tablas, { titulo: titulos[tipo], subtitulo }),
        filename: `${base}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

    // Se guarda en Descargas (Reportes › Clima › año › mes) y en el listado de reportes.
    // Si guardar falla, igual se entrega el archivo (solo se registra el error).
    const usaPeriodo = tipo === "resumen" || tipo === "comparativo";
    let nombres = "";
    try {
      nombres = (await model.puntosConActual(session, ids ?? [])).map((p) => p.nombre).join(", ");
    } catch {
      /* el nombre de las ciudades es solo informativo */
    }
    try {
      const anio = ahora.getFullYear();
      const mes = monthNameSpanish(ahora.getMonth() + 1);
      const raiz = process.env.REPORT_DIR || path.join(process.cwd(), "reportes");
      const dir = path.join(raiz, "clima", String(anio), mes);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, out.filename), out.buffer);
      out.guardado = await model.registrarReporte(session, {
        nombreArchivo: out.filename,
        rutaArchivo: `~/reportes/clima/${anio}/${mes}/${out.filename}`,
        anio,
        mes,
        tamano: out.buffer.length,
        usuarioId,
        meta: {
          tipo,
          titulo: titulos[tipo],
          formato: formato === "csv" || formato === "pdf" ? formato : "xlsx",
          desde: usaPeriodo ? desde : null,
          hasta: usaPeriodo ? hasta : null,
          ciudades: nombres,
        },
      });
    } catch (e) {
      Logger.error(colors.red(`[CLIMA360] no se pudo guardar el reporte ${out.filename}: ${e.message}`));
      out.guardado = null;
    }
    return out;
  };

  // Listado de reportes generados (más recientes primero).
  reportes = async (session, limite = 30) => model.listarReportes(session, limite);
}
