import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { createReadStream } from "fs";
import { parse } from "csv-parse";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, "cvs");

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
  });

const MONTH_MAP = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

// "26-MAY-26" → "2026-05-26" | "17-JUN-25" → "2025-06-17"
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
  console.log("Conexión exitosa a PostgreSQL");

  try {
    await client.query("BEGIN");

    // ── 1. SphaerAI_contratos (contrato.csv) ─────────────────────────────────
    console.log("\n📥 Migrando contrato.csv → SphaerAI_contratos...");
    const contratos = await readCsv("contrato.csv");
    let count = 0;
    let maxId = 0;
    for (const row of contratos) {
      const id = parseInt(row.ID);
      if (id > maxId) maxId = id;
      await client.query(
        `INSERT INTO "SphaerAI_contratos"
           (id, nombre, datos, codigo_sic, anio, fecha_creacion)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET nombre         = EXCLUDED.nombre,
               datos          = EXCLUDED.datos,
               codigo_sic     = EXCLUDED.codigo_sic,
               anio           = EXCLUDED.anio,
               fecha_creacion = EXCLUDED.fecha_creacion`,
        [
          id,
          row.NOMBRE,
          row.DATOS,
          row.CODIGO_SIC,
          row.ANIO ? parseInt(row.ANIO) : null,
          parseOracleDate(row.FECHA_CREACION) || new Date(),
        ],
      );
      count++;
    }
    if (maxId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('"SphaerAI_contratos"', 'id'), $1)`,
        [maxId],
      );
    }
    console.log(
      `  ✓ ${count} filas insertadas/actualizadas (secuencia → ${maxId})`,
    );

    // ── 2. SphaerAI_porcentaje_cubrimiento (porcentaje.csv) ──────────────────
    console.log(
      "\n📥 Migrando porcentaje.csv → SphaerAI_porcentaje_cubrimiento...",
    );
    const porcentajes = await readCsv("porcentaje.csv");
    count = 0;
    maxId = 0;
    for (const row of porcentajes) {
      const id = parseInt(row.ID);
      if (id > maxId) maxId = id;
      await client.query(
        `INSERT INTO "SphaerAI_porcentaje_cubrimiento"
           (id, anio, mes, valor, fecha_creacion)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
           SET anio           = EXCLUDED.anio,
               mes            = EXCLUDED.mes,
               valor          = EXCLUDED.valor,
               fecha_creacion = EXCLUDED.fecha_creacion`,
        [
          id,
          row.ANIO ? parseInt(row.ANIO) : null,
          row.MES ? parseInt(row.MES) : null,
          row.VALOR ? parseInt(row.VALOR) : null,
          parseOracleDate(row.FECHA_CREACION) || new Date(),
        ],
      );
      count++;
    }
    if (maxId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('"SphaerAI_porcentaje_cubrimiento"', 'id'), $1)`,
        [maxId],
      );
    }
    console.log(
      `  ✓ ${count} filas insertadas/actualizadas (secuencia → ${maxId})`,
    );

    await client.query("COMMIT");
    console.log("\n✅ Migración de cubrimiento completada");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error ejecutando la migración:", err);
  process.exitCode = 1;
});
