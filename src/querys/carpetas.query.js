import pool from '../config/database.js';

/**
 * Clase para manejar las consultas relacionadas con carpetas
 */
class CarpetasQuery {
  constructor() {
    this.pool = pool;
  }

  /**
   * Obtener árbol completo de carpetas con jerarquía y archivos asociados
   */
  async obtenerArbolCarpetas() {
    try {
      // Consultar todas las carpetas
      const consultaCarpetas = `
        SELECT * FROM carpetas
        ORDER BY nivel ASC, nombre ASC
      `;
      const resultCarpetas = await this.pool.query(consultaCarpetas);

      // Consultar todos los archivos
      const consultaArchivos = `
        SELECT codigo, codcarpeta, nombrearchivo, path, "contentType"
        FROM archivos
        ORDER BY codcarpeta, nombrearchivo
      `;
      const resultArchivos = await this.pool.query(consultaArchivos);

      // Crear un mapa de archivos por carpeta
      const archivosPorCarpeta = new Map();
      resultArchivos.rows.forEach(archivo => {
        if (!archivosPorCarpeta.has(archivo.codcarpeta)) {
          archivosPorCarpeta.set(archivo.codcarpeta, []);
        }
        archivosPorCarpeta.get(archivo.codcarpeta).push({
          codigo: archivo.codigo,
          nombrearchivo: archivo.nombrearchivo,
          path: archivo.path,
          contentType: archivo.contentType
        });
      });

      // Construir árbol jerárquico
      const carpetasMap = new Map();
      const arbol = [];

      // Primero, crear un mapa de todas las carpetas con subcarpetas y archivos
      resultCarpetas.rows.forEach(carpeta => {
        carpetasMap.set(carpeta.codigo, {
          ...carpeta,
          subcarpetas: [],
          archivos: archivosPorCarpeta.get(carpeta.codigo) || []
        });
      });

      // Luego, construir la jerarquía
      resultCarpetas.rows.forEach(carpeta => {
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
      console.error('Error en obtenerArbolCarpetas:', error);
      throw error;
    }
  }
}

export default new CarpetasQuery();