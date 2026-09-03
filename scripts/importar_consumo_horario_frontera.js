// Importa el archivo de "Consumos Pronóstico" (energía horaria de
// importación/exportación por frontera) a una tabla nueva
// flujo_datos_horarios — valor CRUDO por flujo por día (sin signo todavía;
// el signo se aplica al calcular, ver calcular_consumo_ecuacion_frontera.js),
// para las fronteras que ya existan como `flujo` (import
// importar_ecuacion_frontera.js primero).
//
// El Excel trae, por fila, un "CodGenerico" con su código de importación Y
// de exportación (dos direcciones del mismo punto físico) más el valor
// activo de cada dirección para esa hora. Sólo nos interesan las columnas
// (import o export) cuyo código coincide con alguna fila de `flujo` — si el
// código de importación de la fila coincide, se toma ActivaImportacion; si
// es el de exportación, ActivaExportacion.
//
// Uso: node scripts/importar_consumo_horario_frontera.js "<ruta.xlsx>"

import ExcelJS from "exceljs";
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

async function crearTabla(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS flujo_datos_horarios (
      id SERIAL PRIMARY KEY,
      id_flujo INTEGER NOT NULL REFERENCES flujo(id),
      fecha DATE NOT NULL,
      p1 DOUBLE PRECISION, p2 DOUBLE PRECISION, p3 DOUBLE PRECISION, p4 DOUBLE PRECISION,
      p5 DOUBLE PRECISION, p6 DOUBLE PRECISION, p7 DOUBLE PRECISION, p8 DOUBLE PRECISION,
      p9 DOUBLE PRECISION, p10 DOUBLE PRECISION, p11 DOUBLE PRECISION, p12 DOUBLE PRECISION,
      p13 DOUBLE PRECISION, p14 DOUBLE PRECISION, p15 DOUBLE PRECISION, p16 DOUBLE PRECISION,
      p17 DOUBLE PRECISION, p18 DOUBLE PRECISION, p19 DOUBLE PRECISION, p20 DOUBLE PRECISION,
      p21 DOUBLE PRECISION, p22 DOUBLE PRECISION, p23 DOUBLE PRECISION, p24 DOUBLE PRECISION,
      actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (id_flujo, fecha)
    );
  `);
}

async function main() {
  const [rutaArchivo] = process.argv.slice(2);
  if (!rutaArchivo) {
    console.log("Uso: node scripts/importar_consumo_horario_frontera.js <ruta.xlsx>");
    process.exit(1);
  }

  const client = createClient();
  await client.connect();
  await crearTabla(client);

  const flujosResult = await client.query("SELECT id, nombre FROM flujo");
  const flujoPorCodigo = new Map(
    flujosResult.rows.map((f) => [f.nombre.toUpperCase(), f.id]),
  );
  console.log(`📚 ${flujoPorCodigo.size} flujos conocidos en la DB`);

  console.log("📄 Leyendo Excel (puede tardar unos minutos por el tamaño)...");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(rutaArchivo);
  const sheet = workbook.worksheets[0];

  // Map<"idFlujo|fechaISO", { p1..p24 }>
  const acumulado = new Map();
  let filasLeidas = 0;
  let filasUsadas = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    filasLeidas++;

    const codImport = row.getCell(2).value;
    const codExport = row.getCell(3).value;
    const fechaCell = row.getCell(4).value;
    const hora = row.getCell(5).value;
    const activaImport = row.getCell(6).value;
    const activaExport = row.getCell(8).value;

    if (!fechaCell || !hora) return;
    const fechaISO =
      fechaCell instanceof Date
        ? fechaCell.toISOString().slice(0, 10)
        : String(fechaCell).slice(0, 10);
    const periodo = Number(hora);
    if (!(periodo >= 1 && periodo <= 24)) return;

    const registrar = (codigo, valor) => {
      if (!codigo) return;
      const idFlujo = flujoPorCodigo.get(String(codigo).trim().toUpperCase());
      if (!idFlujo) return;
      filasUsadas++;

      const clave = `${idFlujo}|${fechaISO}`;
      if (!acumulado.has(clave)) {
        acumulado.set(clave, { idFlujo, fecha: fechaISO, periodos: {} });
      }
      acumulado.get(clave).periodos[periodo] = Number(valor) || 0;
    };

    registrar(codImport, activaImport);
    registrar(codExport, activaExport);
  });

  console.log(`✅ ${filasLeidas} filas horarias leídas, ${filasUsadas} coincidieron con un flujo conocido`);
  console.log(`✅ ${acumulado.size} combinaciones (flujo, día) a guardar`);

  const cols = Array.from({ length: 24 }, (_, i) => `p${i + 1}`);
  const insertQuery = `
    INSERT INTO flujo_datos_horarios (id_flujo, fecha, ${cols.join(", ")})
    VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(", ")})
    ON CONFLICT (id_flujo, fecha) DO UPDATE SET
      ${cols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")},
      actualizado_en = NOW();
  `;

  try {
    await client.query("BEGIN");
    let procesados = 0;
    for (const { idFlujo, fecha, periodos } of acumulado.values()) {
      const valores = [idFlujo, fecha, ...cols.map((_, i) => periodos[i + 1] ?? null)];
      await client.query(insertQuery, valores);
      procesados++;
      if (procesados % 200 === 0) {
        console.log(`   ... ${procesados}/${acumulado.size}`);
      }
    }
    await client.query("COMMIT");
    console.log(`🎉 ${procesados} filas día guardadas en flujo_datos_horarios.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error:", err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
