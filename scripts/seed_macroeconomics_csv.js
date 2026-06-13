import pkg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

const CSV_VARS  = path.resolve("scripts/cvs/.csv");   // ID, NAME
const CSV_DATA  = path.resolve("scripts/cvs/.1csv");  // ID, año, ECO_ID, VALUE

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

  const vars = parse(fs.readFileSync(CSV_VARS, "utf-8"), { columns: true, skip_empty_lines: true, trim: true });
  const data = parse(fs.readFileSync(CSV_DATA, "utf-8"), { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Variables: ${vars.length} — Valores: ${data.length}`);

  let inserted = 0, updated = 0, errors = 0;

  await client.query("BEGIN");
  try {
    // ── PRONOSTICO_macroeconomics (variables)
    for (const row of vars) {
      const id   = parseInt(row["ID"], 10);
      const name = String(row["NAME"]).trim();
      const { rows: exists } = await client.query(
        `SELECT id FROM "PRONOSTICO_macroeconomics" WHERE id = $1`, [id]
      );
      if (exists.length > 0) {
        await client.query(`UPDATE "PRONOSTICO_macroeconomics" SET name=$1 WHERE id=$2`, [name, id]);
        updated++;
      } else {
        await client.query(`INSERT INTO "PRONOSTICO_macroeconomics" (id, name) VALUES ($1,$2)`, [id, name]);
        inserted++;
      }
    }

    // ── PRONOSTICO_macroeconomics_data (valores)
    for (const row of data) {
      try {
        const eco_id = parseInt(row["ECO_ID"], 10);
        const ano    = parseInt(row["año"] || row["ano"], 10);
        const value  = parseFloat(String(row["VALUE"]).replace(",", "."));

        const { rows: exists } = await client.query(
          `SELECT id FROM "PRONOSTICO_macroeconomics_data" WHERE eco_id=$1 AND ano=$2`, [eco_id, ano]
        );
        if (exists.length > 0) {
          await client.query(
            `UPDATE "PRONOSTICO_macroeconomics_data" SET value=$1 WHERE eco_id=$2 AND ano=$3`,
            [value, eco_id, ano]
          );
          updated++;
        } else {
          await client.query(
            `INSERT INTO "PRONOSTICO_macroeconomics_data" (eco_id, ano, value) VALUES ($1,$2,$3)`,
            [eco_id, ano, value]
          );
          inserted++;
        }
      } catch (err) {
        errors++;
        console.error(`  Error en fila ECO_ID=${row["ECO_ID"]} año=${row["año"]}: ${err.message}`);
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
