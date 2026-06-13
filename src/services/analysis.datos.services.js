import { createConectionPG } from "../helpers/connections.js";

function getGmrDb() {
  return createConectionPG({
    host: process.env.POSTGRES_HOST,
    basededatos: process.env.POSTGRES_DB,
    usuario: process.env.POSTGRES_USER,
    contrasenia: process.env.POSTGRES_PASSWORD,
    puerto: process.env.POSTGRES_PORT || 5433,
  });
}

const _mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const _max  = (arr) => Math.max(...arr);
const _min  = (arr) => Math.min(...arr);

function _aggFn(tipo) {
  if (tipo === 0) return _mean;
  if (tipo === 1) return _max;
  if (tipo === 2) return _min;
  throw new Error("tipo no válido");
}

function _pearson(x, y) {
  const n = x.length;
  const mx = _mean(x), my = _mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

// Alinea las columnas por su etiqueta de fecha: conserva únicamente las
// fechas presentes en TODAS las columnas, en el orden de la primera. Evita
// que series de distinta longitud (p. ej. clima con más meses que demanda)
// produzcan correlaciones NaN/asimétricas.
function _alignByDate(cols) {
  const maps = cols.map(
    (c) => new Map(c.fechas.map((f, i) => [String(f), c.data[i]]))
  );
  const common = cols[0].fechas
    .map(String)
    .filter((f, i, arr) => arr.indexOf(f) === i && maps.every((m) => m.has(f)));
  if (common.length < 2) {
    throw new Error(
      "No hay suficientes fechas en común entre las variables para calcular la correlación"
    );
  }
  return cols.map((c, ci) => ({
    name: c.name,
    data: common.map((f) => maps[ci].get(f)),
  }));
}

function _corrMatrix(cols) {
  const matrix = cols.map((a, i) =>
    cols.map((b, j) => (i === j ? 1 : +_pearson(a.data, b.data).toFixed(8)))
  );
  return { correlation_matrix: matrix, correlation_matrix_labels: cols.map((c) => c.name) };
}

function _easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31);
  const da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mo - 1, da);
}

function _addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function _nextMon(d) {
  const r = new Date(d), dow = r.getDay();
  if (dow !== 1) r.setDate(r.getDate() + (dow === 0 ? 1 : 8 - dow));
  return r;
}
function _ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function _colombianHolidays(year) {
  const s = new Set();
  const add = (d) => s.add(_ymd(d));
  [[0,1],[4,1],[6,20],[7,7],[11,8],[11,25]].forEach(([m, d]) => add(new Date(year, m, d)));
  [[0,6],[2,19],[5,29],[7,15],[9,12],[10,1],[10,11]].forEach(([m, d]) =>
    add(_nextMon(new Date(year, m, d)))
  );

  const e = _easter(year);
  add(_addDays(e, -3)); add(_addDays(e, -2));
  [39, 60, 68].forEach((n) => add(_nextMon(_addDays(e, n))));
  return s;
}

const CLIMA_SELECT = (() => {
  const cols = ["fecha"];
  for (let i = 1; i <= 24; i++) cols.push(`t${i}`);
  for (let i = 1; i <= 24; i++) cols.push(`h${i}`);
  for (let i = 1; i <= 24; i++) cols.push(`v${i}`);
  return cols.join(", ");
})();

// type: "t" | "h" | "v"  →  columnas t1..t24, h1..h24, v1..v24
function _extractHourly(rows, type) {
  const data = [];
  for (const row of rows) {
    for (let i = 1; i <= 24; i++) {
      const v = row[`${type}${i}`];
      if (v == null || isNaN(Number(v)))
        throw new Error(`Dato faltante hora ${i} tipo ${type}`);
      data.push(parseFloat(v));
    }
  }
  return data;
}

function _extractDaily(rows, type) {
  return rows.map((row) => {
    const day = [];
    for (let i = 1; i <= 24; i++) {
      const v = row[`${type}${i}`];
      day.push(v != null && !isNaN(Number(v)) ? parseFloat(v) : 0);
    }
    return day;
  });
}


export class DemandService {
  async get24Demands({ fecha_inicio, fecha_fin }) {
    const db = getGmrDb();
    const { rows } = await db.query(
      `SELECT fecha,
        hora_1,hora_2,hora_3,hora_4,hora_5,hora_6,hora_7,hora_8,
        hora_9,hora_10,hora_11,hora_12,hora_13,hora_14,hora_15,hora_16,
        hora_17,hora_18,hora_19,hora_20,hora_21,hora_22,hora_23,hora_24
       FROM "PRONOSTICO_demands"
       WHERE fecha >= $1 AND fecha <= $2
       ORDER BY fecha ASC`,
      [fecha_inicio, fecha_fin]
    );
    return {
      lista_fechas: rows.map((r) => r.fecha),
      lista_demandas: rows.map((r) =>
        Array.from({ length: 24 }, (_, i) => r[`hora_${i + 1}`])
      ),
    };
  }

  async getDemands({ tipo, fecha_inicio, fecha_fin, año_inicio, año_fin }) {
    const db = getGmrDb();

    if (tipo === 0) {
      const { rows } = await db.query(
        `SELECT fecha,
          hora_1,hora_2,hora_3,hora_4,hora_5,hora_6,hora_7,hora_8,
          hora_9,hora_10,hora_11,hora_12,hora_13,hora_14,hora_15,hora_16,
          hora_17,hora_18,hora_19,hora_20,hora_21,hora_22,hora_23,hora_24,total
         FROM "PRONOSTICO_demands"
         WHERE fecha >= $1 AND fecha <= $2 AND file_type = 'txf'
         ORDER BY fecha ASC`,
        [fecha_inicio, fecha_fin]
      );
      return {
        lista_fechas: rows.map((r) => r.fecha),
        lista_demandas: rows.map((r) => [
          ...Array.from({ length: 24 }, (_, i) => r[`hora_${i + 1}`]),
          r.total,
        ]),
      };
    }

    if (tipo === 1) {
      const { rows } = await db.query(
        `SELECT fecha, total FROM "PRONOSTICO_demands"
         WHERE fecha >= $1 AND fecha <= $2 AND file_type = 'txf'
         ORDER BY fecha ASC`,
        [fecha_inicio, fecha_fin]
      );
      return {
        lista_fechas: rows.map((r) => _ymd(new Date(r.fecha))),
        lista_demandas: rows.map((r) => r.total),
      };
    }

    if (tipo === 2) {
      const { rows } = await db.query(
        `SELECT EXTRACT(YEAR FROM fecha)::int AS year,
                EXTRACT(MONTH FROM fecha)::int AS month,
                SUM(total) AS total
         FROM "PRONOSTICO_demands"
         WHERE fecha >= $1 AND fecha <= $2 AND file_type = 'txf'
         GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
         ORDER BY year, month`,
        [fecha_inicio, fecha_fin]
      );
      return {
        lista_fechas: rows.map(
          (r) => `${r.year}-${String(r.month).padStart(2, "0")}`
        ),
        lista_demandas: rows.map((r) => parseFloat(r.total)),
      };
    }

    if (tipo === 3) {
      const { rows } = await db.query(
        `SELECT EXTRACT(YEAR FROM fecha)::int AS year, SUM(total) AS total
         FROM "PRONOSTICO_demands"
         WHERE fecha >= $1 AND fecha <= $2 AND file_type = 'txf'
         GROUP BY EXTRACT(YEAR FROM fecha)
         ORDER BY year`,
        [`${año_inicio}-01-01`, `${año_fin}-12-31`]
      );
      return {
        lista_fechas: rows.map((r) => r.year),
        lista_demandas: rows.map((r) => parseFloat(r.total)),
      };
    }

    if (tipo === 4) {
      const { rows } = await db.query(
        `SELECT fecha,
          hora_1,hora_2,hora_3,hora_4,hora_5,hora_6,hora_7,hora_8,
          hora_9,hora_10,hora_11,hora_12,hora_13,hora_14,hora_15,hora_16,
          hora_17,hora_18,hora_19,hora_20,hora_21,hora_22,hora_23,hora_24
         FROM "PRONOSTICO_demands"
         WHERE fecha >= $1 AND fecha <= $2
         ORDER BY fecha ASC`,
        [fecha_inicio, fecha_fin]
      );
      const lista_fechas = [], lista_demandas = [];
      for (const r of rows) {
        const dateStr = _ymd(new Date(r.fecha));
        for (let i = 1; i <= 24; i++) {
          lista_fechas.push(`${dateStr} ${i}`);
          lista_demandas.push(r[`hora_${i}`]);
        }
      }
      return { lista_fechas, lista_demandas };
    }

    throw new Error("Tipo no válido");
  }

  async getFirstAndLastDate() {
    const db = getGmrDb();
    const { rows: first } = await db.query(
      `SELECT fecha FROM "PRONOSTICO_demands" ORDER BY fecha ASC LIMIT 1`
    );
    const { rows: last } = await db.query(
      `SELECT fecha FROM "PRONOSTICO_demands"
       WHERE EXTRACT(DAY FROM fecha) = 31 AND EXTRACT(MONTH FROM fecha) = 12
       ORDER BY fecha DESC LIMIT 1`
    );
    return { first_date: first[0].fecha, last_date: last[0].fecha };
  }

  async getFirstAndLastDemandDate() {
    const db = getGmrDb();
    const { rows: first } = await db.query(
      `SELECT fecha FROM "PRONOSTICO_demands" WHERE file_type = 'txf' ORDER BY fecha ASC LIMIT 1`
    );
    const { rows: last } = await db.query(
      `SELECT fecha FROM "PRONOSTICO_demands" WHERE file_type = 'txf' ORDER BY fecha DESC LIMIT 1`
    );
    if (!first.length || !last.length)
      throw new Error("No hay datos de demanda en la base de datos");
    return {
      first_date: _ymd(new Date(first[0].fecha)),
      last_date: _ymd(new Date(last[0].fecha)),
    };
  }
}

// ─── MacroeconomicService ─────────────────────────────────────────────────────
export class MacroeconomicService {
  async #verifyId(id) {
    const db = getGmrDb();
    const { rows } = await db.query(`SELECT id FROM "PRONOSTICO_macroeconomics"`);
    if (!rows.some((r) => r.id === id)) throw new Error("Id no válido");
  }

  async getAllVariables({ año_inicio, año_fin }) {
    const db = getGmrDb();
    const { rows } = await db.query(
      `SELECT eco_id, ano, value FROM "PRONOSTICO_macroeconomics_data"
       WHERE ano >= $1 AND ano <= $2`,
      [año_inicio, año_fin]
    );
    if (!rows.length) return {};

    const ids = [...new Set(rows.map((r) => r.eco_id))].sort((a, b) => a - b);
    const { rows: nameRows } = await db.query(
      `SELECT id, name FROM "PRONOSTICO_macroeconomics" WHERE id = ANY($1)`,
      [ids]
    );
    const nameMap = Object.fromEntries(nameRows.map((r) => [r.id, r.name]));
    const dates = [...new Set(rows.map((r) => r.ano))].sort((a, b) => a - b);

    const response = { lista_fechas: dates };
    for (const id of ids) {
      const name = nameMap[id];
      if (name) response[name] = rows.filter((r) => r.eco_id === id).map((r) => r.value);
    }
    return response;
  }

  async getVariable(id) {
    await this.#verifyId(id);
    const db = getGmrDb();
    const { rows } = await db.query(
      `SELECT ano, value FROM "PRONOSTICO_macroeconomics_data"
       WHERE eco_id = $1 ORDER BY ano`,
      [id]
    );
    if (!rows.length) throw new Error("Id no válido o no hay datos para el id seleccionado");
    return {
      lista_fechas: [...new Set(rows.map((r) => r.ano))].sort((a, b) => a - b),
      lista_variables: rows.map((r) => r.value),
    };
  }

  async getVariableYear(id, fecha_inicio, fecha_fin) {
    await this.#verifyId(id);
    const db = getGmrDb();
    const { rows } = await db.query(
      `SELECT ano, value FROM "PRONOSTICO_macroeconomics_data"
       WHERE eco_id = $1 AND ano >= $2 AND ano <= $3
       ORDER BY ano`,
      [id, fecha_inicio, fecha_fin]
    );
    if (!rows.length) throw new Error("Id no válido o no hay datos para el id seleccionado");
    return {
      lista_fechas: [...new Set(rows.map((r) => r.ano))].sort((a, b) => a - b),
      lista_variables: rows.map((r) => r.value),
    };
  }

  async variableVsDemand({ id, año_inicio, año_fin }) {
    await this.#verifyId(id);
    const demandData = await new DemandService().getDemands({
      tipo: 3,
      año_inicio,
      año_fin,
    });
    if (!demandData) throw new Error("No hay datos de demanda para el rango seleccionado");

    const db = getGmrDb();
    const { rows } = await db.query(
      `SELECT value FROM "PRONOSTICO_macroeconomics_data"
       WHERE eco_id = $1 AND ano >= $2 AND ano <= $3
       ORDER BY ano`,
      [id, año_inicio, año_fin]
    );
    if (!rows.length) throw new Error("No hay datos de la variable para el rango seleccionado");

    return {
      lista_fechas: demandData.lista_fechas,
      lista_demandas: demandData.lista_demandas,
      lista_variables: rows.map((r) => r.value),
    };
  }

  async insertOrUpdateVariable({ id, años, valores }) {
    await this.#verifyId(id);
    const db = getGmrDb();
    const { rows: current } = await db.query(
      `SELECT ano FROM "PRONOSTICO_macroeconomics_data" WHERE eco_id = $1 AND ano = ANY($2)`,
      [id, años]
    );
    const existingYears = current.map((r) => r.ano);

    for (const año of años.filter((a) => !existingYears.includes(a))) {
      await db.query(
        `INSERT INTO "PRONOSTICO_macroeconomics_data" (eco_id, ano, value) VALUES ($1,$2,$3)`,
        [id, año, valores[años.indexOf(año)]]
      );
    }
    for (const año of años.filter((a) => existingYears.includes(a))) {
      await db.query(
        `UPDATE "PRONOSTICO_macroeconomics_data" SET value=$1 WHERE eco_id=$2 AND ano=$3`,
        [valores[años.indexOf(año)], id, año]
      );
    }
    return { valido: "Valores insertados o actualizados correctamente" };
  }

  async deleteColumnValues({ id, años }) {
    await this.#verifyId(id);
    const db = getGmrDb();
    await db.query(
      `DELETE FROM "PRONOSTICO_macroeconomics_data" WHERE eco_id = $1 AND ano = ANY($2)`,
      [id, años]
    );
    return { valido: "Valores eliminados correctamente" };
  }

  async getEconomicsIds() {
    const db = getGmrDb();
    const { rows } = await db.query(`SELECT id, name FROM "PRONOSTICO_macroeconomics"`);
    const labels = {
      ipc: "ipc",
      Crecimiento: "Crecimiento de la población (%) anual",
      "Inflación": "Inflación, deflactor del PIB: series vinculadas (% anual)",
      Comercio: "Comercio de mercaderías (% del PIB)",
      Importaciones: "Importaciones de bienes (balanza de pagos, US$ a precios actuales)",
      Empleo: "Empleo de tiempo parcial, total (% del total de empleo)",
    };
    return Object.fromEntries(rows.map((r) => [r.id, labels[r.name] ?? r.name]));
  }

  async getFirstAndLastDateOfEachVariable() {
    const db = getGmrDb();
    const [{ rows: firsts }, { rows: lasts }, { rows: vars }] = await Promise.all([
      db.query(`SELECT eco_id, MIN(ano) AS first_date FROM "PRONOSTICO_macroeconomics_data" GROUP BY eco_id`),
      db.query(`SELECT eco_id, MAX(ano) AS last_date FROM "PRONOSTICO_macroeconomics_data" GROUP BY eco_id`),
      db.query(`SELECT id, name FROM "PRONOSTICO_macroeconomics"`),
    ]);
    const nameMap = Object.fromEntries(vars.map((r) => [r.id, r.name]));
    const result = {};
    for (const f of firsts) {
      const l = lasts.find((x) => x.eco_id === f.eco_id);
      if (l)
        result[nameMap[f.eco_id] ?? `Variable ${f.eco_id}`] = {
          first_date: f.first_date,
          last_date: l.last_date,
        };
    }
    return result;
  }
}

// ─── ClimateService ───────────────────────────────────────────────────────────
export class ClimateService {
  async #fetchRaw(fecha_inicio, fecha_fin) {
    const db = getGmrDb();
    const sql = `SELECT ${CLIMA_SELECT} FROM "PRONOSTICO_climates" WHERE fecha >= $1 AND fecha <= $2 ORDER BY fecha`;
    const { rows } = await db.query(sql, [fecha_inicio, fecha_fin]);
    return rows;
  }

  async getClimateHour({ fecha_inicio, fecha_fin }) {
    const rows = await this.#fetchRaw(fecha_inicio, fecha_fin);
    if (!rows.length)
      throw new Error(`No se encontraron datos climáticos para ${fecha_inicio} - ${fecha_fin}`);

    const lista_fechas = [];
    for (const row of rows) {
      const d = _ymd(new Date(row.fecha));
      for (let h = 1; h <= 24; h++) lista_fechas.push(`${d} ${h}`);
    }
    return {
      lista_fechas,
      lista_temperaturas: _extractHourly(rows, "t"),
      lista_humedades:    _extractHourly(rows, "h"),
      lista_velocidades:  _extractHourly(rows, "v"),
    };
  }

  async getClimate({ fecha_inicio, fecha_fin }) {
    const rows = await this.#fetchRaw(fecha_inicio, fecha_fin);
    if (!rows.length)
      throw new Error(`No se encontraron datos climáticos para ${fecha_inicio} - ${fecha_fin}`);
    return {
      lista_fechas:      rows.map((r) => _ymd(new Date(r.fecha))),
      lista_temperaturas: _extractDaily(rows, "t"),
      lista_humedades:    _extractDaily(rows, "h"),
      lista_velocidades:  _extractDaily(rows, "v"),
    };
  }

  async getClimateDay({ fecha_inicio, fecha_fin, id, tipo }) {
    const variables = await this.getClimate({ fecha_inicio, fecha_fin });
    const keyMap = { 0: "lista_temperaturas", 1: "lista_humedades", 2: "lista_velocidades" };
    const key = keyMap[id];
    if (!key) throw new Error("id no válido");
    const agg = _aggFn(tipo);
    return {
      lista_fechas:    variables.lista_fechas,
      lista_variables: variables[key].map((day) => {
        const valid = day.filter((v) => v != null && !isNaN(v));
        if (!valid.length) throw new Error(`No hay datos válidos para ${key}`);
        return +agg(valid).toFixed(2);
      }),
    };
  }

  async getClimateMonth({ fecha_inicio, fecha_fin, id, tipo }) {
    const daily = await this.getClimateDay({ fecha_inicio, fecha_fin, id, tipo });
    const agg = _aggFn(tipo);
    const yearMonth = daily.lista_fechas.map((d) => d.slice(0, 7));
    const sorted = [...new Set(yearMonth)].sort();
    return {
      lista_fechas: sorted,
      lista_variables: sorted.map((ym) => {
        const vals = daily.lista_variables.filter((_, i) => yearMonth[i] === ym);
        if (!vals.length) throw new Error(`No hay datos para el mes ${ym}`);
        return +agg(vals).toFixed(2);
      }),
    };
  }

  async getClimateYear({ año_inicio, año_fin, id, tipo }) {
    const monthly = await this.getClimateMonth({
      fecha_inicio: `${año_inicio}-01-01`,
      fecha_fin:    `${año_fin}-12-31`,
      id,
      tipo,
    });
    const agg = _aggFn(tipo);
    const years = monthly.lista_fechas.map((d) => d.slice(0, 4));
    const sorted = [...new Set(years)].sort();
    return {
      lista_fechas: sorted,
      lista_variables: sorted.map((y) => {
        const vals = monthly.lista_variables.filter((_, i) => years[i] === y);
        if (!vals.length) throw new Error(`No hay datos para el año ${y}`);
        return +agg(vals).toFixed(2);
      }),
    };
  }

  async getClimateDayAllTypes({ fecha_inicio, fecha_fin, id }) {
    const [maxs, mins, avgs] = await Promise.all([
      this.getClimateDay({ fecha_inicio, fecha_fin, id, tipo: 1 }),
      this.getClimateDay({ fecha_inicio, fecha_fin, id, tipo: 2 }),
      this.getClimateDay({ fecha_inicio, fecha_fin, id, tipo: 0 }),
    ]);
    return {
      lista_fechas: maxs.lista_fechas,
      lista_max:    maxs.lista_variables,
      lista_min:    mins.lista_variables,
      lista_avg:    avgs.lista_variables,
    };
  }

  async getClimateMonthAllTypes({ fecha_inicio, fecha_fin, id }) {
    const [maxs, mins, avgs] = await Promise.all([
      this.getClimateMonth({ fecha_inicio, fecha_fin, id, tipo: 1 }),
      this.getClimateMonth({ fecha_inicio, fecha_fin, id, tipo: 2 }),
      this.getClimateMonth({ fecha_inicio, fecha_fin, id, tipo: 0 }),
    ]);
    return {
      lista_fechas: maxs.lista_fechas,
      lista_max:    maxs.lista_variables,
      lista_min:    mins.lista_variables,
      lista_avg:    avgs.lista_variables,
    };
  }

  async getClimateYearAllTypes({ año_inicio, año_fin, id }) {
    const [maxs, mins, avgs] = await Promise.all([
      this.getClimateYear({ año_inicio, año_fin, id, tipo: 1 }),
      this.getClimateYear({ año_inicio, año_fin, id, tipo: 2 }),
      this.getClimateYear({ año_inicio, año_fin, id, tipo: 0 }),
    ]);
    return {
      lista_fechas: maxs.lista_fechas,
      lista_max:    maxs.lista_variables,
      lista_min:    mins.lista_variables,
      lista_avg:    avgs.lista_variables,
    };
  }

  async getClimatePerCity({ fecha_inicio, fecha_fin }, city) {
    const rows = await this.#fetchRaw(fecha_inicio, fecha_fin);
    if (!rows.length)
      throw new Error(`No se encontraron datos climáticos para ${city} en ${fecha_inicio} - ${fecha_fin}`);
    return {
      ciudad:      city,
      lista_fechas: rows.map((r) => _ymd(new Date(r.fecha))),
      temperaturas: _extractDaily(rows, "t"),
      humedades:    _extractDaily(rows, "h"),
      velocidades:  _extractDaily(rows, "v"),
    };
  }

  async getClimateDailyPerCity({ fecha_inicio, fecha_fin, id, tipo }, city) {
    const variables = await this.getClimatePerCity({ fecha_inicio, fecha_fin }, city);
    const keyMap = { 0: "temperaturas", 1: "humedades", 2: "velocidades" };
    const key = keyMap[id];
    if (!key) throw new Error("id no válido");
    const agg = _aggFn(tipo);
    const tipoLabel = tipo === 0 ? "promedio" : tipo === 1 ? "maximo" : "minimo";
    return {
      ciudad:          city,
      lista_fechas:    variables.lista_fechas,
      tipo_variable:   key,
      tipo_agregacion: tipoLabel,
      valores: variables[key].map((day) => {
        const valid = day.filter((v) => v != null && !isNaN(v) && v !== 0);
        if (!valid.length) throw new Error(`No hay datos válidos para ${key} en ${city}`);
        return +agg(valid).toFixed(2);
      }),
    };
  }

  async getClimateDailyAllTypesPerCity({ fecha_inicio, fecha_fin }, city) {
    const ids = [0, 1, 2];
    const tipos = [0, 1, 2];
    const results = await Promise.all(
      ids.flatMap((id) =>
        tipos.map((tipo) => this.getClimateDailyPerCity({ fecha_inicio, fecha_fin, id, tipo }, city))
      )
    );
    const [tAvg, tMax, tMin, hAvg, hMax, hMin, vAvg, vMax, vMin] = [
      results[0], results[1], results[2],
      results[3], results[4], results[5],
      results[6], results[7], results[8],
    ];
    return {
      ciudad:  city,
      fechas:  tMax.lista_fechas,
      temperaturas: { maximas: tMax.valores, minimas: tMin.valores, promedios: tAvg.valores },
      humedades:    { maximas: hMax.valores, minimas: hMin.valores, promedios: hAvg.valores },
      velocidades:  { maximas: vMax.valores, minimas: vMin.valores, promedios: vAvg.valores },
    };
  }

  async getMultipleCitiesClimate(search, citiesList) {
    const resultados = {};
    await Promise.allSettled(
      citiesList.map((city) =>
        this.getClimateDailyAllTypesPerCity(search, city).then(
          (data) => { resultados[city] = data; },
          (err)  => { resultados[city] = { error: `No se pudieron obtener datos para ${city}: ${err.message}` }; }
        )
      )
    );
    return {
      ciudades_procesadas: citiesList.length,
      ciudades_exitosas:   Object.values(resultados).filter((r) => !r.error).length,
      resultados,
    };
  }
}

// ─── CorrelationService ───────────────────────────────────────────────────────
export class CorrelationService {
  async getCorrelationMatrix({ tipo, fecha_inicio, fecha_fin, año_inicio, año_fin, list_ids: listIds, list_id_macroeconomic: listIdMacroeconomic }) {
    const climate = new ClimateService();
    const demands = new DemandService();
    const cols = [];

    // Granularidad horaria
    if (tipo === 0) {
      const variables = await climate.getClimate({ fecha_inicio, fecha_fin });
      const climFechas = variables.lista_fechas.flatMap((d) =>
        Array.from({ length: 24 }, (_, h) => `${d} ${h + 1}`)
      );
      if (listIds?.includes(1)) cols.push({ name: "temperatura", data: variables.lista_temperaturas.flat(), fechas: climFechas });
      if (listIds?.includes(2)) cols.push({ name: "humedad",     data: variables.lista_humedades.flat(),    fechas: climFechas });
      if (listIds?.includes(3)) cols.push({ name: "velocidad",   data: variables.lista_velocidades.flat(),  fechas: climFechas });
      if (!cols.length) throw new Error("No se seleccionó ningún tipo de variable válido");
      const demandData = await demands.get24Demands({ fecha_inicio, fecha_fin });
      const demFechas = demandData.lista_fechas.flatMap((d) => {
        const ds = _ymd(new Date(d));
        return Array.from({ length: 24 }, (_, h) => `${ds} ${h + 1}`);
      });
      cols.push({ name: "demanda", data: demandData.lista_demandas.flat(), fechas: demFechas });
    }

    // Granularidad diaria
    else if (tipo === 1) {
      const base = { fecha_inicio, fecha_fin, tipo: 0 };
      if (listIds?.includes(1)) { const r = await climate.getClimateDay({ ...base, id: 0 }); cols.push({ name: "temperatura", data: r.lista_variables, fechas: r.lista_fechas }); }
      if (listIds?.includes(2)) { const r = await climate.getClimateDay({ ...base, id: 1 }); cols.push({ name: "humedad",     data: r.lista_variables, fechas: r.lista_fechas }); }
      if (listIds?.includes(3)) { const r = await climate.getClimateDay({ ...base, id: 2 }); cols.push({ name: "velocidad",   data: r.lista_variables, fechas: r.lista_fechas }); }
      if (!cols.length) throw new Error("No se seleccionó ningún tipo de variable válido");
      const demandData = await demands.getDemands({ tipo: 1, fecha_inicio, fecha_fin });
      cols.push({ name: "demanda", data: demandData.lista_demandas, fechas: demandData.lista_fechas });
    }

    // Granularidad mensual
    else if (tipo === 2) {
      const base = { fecha_inicio, fecha_fin, tipo: 0 };
      if (listIds?.includes(1)) { const r = await climate.getClimateMonth({ ...base, id: 0 }); cols.push({ name: "temperatura", data: r.lista_variables, fechas: r.lista_fechas }); }
      if (listIds?.includes(2)) { const r = await climate.getClimateMonth({ ...base, id: 1 }); cols.push({ name: "humedad",     data: r.lista_variables, fechas: r.lista_fechas }); }
      if (listIds?.includes(3)) { const r = await climate.getClimateMonth({ ...base, id: 2 }); cols.push({ name: "velocidad",   data: r.lista_variables, fechas: r.lista_fechas }); }
      if (!cols.length) throw new Error("No se seleccionó ningún tipo de variable válido");
      const demandData = await demands.getDemands({ tipo: 2, fecha_inicio, fecha_fin });
      cols.push({ name: "demanda", data: demandData.lista_demandas, fechas: demandData.lista_fechas });
    }

    // Granularidad anual
    else if (tipo === 3) {
      const base = { año_inicio, año_fin, tipo: 0 };
      const macro = new MacroeconomicService();
      const db = getGmrDb();

      if (listIdMacroeconomic?.length) {
        const yearlyClimate = await climate.getClimateYear({ ...base, id: 0 });
        const numYears = yearlyClimate.lista_fechas.length;

        for (const id of listIdMacroeconomic) {
          const { rows: nameRow } = await db.query(
            `SELECT name FROM "PRONOSTICO_macroeconomics" WHERE id = $1`, [id]
          );
          const varData = await macro.getVariableYear(id, año_inicio, año_fin);
          if (varData.lista_variables.length !== numYears) {
            const missing = Array.from({ length: año_fin - año_inicio + 1 }, (_, i) => año_inicio + i)
              .filter((y) => !varData.lista_fechas.includes(y));
            throw new Error(`Sin datos para ${nameRow[0]?.name} en años: ${missing.join(", ")}`);
          }
          cols.push({ name: nameRow[0]?.name ?? `var_${id}`, data: varData.lista_variables, fechas: varData.lista_fechas });
        }
      }

      if (listIds?.length) {
        if (listIds.includes(1)) { const r = await climate.getClimateYear({ ...base, id: 0 }); cols.push({ name: "temperatura", data: r.lista_variables, fechas: r.lista_fechas }); }
        if (listIds.includes(2)) { const r = await climate.getClimateYear({ ...base, id: 1 }); cols.push({ name: "humedad",     data: r.lista_variables, fechas: r.lista_fechas }); }
        if (listIds.includes(3)) { const r = await climate.getClimateYear({ ...base, id: 2 }); cols.push({ name: "velocidad",   data: r.lista_variables, fechas: r.lista_fechas }); }
      }

      const demandData = await demands.getDemands({ tipo: 3, año_inicio, año_fin });
      cols.push({ name: "demanda", data: demandData.lista_demandas, fechas: demandData.lista_fechas });
    }

    else {
      throw new Error("Tipo no válido");
    }

    return _corrMatrix(_alignByDate(cols));
  }
}

// ─── GridAnalysisService ──────────────────────────────────────────────────────
export class GridAnalysisService {
  getNumberOfDays(year, month) {
    const totalDays = new Date(year, month, 0).getDate();
    let saturdays = 0, sundays = 0;
    for (let d = 1; d <= totalDays; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 6) saturdays++;
      if (dow === 0) sundays++;
    }
    const holidays = _colombianHolidays(year);
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const holidayCount = [...holidays].filter((h) => h.startsWith(prefix)).length;
    const workingDays = totalDays - saturdays - sundays - holidayCount;
    return { workingDays, saturdays, sundays, holidayCount, totalDays };
  }

  async getDays({ fecha_inicio, fecha_fin }) {
    const start = new Date(fecha_inicio), end = new Date(fecha_fin);
    const months = new Set();
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      months.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    const sorted = [...months].sort();

    const totals = sorted.map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return this.getNumberOfDays(y, m);
    });

    return {
      dates:               sorted,
      total_month_days:    totals.map((t) => t.totalDays),
      total_working_days:  totals.map((t) => t.workingDays),
      total_saturdays:     totals.map((t) => t.saturdays),
      total_sundays:       totals.map((t) => t.sundays),
      total_holidays:      totals.map((t) => t.holidayCount),
    };
  }

  async getGridInfo({ fecha_inicio, fecha_fin }) {
    const climate = new ClimateService();
    const demandSvc = new DemandService();
    const base = { fecha_inicio, fecha_fin };

    const [
      monthlyDemandRaw,
      minTemp, maxTemp, avgTemp,
      minHum,  maxHum,  avgHum,
      minVel,  maxVel,  avgVel,
    ] = await Promise.all([
      demandSvc.getDemands({ tipo: 2, fecha_inicio, fecha_fin }),
      climate.getClimateMonth({ ...base, tipo: 2, id: 0 }),
      climate.getClimateMonth({ ...base, tipo: 1, id: 0 }),
      climate.getClimateMonth({ ...base, tipo: 0, id: 0 }),
      climate.getClimateMonth({ ...base, tipo: 2, id: 1 }),
      climate.getClimateMonth({ ...base, tipo: 1, id: 1 }),
      climate.getClimateMonth({ ...base, tipo: 0, id: 1 }),
      climate.getClimateMonth({ ...base, tipo: 2, id: 2 }),
      climate.getClimateMonth({ ...base, tipo: 1, id: 2 }),
      climate.getClimateMonth({ ...base, tipo: 0, id: 2 }),
    ]);

    const dates = monthlyDemandRaw.lista_fechas;
    const dayStats = dates.map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return this.getNumberOfDays(y, m);
    });

    return {
      dates,
      monthly_demand:     monthlyDemandRaw.lista_demandas,
      min_temp:           minTemp.lista_variables,
      max_temp:           maxTemp.lista_variables,
      avg_temp:           avgTemp.lista_variables,
      min_hum:            minHum.lista_variables,
      max_hum:            maxHum.lista_variables,
      avg_hum:            avgHum.lista_variables,
      min_vel:            minVel.lista_variables,
      max_vel:            maxVel.lista_variables,
      avg_vel:            avgVel.lista_variables,
      total_month_days:   dayStats.map((d) => d.totalDays),
      total_working_days: dayStats.map((d) => d.workingDays),
      total_saturdays:    dayStats.map((d) => d.saturdays),
      total_sundays:      dayStats.map((d) => d.sundays),
      total_holidays:     dayStats.map((d) => d.holidayCount),
    };
  }
}