import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const createClient = () => {
  return new Client({
    user: process.env.POSTGRES_USER_PROXY,
    host: process.env.POSTGRES_HOST_PROXY || "localhost",
    database: process.env.POSTGRES_DB_PROXY,
    password: process.env.POSTGRES_PASSWORD_PROXY,
    port: process.env.POSTGRES_PORT_PROXY || 5432,
  });
};

const parseNumero = (valor) => {
  if (!valor || String(valor).trim() === "") return null;
  const num = parseFloat(String(valor).replace(",", "."));
  return isNaN(num) ? null : num;
};

const parseEntero = (valor, defaultVal = 0) => {
  if (!valor || String(valor).trim() === "") return defaultVal;
  const num = parseInt(String(valor).trim(), 10);
  return isNaN(num) ? defaultVal : num;
};

/**
 * Leer CSV
 */
const leerCSV = (rutaArchivo) => {
  console.log(`\n📄 Leyendo archivo: ${rutaArchivo}`);

  if (!fs.existsSync(rutaArchivo)) {
    throw new Error(`El archivo no existe: ${rutaArchivo}`);
  }

  const contenido = fs.readFileSync(rutaArchivo, "utf-8");
  const registros = parse(contenido, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`✅ CSV parseado. Total de filas: ${registros.length}`);
  return registros;
};

/**
 * Mapear cada fila del CSV al objeto que se insertará en datos_clima.
 * Columnas ignoradas: codigo, festivo
 * Columnas usadas: ucp, fecha, p1_t..p24_t, p1_h..p24_h, p1_v..p24_v, p1_i..p24_i
 */
const mapearRegistros = (registros) => {
  console.log(`\n🔄 Mapeando ${registros.length} registros...`);

  const dias = [];

  for (const reg of registros) {
    const ucp = reg.ucp ? reg.ucp.trim() : null;
    const fecha = reg.fecha ? reg.fecha.trim() : null;

    if (!ucp || !fecha) {
      console.warn(
        `⚠️ ucp o fecha vacíos, saltando fila: ${JSON.stringify(reg)}`,
      );
      continue;
    }

    const dia = { ucp, fecha };

    for (let i = 1; i <= 24; i++) {
      dia[`p${i}_t`] = parseNumero(reg[`p${i}_t`]);
      dia[`p${i}_h`] = parseNumero(reg[`p${i}_h`]);
      dia[`p${i}_v`] = parseNumero(reg[`p${i}_v`]);
      dia[`p${i}_i`] = parseEntero(reg[`p${i}_i`], 0);
    }

    dias.push(dia);
  }

  console.log(`✅ Registros mapeados: ${dias.length}`);
  return dias;
};

/**
 * Construir columnas dinámicas para el INSERT
 */
const buildInsertQuery = () => {
  const cols = ["ucp", "fecha"];
  const params = ["$1", "$2"];
  let idx = 3;

  for (let i = 1; i <= 24; i++) {
    cols.push(`p${i}_t`, `p${i}_h`, `p${i}_v`, `p${i}_i`);
    params.push(`$${idx}`, `$${idx + 1}`, `$${idx + 2}`, `$${idx + 3}`);
    idx += 4;
  }

  return `INSERT INTO datos_clima (${cols.join(", ")}) VALUES (${params.join(", ")})`;
};

/**
 * Insertar en la base de datos
 */
const insertarRegistros = async (dias) => {
  const client = createClient();
  const insertQuery = buildInsertQuery();

  try {
    await client.connect();
    console.log(`\n📊 Conectado a la base de datos`);
    await client.query("BEGIN");

    let insertados = 0;
    let errores = 0;

    console.log(`💾 Procesando ${dias.length} registros...`);

    for (const dia of dias) {
      const valores = [dia.ucp, dia.fecha];
      for (let i = 1; i <= 24; i++) {
        valores.push(
          dia[`p${i}_t`],
          dia[`p${i}_h`],
          dia[`p${i}_v`],
          dia[`p${i}_i`],
        );
      }

      try {
        await client.query("SAVEPOINT sp1");
        await client.query(insertQuery, valores);
        await client.query("RELEASE SAVEPOINT sp1");
        insertados++;
      } catch (err) {
        errores++;
        await client.query("ROLLBACK TO SAVEPOINT sp1");
        console.error(
          `❌ Error insertando (UCP: ${dia.ucp}, Fecha: ${dia.fecha}): ${err.message}`,
        );
      }
    }

    await client.query("COMMIT");

    console.log(`\n✅ Proceso completado:`);
    console.log(`   - Insertados: ${insertados}`);
    console.log(`   - Errores:    ${errores}`);
  } catch (err) {
    console.error("\n❌ Error general:", err);
    await client.query("ROLLBACK");
  } finally {
    await client.end();
    console.log("\n🔌 Conexión cerrada");
  }
};

const main = async () => {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("❌ Debe indicar el archivo CSV");
      console.log("   Uso: node import_clima.js archivo.csv");
      process.exit(1);
    }

    const ruta = path.resolve(args[0]);

    const registros = leerCSV(ruta);
    const dias = mapearRegistros(registros);
    await insertarRegistros(dias);

    console.log("\n🎉 Importación completada exitosamente!");
  } catch (err) {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  }
};

main();
