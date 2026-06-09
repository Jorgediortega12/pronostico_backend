import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_FILE = path.join(__dirname, "cubrimiento.sql");

const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || "5433"),
});

async function main() {
  const sql = readFileSync(SQL_FILE, "utf8");
  await client.connect();
  console.log("Conexión exitosa a PostgreSQL");
  await client.query(sql);
  console.log("Tablas de cubrimiento creadas correctamente");
}

main()
  .catch((err) => {
    console.error("Error ejecutando el script:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
