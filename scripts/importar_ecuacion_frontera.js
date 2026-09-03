// Importa la "ecuación de frontera" (src_ecuacion_con_frontera*.xlsx) para un
// mercado: cada código de frontera se guarda como un `flujo` (bajo una nueva
// fuente "ECUACION FRONTERA" en la tabla ucp), y su signo (+/-) como el
// `valor` (+1/-1) en equivalencia_flujo para ese UCP.
//
// El archivo viene organizado en secciones "Nivel de tensión: X" >
// "Tipo de frontera: Y" > filas con Nombre frontera / Código frontera /
// Signo — no hace falta parsear esas secciones para este import (el nivel
// de tensión y tipo son solo metadata informativa del origen, no afectan el
// cálculo), sólo se necesita código + signo por fila de dato real.
//
// Uso: node scripts/importar_ecuacion_frontera.js "<ruta.xlsx>" <codigo_ucp>

import ExcelJS from "exceljs";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const NOMBRE_FUENTE = "ECUACION FRONTERA";

const createClient = () =>
  new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
  });

async function obtenerOCrearFuente(client) {
  const existe = await client.query(
    "SELECT codigo FROM ucp WHERE nombre = $1 AND codpadre = 0",
    [NOMBRE_FUENTE],
  );
  if (existe.rowCount > 0) return existe.rows[0].codigo;

  const creado = await client.query(
    "INSERT INTO ucp (nombre, codpadre, estado) VALUES ($1, 0, 1) RETURNING codigo",
    [NOMBRE_FUENTE],
  );
  console.log(`✅ Fuente "${NOMBRE_FUENTE}" creada con codigo=${creado.rows[0].codigo}`);
  return creado.rows[0].codigo;
}

async function main() {
  const [rutaArchivo, codigoUcpArg] = process.argv.slice(2);
  if (!rutaArchivo || !codigoUcpArg) {
    console.log("Uso: node scripts/importar_ecuacion_frontera.js <ruta.xlsx> <codigo_ucp>");
    process.exit(1);
  }
  const codigoUcp = parseInt(codigoUcpArg, 10);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(rutaArchivo);
  const sheet = workbook.worksheets[0];

  const filas = [];
  sheet.eachRow((row) => {
    const codigo = row.getCell(4).value; // "Código frontera"
    const signo = row.getCell(5).value; // "Signo"
    if (typeof codigo === "string" && /^Frt\d+$/i.test(codigo.trim())) {
      filas.push({ codigo: codigo.trim(), signo: String(signo).trim() });
    }
  });
  console.log(`📄 ${filas.length} códigos de frontera leídos del Excel`);

  const client = createClient();
  await client.connect();
  try {
    await client.query("BEGIN");
    const codigoFuente = await obtenerOCrearFuente(client);

    let creados = 0;
    let actualizados = 0;
    for (const fila of filas) {
      const signoValor = fila.signo === "+" ? 1 : fila.signo === "-" ? -1 : null;
      if (signoValor === null) {
        console.warn(`⚠️ Signo desconocido "${fila.signo}" para ${fila.codigo}, se omite`);
        continue;
      }

      let flujoResult = await client.query(
        "SELECT id FROM flujo WHERE nombre = $1 AND codigo_fuente = $2",
        [fila.codigo, codigoFuente],
      );
      let idFlujo;
      if (flujoResult.rowCount > 0) {
        idFlujo = flujoResult.rows[0].id;
      } else {
        const nuevo = await client.query(
          "INSERT INTO flujo (nombre, codigo_fuente) VALUES ($1, $2) RETURNING id",
          [fila.codigo, codigoFuente],
        );
        idFlujo = nuevo.rows[0].id;
        creados++;
      }

      const upsert = await client.query(
        `INSERT INTO equivalencia_flujo (codigo_ucp, id_flujo, valor)
         VALUES ($1, $2, $3)
         ON CONFLICT (codigo_ucp, id_flujo) DO UPDATE SET valor = EXCLUDED.valor, estado = 1
         RETURNING (xmax = 0) AS insertado`,
        [codigoUcp, idFlujo, signoValor],
      );
      if (!upsert.rows[0].insertado) actualizados++;
    }

    await client.query("COMMIT");
    console.log(`✅ Flujos nuevos creados: ${creados}`);
    console.log(`✅ Equivalencias actualizadas (ya existían): ${actualizados}`);
    console.log(`✅ Equivalencias nuevas: ${filas.length - actualizados}`);
    console.log("🎉 Importación de ecuación completada.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
