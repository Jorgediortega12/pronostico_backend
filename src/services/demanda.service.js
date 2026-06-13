import DemandaModel from "../models/demanda.model.js";
import Logger from "../helpers/logger.js";
import dotenv from "dotenv";
dotenv.config();

const ML_PORT = parseInt(process.env.DEMANDA_ML_PORT || "8004");
const ML_TIMEOUT = parseInt(process.env.DEMANDA_ML_TIMEOUT || "120000");
const ML_HOSTS = ["127.0.0.1", "localhost"];
const ML_USER = process.env.DEMANDA_ML_USER || "";
const ML_PASSWORD = process.env.DEMANDA_ML_PASSWORD || "";

// El frontend maneja los meses como "YYYY-MM"; la columna `date` exige
// "YYYY-MM-DD". Normaliza a primer día del mes cuando llega sin día.
const normalizeModelDate = (d) => {
  const s = String(d).trim();
  return /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
};

export default class DemandaService {
  static instance;
  static getInstance() {
    if (!DemandaService.instance) {
      DemandaService.instance = new DemandaService();
    }
    return DemandaService.instance;
  }

  #model = DemandaModel.getInstance();
  #mlToken = null;
  #mlTokenExpiry = 0;

  // ─── Helper: obtener token ML (con caché hasta expiración) ───────────────────

  #getMlToken = async () => {
    if (this.#mlToken && Date.now() < this.#mlTokenExpiry) return this.#mlToken;

    for (const host of ML_HOSTS) {
      try {
        const res = await fetch(
          `http://${host}:${ML_PORT}/v1/autenticacion/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `username=${encodeURIComponent(ML_USER)}&password=${encodeURIComponent(ML_PASSWORD)}`,
          },
        );
        if (!res.ok) continue;
        const data = await res.json();
        this.#mlToken = data.access_token;
        // Expira 5 minutos antes del tiempo real para evitar usar token vencido
        this.#mlTokenExpiry = Date.now() + 11 * 60 * 60 * 1000; // 11h (token dura 12h)
        return this.#mlToken;
      } catch {
        continue;
      }
    }
    throw new Error("No se pudo autenticar con el servicio ML");
  };

  // ─── Helper: proxy a ML local (intenta 127.0.0.1 y luego localhost) ─────────

  #callMlApi = async (endpoint, body, timeoutMs = ML_TIMEOUT) => {
    const token = await this.#getMlToken();
    for (const host of ML_HOSTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`http://${host}:${ML_PORT}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          const text = await res.text();
          return { success: false, message: text, statusCode: res.status };
        }
        const data = await res.json();
        return { success: true, data };
      } catch (err) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          return {
            success: false,
            message: "Timeout al comunicarse con el servicio ML",
          };
        }
        if (host === ML_HOSTS[ML_HOSTS.length - 1]) {
          return { success: false, message: err.message };
        }
      }
    }
  };

  // ─── Helper: calcular días laborales, sábados y domingos/festivos ───────────
  // (versión JS — sin librería de festivos; usa cálculo simple)
  #getNumberOfDays = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    let saturdays = 0;
    let sundaysHolidays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay(); // 0=Sun,6=Sat
      if (day === 0) sundaysHolidays++;
      else if (day === 6) saturdays++;
      else workingDays++;
    }
    return { workingDays, saturdays, sundaysHolidays };
  };

  // ─── Predict (proxy ML) ─────────────────────────────────────────────────────

  predict = async (body) => {
    return this.#callMlApi("/v1/forecast/predict/", body);
  };

  predictExcel = async (body) => {
    const token = await this.#getMlToken();
    for (const host of ML_HOSTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ML_TIMEOUT);
      try {
        const res = await fetch(
          `http://${host}:${ML_PORT}/v1/forecast/predict/excel/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        clearTimeout(timer);
        if (!res.ok)
          return {
            success: false,
            message: await res.text(),
            statusCode: res.status,
          };
        const buffer = await res.arrayBuffer();
        return {
          success: true,
          buffer,
          contentType: res.headers.get("content-type"),
        };
      } catch (err) {
        clearTimeout(timer);
        if (host === ML_HOSTS[ML_HOSTS.length - 1])
          return {
            success: false,
            message: err.name === "AbortError" ? "Timeout" : err.message,
          };
      }
    }
  };

  // ─── Day Behavior (proxy ML) ─────────────────────────────────────────────────

  dayBehavior = async (body) => {
    return this.#callMlApi("/v1/forecast/day/behavior/", body);
  };

  dayBehaviorExcel = async (body) => {
    const token = await this.#getMlToken();
    for (const host of ML_HOSTS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ML_TIMEOUT);
      try {
        const res = await fetch(
          `http://${host}:${ML_PORT}/v1/forecast/day/behavior/excel/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        clearTimeout(timer);
        if (!res.ok)
          return {
            success: false,
            message: await res.text(),
            statusCode: res.status,
          };
        const buffer = await res.arrayBuffer();
        return {
          success: true,
          buffer,
          contentType: res.headers.get("content-type"),
        };
      } catch (err) {
        clearTimeout(timer);
        if (host === ML_HOSTS[ML_HOSTS.length - 1])
          return {
            success: false,
            message: err.name === "AbortError" ? "Timeout" : err.message,
          };
      }
    }
  };

  // ─── Monthly Demand ─────────────────────────────────────────────────────────

  getMonthlyDemand = async () => {
    const rows = await this.#model.getMonthlyDemand();
    const result = {};
    for (const row of rows) {
      result[`${row.year}-${String(row.month).padStart(2, "0")}`] = {
        value: row.value,
        percentage: row.percentage,
        climate_type: row.climate_type,
      };
    }
    return result;
  };

  getMonthlyDemandByYear = async (year) => {
    const rows = await this.#model.getMonthlyDemandByYear(year);
    if (!rows.length)
      throw new Error("No se encontraron datos para el año especificado.");
    const result = {};
    for (const row of rows) {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      result[key] = {
        value: row.value,
        percentage: row.percentage,
        climate_type: row.climate_type,
      };
    }
    return result;
  };

  updateMonthlyType = async (values) => {
    // values: { "2023": { "1": "NIÑA", "2": "NORMAL" }, ... }
    for (const year of Object.keys(values)) {
      for (const month of Object.keys(values[year])) {
        await this.#model.updateMonthlyClimateType(
          parseInt(year),
          parseInt(month),
          values[year][month],
        );
      }
    }
    return { message: "Datos actualizados exitosamente" };
  };

  // ─── Monthly Info ───────────────────────────────────────────────────────────

  getMonthlyInfo = async (year, month, prediction) => {
    const stats = await this.#model.getMonthlyStats(year, month);
    if (!stats)
      throw new Error(
        "No se encontraron datos para el año y mes especificados.",
      );

    const historicValue = await this.#model.getMonthlyValueForMonth(
      year,
      month,
    );
    const { workingDays, saturdays, sundaysHolidays } = this.#getNumberOfDays(
      year,
      month,
    );

    return {
      number_of_working_days: workingDays,
      number_of_saturdays: saturdays,
      number_of_sundays_holidays: sundaysHolidays,
      max_value: parseFloat(parseFloat(stats.max_value).toFixed(2)),
      min_value: parseFloat(parseFloat(stats.min_value).toFixed(2)),
      avg_value: parseFloat(parseFloat(stats.avg_value).toFixed(2)),
      error:
        historicValue && prediction != null
          ? parseFloat(
              (
                Math.abs(prediction - historicValue.value) / historicValue.value
              ).toFixed(2),
            )
          : null,
    };
  };

  // ─── Yearly ─────────────────────────────────────────────────────────────────

  getLastYear = async () => {
    const row = await this.#model.getLastDateFromDemands();
    if (!row?.last_date) throw new Error("No se encontraron datos de demanda.");
    const lastYear = new Date(row.last_date).getFullYear();
    return { last_year: lastYear };
  };

  listHistoricYears = async () => {
    return this.#model.getHistoricYears();
  };

  // ─── Type Year ──────────────────────────────────────────────────────────────

  createTypeYearList = async (userId, sessionId) => {
    const years = await this.#model.getAllYearsFromYearlyDemand();
    if (!years.length)
      throw new Error("No se encontraron años en la base de datos.");
    await this.#model.insertTypeYears(years, userId, sessionId);
    return { message: "Lista de años creada exitosamente" };
  };

  updateTypeYearList = async (userId, sessionId, years, types) => {
    await this.#model.updateTypeYears(years, types, userId, sessionId);
    return { message: "Lista de años actualizada exitosamente" };
  };

  getTypeYearList = async (userId, sessionId) => {
    const rows = await this.#model.getTypeYearList(userId, sessionId);
    if (!rows.length) return [];
    return rows.sort((a, b) => a.year - b.year);
  };

  // ─── User Models ─────────────────────────────────────────────────────────────

  createNewModel = async (modelName, userId, sessionId, startDate, endDate) => {
    const row = await this.#model.createUserModel(
      modelName,
      userId,
      sessionId,
      startDate,
      endDate,
    );
    return { message: "Modelo creado exitosamente", model_id: row.id };
  };

  listUserModels = async (userId, sessionId, isAdmin = false) => {
    const rows = isAdmin
      ? await this.#model.getAllModels()
      : await this.#model.getUserModels(userId, sessionId);
    if (!rows.length) return [];
    return rows.map((m) => ({
      id: m.id,
      model_name: m.model_name,
      ...(isAdmin && { user_id: m.user_id, session_id: m.session_id }),
      start_date: new Date(m.start_date).toISOString().split("T")[0],
      end_date: new Date(m.end_date).toISOString().split("T")[0],
    }));
  };

  saveModelValues = async (userId, sessionId, modelId, dates, values) => {
    const models = await this.#model.getUserModels(userId, sessionId);
    const exists = models.some((m) => m.id === modelId);
    if (!exists)
      throw new Error(
        "El modelo especificado no existe para el usuario y sesión.",
      );
    await this.#model.saveModelValues(
      modelId,
      dates.map(normalizeModelDate),
      values,
    );
    return { message: "Datos del modelo actualizados" };
  };

  retrieveModelValues = async (modelId) => {
    const rows = await this.#model.getModelValues(modelId);
    if (!rows.length) {
      const yearlyRows = await this.#model.getYearlyDemands();
      const combined = {};
      for (const r of yearlyRows)
        combined[String(r.year)] = parseFloat(r.demand);
      const yearsSorted = Object.keys(combined).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      const growth = {};
      for (let i = 1; i < yearsSorted.length; i++) {
        const cur = combined[yearsSorted[i]];
        const prev = combined[yearsSorted[i - 1]];
        growth[yearsSorted[i]] = prev !== 0 ? (cur - prev) / prev : 0;
      }
      return {
        dates: [],
        values: [],
        climate_type: [],
        growth,
        annual_totals: {},
        annual_predictions: yearsSorted.map((y) => combined[y]),
        demand_values_for_table: [],
        date_values_for_table: [],
      };
    }

    const dates = rows.map((r) => new Date(r.date).toISOString().split("T")[0]);
    const values = rows.map((r) => parseFloat(r.value));
    const climateType = rows.map((r) => r.climate_type);

    const startDate = new Date(Math.min(...rows.map((r) => new Date(r.date))));
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    const historicRows = await this.#model.getMonthlyDemandBeforeDate(
      startYear,
      startMonth,
    );
    const demandValuesForTable = historicRows.map((r) => r.value);
    const dateValuesForTable = historicRows.map(
      (r) => `${r.year}-${String(r.month).padStart(2, "0")}-01`,
    );

    // Annual totals per model year
    const yearTotals = {};
    for (let i = 0; i < dates.length; i++) {
      const year = String(new Date(rows[i].date).getFullYear());
      yearTotals[year] = (yearTotals[year] || 0) + values[i];
    }
    const annualTotals = yearTotals;

    // Historic yearly demands merged with model values
    const yearlyRows = await this.#model.getYearlyDemands();
    const historicYearlyMap = {};
    for (const r of yearlyRows) {
      if (!yearTotals[String(r.year)]) {
        historicYearlyMap[String(r.year)] = parseFloat(r.demand);
      }
    }
    const combined = { ...historicYearlyMap, ...yearTotals };
    const yearsSorted = Object.keys(combined).sort(
      (a, b) => parseInt(a) - parseInt(b),
    );

    const growth = {};
    for (let i = 1; i < yearsSorted.length; i++) {
      const cur = combined[yearsSorted[i]];
      const prev = combined[yearsSorted[i - 1]];
      growth[yearsSorted[i]] = prev !== 0 ? (cur - prev) / prev : 0;
    }

    const annualPredictions = yearsSorted.map((y) => combined[y]);

    return {
      dates,
      values,
      climate_type: climateType,
      growth,
      annual_totals: annualTotals,
      annual_predictions: annualPredictions,
      demand_values_for_table: demandValuesForTable,
      date_values_for_table: dateValuesForTable,
    };
  };

  // ─── Change Model Monthly Type (climate type + factor adjustments) ───────────

  changeModelMonthlyType = async (modelId, dates, types) => {
    const exists = await this.#model.checkModelExists(modelId);
    if (!exists) throw new Error("El modelo especificado no existe.");

    const rows = await this.#model.getModelValues(modelId);
    const normDates = dates.map(normalizeModelDate);

    const changeValue = (value, currentType, newType) => {
      if (currentType === newType) return value;
      // Normalizar a NORMAL primero
      let normalized = value;
      if (currentType === "NIÑA") normalized = value / 0.9946;
      else if (currentType === "NIÑO") normalized = value / 1.0104;
      // Aplicar nuevo tipo
      if (newType === "NIÑA") return normalized * 0.9946;
      if (newType === "NIÑO") return normalized * 1.0104;
      return normalized;
    };

    for (const row of rows) {
      const dateStr = new Date(row.date).toISOString().split("T")[0];
      const idx = normDates.indexOf(dateStr);
      if (idx !== -1) {
        const newType = types[idx];
        const newValue = changeValue(
          parseFloat(row.value),
          row.climate_type,
          newType,
        );
        await this.#model.updateModelValueClimateAndValue(
          modelId,
          new Date(row.date),
          newValue,
          newType,
        );
      }
    }

    return this.retrieveModelValues(modelId);
  };

  // ─── Change Model Based on Year (redistribute totals using historical percentages) ─

  changeModelBasedOnYear = async (modelId, year, predictYear) => {
    const yearlyDemandByMonth = await this.getMonthlyDemandByYear(year);
    const modelRows = await this.#model.getModelValuesByYear(
      modelId,
      predictYear,
    );
    if (!modelRows.length) {
      const allRows = await this.#model.getModelValues(modelId);
      const years = [
        ...new Set(allRows.map((r) => new Date(r.date).getFullYear())),
      ].sort();
      throw new Error(
        years.length
          ? `El modelo ${modelId} no tiene valores para el año ${predictYear}. Años disponibles: ${years.join(", ")}.`
          : `El modelo ${modelId} no tiene valores guardados. Genere y guarde una predicción antes de calcular la referencia.`,
      );
    }

    const months = modelRows.map((r) => new Date(r.date).getMonth() + 1);
    const values = modelRows.map((r) => parseFloat(r.value));
    const total = values.reduce((a, b) => a + b, 0);

    let percentages = {};
    if (months.length !== 12) {
      const partialTotal = months.reduce((acc, m) => {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        return acc + (yearlyDemandByMonth[key]?.value || 0);
      }, 0);
      for (const m of months) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        percentages[m] =
          partialTotal > 0
            ? (yearlyDemandByMonth[key]?.value || 0) / partialTotal
            : 0;
      }
    } else {
      for (const m of months) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        percentages[m] = yearlyDemandByMonth[key]?.percentage || 0;
      }
    }

    for (let i = 0; i < modelRows.length; i++) {
      const month = months[i];
      const newValue = total * (percentages[month] || 0);
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const climateType = yearlyDemandByMonth[key]?.climate_type || "NORMAL";
      await this.#model.updateModelValueClimateAndValue(
        modelId,
        new Date(modelRows[i].date),
        newValue,
        climateType,
      );
    }

    return this.retrieveModelValues(modelId);
  };
}
