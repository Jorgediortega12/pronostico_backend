import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, "demanda");

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5433"),
  });

const MONTH_MAP = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04",
  MAY: "05", JUN: "06", JUL: "07", AUG: "08",
  SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

// "01-JAN-24" → "2024-01-01" | "01-JAN-25" → "2025-01-01"
function parseOracleDate(raw) {
  if (!raw) return null;
  const [day, mon, yr] = raw.trim().split("-");
  const year = parseInt(yr, 10) < 50 ? `20${yr}` : `19${yr}`;
  return `${year}-${MONTH_MAP[mon.toUpperCase()]}-${day.padStart(2, "0")}`;
}

function readCsv(filename) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(path.join(CSV_DIR, filename))
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main() {
  const client = createClient();
  await client.connect();

  try {
    await client.query("BEGIN");

    // ── 1. SphaerAI_monthly_demand (demand.csv) ──────────────────────────────
    console.log("\n📥 Migrando demand.csv → SphaerAI_monthly_demand...");
    const demands = await readCsv("demand.csv");
    let count = 0;
    for (const row of demands) {
      await client.query(
        `INSERT INTO "SphaerAI_monthly_demand" (year, month, value, percentage, climate_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (year, month) DO UPDATE
           SET value = EXCLUDED.value,
               percentage = EXCLUDED.percentage,
               climate_type = EXCLUDED.climate_type`,
        [
          parseInt(row.YEAR),
          parseInt(row.MONTH),
          parseFloat(row.VALUE),
          parseFloat(row.PERCENTAGE),
          row.CLIMATE_TYPE || "NORMAL",
        ]
      );
      count++;
    }
    console.log(`  ✓ ${count} filas insertadas/actualizadas`);

    // ── 2. SphaerAI_yearly_demand (yearly.csv) ───────────────────────────────
    console.log("\n📥 Migrando yearly.csv → SphaerAI_yearly_demand...");
    const yearly = await readCsv("yearly.csv");
    count = 0;
    for (const row of yearly) {
      await client.query(
        `INSERT INTO "SphaerAI_yearly_demand" (year, demand)
         VALUES ($1, $2)
         ON CONFLICT (year) DO UPDATE
           SET demand = EXCLUDED.demand`,
        [parseInt(row.YEAR), parseFloat(row.DEMAND)]
      );
      count++;
    }
    console.log(`  ✓ ${count} filas insertadas/actualizadas`);

    // ── 3. SphaerAI_type_year (type_year.csv) ───────────────────────────────
    console.log("\n📥 Migrando type_year.csv → SphaerAI_type_year...");
    const typeYears = await readCsv("type_year.csv");
    count = 0;
    for (const row of typeYears) {
      await client.query(
        `INSERT INTO "SphaerAI_type_year" (year, type, user_id, session_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (year, user_id, session_id) DO UPDATE
           SET type = EXCLUDED.type`,
        [
          parseInt(row.YEAR),
          row.TYPE || "TIPICO",
          parseInt(row.USER_ID),
          parseInt(row.SESSION_ID),
        ]
      );
      count++;
    }
    console.log(`  ✓ ${count} filas insertadas/actualizadas`);

    // ── 4. SphaerAI_users_models (user_model.csv) ────────────────────────────
    // Insertamos preservando el ID original para que los valores referencien bien
    console.log("\n📥 Migrando user_model.csv → SphaerAI_users_models...");
    const models = await readCsv("user_model.csv");
    count = 0;
    let maxId = 0;
    for (const row of models) {
      const id = parseInt(row.ID);
      if (id > maxId) maxId = id;
      await client.query(
        `INSERT INTO "SphaerAI_users_models"
           (id, model_name, user_id, session_id, start_date, end_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
           SET model_name = EXCLUDED.model_name,
               start_date = EXCLUDED.start_date,
               end_date   = EXCLUDED.end_date,
               updated_at = EXCLUDED.updated_at`,
        [
          id,
          row.MODEL_NAME,
          parseInt(row.USER_ID),
          parseInt(row.SESSION_ID),
          parseOracleDate(row.START_DATE),
          parseOracleDate(row.END_DATE),
          parseOracleDate(row.CREATED_AT) || new Date(),
          parseOracleDate(row.UPDATED_AT) || new Date(),
        ]
      );
      count++;
    }
    // Sincronizar la secuencia para que futuros INSERTs no colisionen
    if (maxId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('"SphaerAI_users_models"', 'id'), $1)`,
        [maxId]
      );
    }
    console.log(`  ✓ ${count} filas insertadas/actualizadas (secuencia → ${maxId})`);

    // ── 5. SphaerAI_users_models_values (user_model_value.csv) ───────────────
    console.log("\n📥 Migrando user_model_value.csv → SphaerAI_users_models_values...");
    const values = await readCsv("user_model_value.csv");
    count = 0;
    for (const row of values) {
      await client.query(
        `INSERT INTO "SphaerAI_users_models_values" (model_id, date, value, climate_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (model_id, date) DO UPDATE
           SET value        = EXCLUDED.value,
               climate_type = EXCLUDED.climate_type`,
        [
          parseInt(row.MODEL_ID),
          parseOracleDate(row.date),
          parseFloat(row.VALUE),
          row.CLIMATE_TYPE || "NORMAL",
        ]
      );
      count++;
    }
    console.log(`  ✓ ${count} filas insertadas/actualizadas`);

    await client.query("COMMIT");
    console.log("\n✅ Migración completada exitosamente.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error — se hizo ROLLBACK:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
