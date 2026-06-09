import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_FILE = path.join(__dirname, "migrate_analysis_tables.sql");

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
  });

async function main() {
  const client = createClient();
  await client.connect();

  console.log(`🚀 Ejecutando migración: ${SQL_FILE}`);
  console.log(
    `   DB: ${process.env.POSTGRES_DB} @ ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
  );

  try {
    const sql = readFileSync(SQL_FILE, "utf-8");
    await client.query(sql);
    console.log(
      "\n✅ Migración completada: tablas PRONOSTICO_* creadas/verificadas.",
    );
  } catch (err) {
    console.error("\n❌ Error durante la migración:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
