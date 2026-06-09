import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

async function main() {
  const client = createClient();
  await client.connect();

  try {
    const check = await client.query(
      "SELECT cod FROM usu_menu WHERE link = $1",
      ["/analisis_datos"]
    );

    if (check.rows.length > 0) {
      console.log("El módulo '/analisis_datos' ya existe. No se insertó duplicado.");
      return;
    }

    const maxOrden = await client.query("SELECT COALESCE(MAX(orden), 0) AS max FROM usu_menu");
    const orden = maxOrden.rows[0].max + 1;

    const result = await client.query(
      `INSERT INTO usu_menu (nombre, nivel, orden, codsuperior, link, imagen)
       VALUES ($1, $2, $3, NULL, $4, $5)
       RETURNING *`,
      ["Análisis de Datos", 1, orden, "/analisis_datos", null]
    );

    console.log("Módulo creado exitosamente:");
    console.table(result.rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al ejecutar seed:", err.message);
  process.exit(1);
});