import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

// datos_clima vive en jano_proxy (la BD centralizada que jano-proxy
// actualiza a diario y que consulta toda la app — ver ConfiguracionModel).
// Las tablas homónimas en Jano (la principal) son respaldo/legacy, no lo
// que lee la app.
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
 * Extraer fecha (YYYY-MM-DD) y hora (0-23) desde dt_iso
 * Ejemplo: "2011-01-01 00:00:00 +0000 UTC" con timezone -18000 (UTC-5)
 */
const extraerFechaHora = (dtIso, timezone) => {
  // dt_iso viene en UTC, aplicamos el offset para obtener hora local
  const match = dtIso.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const fechaUTC = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`);
  const offsetMs = parseInt(timezone) * 1000; // timezone ya está en segundos
  const fechaLocal = new Date(fechaUTC.getTime() + offsetMs);

  const fecha = fechaLocal.toISOString().slice(0, 10);
  const hora = fechaLocal.getUTCHours(); // 0-23

  return { fecha, hora };
};

/**
 * Agrupar filas por (ucp, fecha) y mapear cada hora a su periodo p1..p24
 * hora 00 → p1, hora 01 → p2, ... hora 23 → p24
 */
const agruparPorDia = (registros) => {
  console.log(`\n🔄 Agrupando registros por ciudad y fecha...`);

  const mapa = new Map();

  for (const reg of registros) {
    const ucp = reg.city_name ? reg.city_name.trim() : null;
    if (!ucp) {
      console.warn(`⚠️ city_name vacío, saltando fila dt=${reg.dt}`);
      continue;
    }

    const resultado = extraerFechaHora(reg.dt_iso, reg.timezone);
    if (!resultado) {
      console.warn(`⚠️ dt_iso inválido, saltando fila dt=${reg.dt}`);
      continue;
    }

    const { fecha, hora } = resultado;
    const periodo = hora + 1; // hora 0 → p1, hora 23 → p24
    const clave = `${ucp}__${fecha}`;

    if (!mapa.has(clave)) {
      // Inicializar el día con todos los periodos en null
      const dia = { ucp, fecha };
      for (let i = 1; i <= 24; i++) {
        dia[`p${i}_t`] = null;
        dia[`p${i}_h`] = null;
        dia[`p${i}_v`] = null;
        dia[`p${i}_i`] = 0;
      }
      mapa.set(clave, dia);
    }

    const dia = mapa.get(clave);
    dia[`p${periodo}_t`] = parseNumero(reg.temp);
    dia[`p${periodo}_h`] = parseNumero(reg.humidity);
    dia[`p${periodo}_v`] = parseNumero(reg.wind_speed);
    dia[`p${periodo}_i`] = parseEntero(reg.weather_id);
  }

  const dias = Array.from(mapa.values());
  console.log(`✅ Días agrupados: ${dias.length}`);
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
 * Insertar en la base de datos con UPSERT por (ucp, fecha)
 */
const insertarRegistros = async (dias) => {
  const client = createClient();
  const insertQuery = buildInsertQuery();

  try {
    await client.connect();
    console.log(`\n📊 Conectado a la base de datos`);
    await client.query("BEGIN");

    let insertados = 0;
    let actualizados = 0;
    let errores = 0;

    console.log(`💾 Procesando ${dias.length} días...`);

    for (const dia of dias) {
      // Construir array de valores en el mismo orden que las columnas
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

        // Verificar si ya existe el registro
        const existe = await client.query(
          `SELECT 1 FROM datos_clima WHERE ucp = $1 AND fecha = $2`,
          [dia.ucp, dia.fecha],
        );

        if (existe.rowCount > 0) {
          // UPDATE: solo actualiza los periodos que tienen valor (no sobreescribe con null)
          const setClauses = [];
          const updateVals = [dia.ucp, dia.fecha];
          let idx = 3;

          for (let i = 1; i <= 24; i++) {
            for (const sufijo of ["t", "h", "v", "i"]) {
              const col = `p${i}_${sufijo}`;
              if (dia[col] !== null) {
                setClauses.push(`${col} = $${idx}`);
                updateVals.push(dia[col]);
                idx++;
              }
            }
          }

          if (setClauses.length > 0) {
            await client.query(
              `UPDATE datos_clima SET ${setClauses.join(", ")} WHERE ucp = $1 AND fecha = $2`,
              updateVals,
            );
          }
          actualizados++;
        } else {
          await client.query(insertQuery, valores);
          insertados++;
        }

        await client.query("RELEASE SAVEPOINT sp1");
      } catch (err) {
        errores++;
        await client.query("ROLLBACK TO SAVEPOINT sp1");
        console.error(
          `❌ Error procesando (UCP: ${dia.ucp}, Fecha: ${dia.fecha}): ${err.message}`,
        );
      }
    }

    await client.query("COMMIT");

    console.log(`\n✅ Proceso completado:`);
    console.log(`   - Días insertados:   ${insertados}`);
    console.log(`   - Días actualizados: ${actualizados}`);
    console.log(`   - Errores:           ${errores}`);
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
      console.log("   Uso: node script.js archivo.csv");
      process.exit(1);
    }

    const ruta = path.resolve(args[0]);

    const registros = leerCSV(ruta);
    const dias = agruparPorDia(registros);
    await insertarRegistros(dias);

    console.log("\n🎉 Importación completada exitosamente!");
  } catch (err) {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  }
};

main();
