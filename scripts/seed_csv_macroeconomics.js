import dotenv from "dotenv";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, "cvs");

const pool = new Pool({
  host:     process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port:     Number(process.env.POSTGRES_PORT) || 5433,
});

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/"/g, "").trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.replace(/"/g, "").trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

async function seedMacroeconomics(client) {
  const rows = parseCsv(path.join(CSV_DIR, ".csv"));
  console.log(`\n📄 PRONOSTICO_macroeconomics: ${rows.length} registros`);

  for (const row of rows) {
    const id   = Number(row.id);
    const name = row.name;

    await client.query(
      `INSERT INTO "PRONOSTICO_macroeconomics" (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [id, name]
    );
    console.log(`  ✓ id=${id}  name=${name}`);
  }
}

async function seedMacroeconomicsData(client) {
  const rows = parseCsv(path.join(CSV_DIR, ".1csv"));
  console.log(`\n📄 PRONOSTICO_macroeconomics_data: ${rows.length} registros`);

  for (const row of rows) {
    const id     = Number(row.id);
    const ano    = Number(row.año);
    const eco_id = Number(row.eco_id);
    const value  = parseFloat(row.value);

    await client.query(
      `INSERT INTO "PRONOSTICO_macroeconomics_data" (id, ano, eco_id, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET ano    = EXCLUDED.ano,
             eco_id = EXCLUDED.eco_id,
             value  = EXCLUDED.value`,
      [id, ano, eco_id, value]
    );
    console.log(`  ✓ id=${id}  año=${ano}  eco_id=${eco_id}  value=${value}`);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Iniciando carga de CSVs en GMR DB...");
    console.log(`   Host: ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5433}`);
    console.log(`   DB:   ${process.env.POSTGRES_DB}`);

    await client.query("BEGIN");
    await seedMacroeconomics(client);
    await seedMacroeconomicsData(client);
    await client.query("COMMIT");

    console.log("\n✅ Carga completada exitosamente.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error durante la carga:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
