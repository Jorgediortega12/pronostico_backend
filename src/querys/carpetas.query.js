/**
 * Clase para manejar las consultas relacionadas con carpetas
 */
import { asegurarColumnasArchivos } from "../utils/archivosMeta.js";

class CarpetasQuery {
  /**
   * Obtener información de un archivo por su código
   */
  async obtenerArchivoPorCodigo(codigoArchivo, client) {
    try {
      const consulta = `
        SELECT codigo, codcarpeta, nombrearchivo, path, "contentType"
        FROM archivos
        WHERE codigo = $1
      `;
      const result = await client.query(consulta, [codigoArchivo]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error en obtenerArchivoPorCodigo:", error);
      throw error;
    }
  }

  /**
   * Obtener información de una carpeta por su código
   */
  async obtenerCarpetaPorCodigo(codigoCarpeta, client) {
    try {
      const consulta = `
        SELECT codigo, nombre, codsuperior, nivel
        FROM carpetas
        WHERE codigo = $1
      `;
      const result = await client.query(consulta, [codigoCarpeta]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error en obtenerCarpetaPorCodigo:", error);
      throw error;
    }
  }

  /**
   * Obtener todos los archivos de una carpeta y sus subcarpetas
   */
  async obtenerArchivosDeCarpeta(codigoCarpeta, client) {
    try {
      // Primero obtener todos los códigos de carpetas (incluidas subcarpetas)
      const consultaCarpetas = `
        WITH RECURSIVE subcarpetas AS (
          SELECT codigo FROM carpetas WHERE codigo = $1
          UNION
          SELECT c.codigo FROM carpetas c
          INNER JOIN subcarpetas sc ON c.codsuperior = sc.codigo
        )
        SELECT codigo FROM subcarpetas
      `;

      const resultCarpetas = await client.query(consultaCarpetas, [
        codigoCarpeta,
      ]);
      const codigosCarpetas = resultCarpetas.rows.map((row) => row.codigo);

      if (codigosCarpetas.length === 0) {
        return [];
      }

      // Obtener todos los archivos de esas carpetas
      const consultaArchivos = `
        SELECT codigo, codcarpeta, nombrearchivo, path, "contentType"
        FROM archivos
        WHERE codcarpeta = ANY($1)
        ORDER BY codcarpeta, nombrearchivo
      `;

      const resultArchivos = await client.query(consultaArchivos, [
        codigosCarpetas,
      ]);
      return resultArchivos.rows;
    } catch (error) {
      console.error("Error en obtenerArchivosDeCarpeta:", error);
      throw error;
    }
  }

  /**
   * Obtener todas las subcarpetas de una carpeta (incluyendo vacías)
   */
  async obtenerSubcarpetas(codigoCarpeta, client) {
    try {
      const consulta = `
        WITH RECURSIVE subcarpetas AS (
          SELECT codigo, nombre, codsuperior, nivel
          FROM carpetas
          WHERE codigo = $1
          UNION
          SELECT c.codigo, c.nombre, c.codsuperior, c.nivel
          FROM carpetas c
          INNER JOIN subcarpetas sc ON c.codsuperior = sc.codigo
        )
        SELECT * FROM subcarpetas
        ORDER BY nivel, nombre
      `;

      const result = await client.query(consulta, [codigoCarpeta]);
      return result.rows;
    } catch (error) {
      console.error("Error en obtenerSubcarpetas:", error);
      throw error;
    }
  }

  /**
   * Obtener árbol completo de carpetas con jerarquía y archivos asociados
   */
  async obtenerArbolCarpetas(client) {
    try {
      // Consultar todas las carpetas
      const consultaCarpetas = `
      SELECT * FROM carpetas
      ORDER BY nivel ASC, nombre ASC
    `;
      const resultCarpetas = await client.query(consultaCarpetas);

      // Consultar archivos, obteniendo solo el de mayor código cuando hay duplicados.
      // Un reporte regenerado inserta otra fila: la primera es la generación y la última la modificación.
      await asegurarColumnasArchivos(client);
      const consultaArchivos = `
      SELECT DISTINCT ON (codcarpeta, nombrearchivo)
        codigo, codcarpeta, nombrearchivo, path, "contentType",
        creado_en AS fecha_modificacion,
        creado_por AS modificado_por,
        FIRST_VALUE(creado_en) OVER (PARTITION BY codcarpeta, nombrearchivo ORDER BY codigo ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS fecha_generacion,
        FIRST_VALUE(creado_por) OVER (PARTITION BY codcarpeta, nombrearchivo ORDER BY codigo ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS generado_por,
        COUNT(*) OVER (PARTITION BY codcarpeta, nombrearchivo) AS versiones
      FROM archivos
      ORDER BY codcarpeta, nombrearchivo, codigo DESC
    `;
      const resultArchivos = await client.query(consultaArchivos);

      // Crear un mapa de archivos por carpeta
      const archivosPorCarpeta = new Map();
      resultArchivos.rows.forEach((archivo) => {
        if (!archivosPorCarpeta.has(archivo.codcarpeta)) {
          archivosPorCarpeta.set(archivo.codcarpeta, []);
        }
        archivosPorCarpeta.get(archivo.codcarpeta).push({
          codigo: archivo.codigo,
          nombrearchivo: archivo.nombrearchivo,
          path: archivo.path,
          contentType: archivo.contentType,
          fecha_generacion: archivo.fecha_generacion,
          generado_por: archivo.generado_por,
          fecha_modificacion: archivo.fecha_modificacion,
          modificado_por: archivo.modificado_por,
          versiones: Number(archivo.versiones),
        });
      });

      // Construir árbol jerárquico
      const carpetasMap = new Map();
      const arbol = [];

      // Primero, crear un mapa de todas las carpetas con subcarpetas y archivos
      resultCarpetas.rows.forEach((carpeta) => {
        carpetasMap.set(carpeta.codigo, {
          ...carpeta,
          subcarpetas: [],
          archivos: archivosPorCarpeta.get(carpeta.codigo) || [],
        });
      });

      // Luego, construir la jerarquía
      resultCarpetas.rows.forEach((carpeta) => {
        const nodo = carpetasMap.get(carpeta.codigo);
        if (carpeta.codsuperior === 0 || carpeta.codsuperior === null) {
          arbol.push(nodo);
        } else {
          const padre = carpetasMap.get(carpeta.codsuperior);
          if (padre) {
            padre.subcarpetas.push(nodo);
          }
        }
      });

      return arbol;
    } catch (error) {
      console.error("Error en obtenerArbolCarpetas:", error);
      throw error;
    }
  }
}

export default new CarpetasQuery();
