import pkg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

const CSV_PATH = path.resolve("scripts/cvs/datos (2).csv");

const MONTH_MAP = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

// 01-MAR-11 → 2011-03-01
function parseFecha(raw) {
  const m = String(raw).trim().match(/^(\d{2})-([A-Z]{3})-(\d{2})$/i);
  if (!m) throw new Error(`Fecha no reconocida: "${raw}"`);
  const dd = m[1];
  const mon = MONTH_MAP[m[2].toUpperCase()];
  if (!mon) throw new Error(`Mes no reconocido: "${m[2]}"`);
  const yy = parseInt(m[3], 10);
  const yyyy = yy >= 50 ? `19${String(yy).padStart(2,"0")}` : `20${String(yy).padStart(2,"0")}`;
  return `${yyyy}-${mon}-${dd}`;
}

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT) || 5433,
  });

async function main() {
  const client = createClient();
  await client.connect();

  console.log("Leyendo CSV:", CSV_PATH);
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Registros en CSV: ${rows.length}`);

  const checkSQL = `SELECT id FROM "PRONOSTICO_demands" WHERE fecha = $1 LIMIT 1`;
  const insertSQL = `
    INSERT INTO "PRONOSTICO_demands" (
      hora_1,hora_2,hora_3,hora_4,hora_5,hora_6,
      hora_7,hora_8,hora_9,hora_10,hora_11,hora_12,
      hora_13,hora_14,hora_15,hora_16,hora_17,hora_18,
      hora_19,hora_20,hora_21,hora_22,hora_23,hora_24,
      total, fecha, tipo_fecha, file_type
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
      $25,$26,$27,$28
    )`;
  const updateSQL = `
    UPDATE "PRONOSTICO_demands" SET
      hora_1=$1,hora_2=$2,hora_3=$3,hora_4=$4,hora_5=$5,hora_6=$6,
      hora_7=$7,hora_8=$8,hora_9=$9,hora_10=$10,hora_11=$11,hora_12=$12,
      hora_13=$13,hora_14=$14,hora_15=$15,hora_16=$16,hora_17=$17,hora_18=$18,
      hora_19=$19,hora_20=$20,hora_21=$21,hora_22=$22,hora_23=$23,hora_24=$24,
      total=$25, tipo_fecha=$27, file_type=$28
    WHERE fecha=$26`;

  let inserted = 0, updated = 0, errors = 0;

  await client.query("BEGIN");
  try {
    for (const row of rows) {
      try {
        const fecha = parseFecha(row["FECHA"]);
        const toN = (v) => parseFloat(String(v).replace(",", ".")) || 0;
        const vals = [
          toN(row["HORA_1"]),  toN(row["HORA_2"]),  toN(row["HORA_3"]),  toN(row["HORA_4"]),
          toN(row["HORA_5"]),  toN(row["HORA_6"]),  toN(row["HORA_7"]),  toN(row["HORA_8"]),
          toN(row["HORA_9"]),  toN(row["HORA_10"]), toN(row["HORA_11"]), toN(row["HORA_12"]),
          toN(row["HORA_13"]), toN(row["HORA_14"]), toN(row["HORA_15"]), toN(row["HORA_16"]),
          toN(row["HORA_17"]), toN(row["HORA_18"]), toN(row["HORA_19"]), toN(row["HORA_20"]),
          toN(row["HORA_21"]), toN(row["HORA_22"]), toN(row["HORA_23"]), toN(row["HORA_24"]),
          toN(row["TOTAL"]),
          fecha,
          String(row["TIPO_FECHA"]).replace(/"/g, "").trim(),
          String(row["FILE_TYPE"]).replace(/"/g, "").trim().toLowerCase(),
        ];

        const { rows: exists } = await client.query(checkSQL, [fecha]);
        if (exists.length > 0) {
          await client.query(updateSQL, vals);
          updated++;
        } else {
          await client.query(insertSQL, vals);
          inserted++;
        }
      } catch (err) {
        errors++;
        console.error(`  Error en fila FECHA=${row["FECHA"]}: ${err.message}`);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error general, rollback:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log(`\nMigracion completada:`);
  console.log(`  Insertados: ${inserted}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Errores: ${errors}`);
}

main();
