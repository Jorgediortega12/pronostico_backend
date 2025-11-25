import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import Logger from './logger.js';

export const comprimirCarpeta = (sourceDir, res, zipName) => {
  return new Promise((resolve, reject) => {
    // Verificar que la carpeta existe
    if (!fs.existsSync(sourceDir)) {
      Logger.error(`Carpeta no encontrada: ${sourceDir}`);
      return reject(new Error('Carpeta no encontrada'));
    }

    // Crear el archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Nivel de compresión máximo
    });

    // Configurar headers para la descarga
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Pipe del archivo al response
    archive.pipe(res);

    // Agregar el directorio al ZIP
    archive.directory(sourceDir, false);

    // Manejar errores
    archive.on('error', (err) => {
      Logger.error('Error al crear ZIP:', err);
      reject(err);
    });

    // Manejar warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        Logger.warn('Warning al crear ZIP:', err);
      } else {
        Logger.error('Error crítico al crear ZIP:', err);
        reject(err);
      }
    });

    // Finalizar el archivo
    archive.finalize();

    // Resolver cuando termine
    archive.on('end', () => {
      Logger.info(`ZIP creado exitosamente: ${zipName}`);
      resolve();
    });
  });
};

export const comprimirArchivosYCarpetas = (archivos, subcarpetas, carpetaPrincipal, res, zipName) => {
  return new Promise((resolve, reject) => {
    // Crear el archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Configurar headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Pipe del archivo al response
    archive.pipe(res);

    // Construir mapa de carpetas por código
    const carpetasMap = new Map();
    subcarpetas.forEach(carpeta => {
      carpetasMap.set(carpeta.codigo, carpeta);
    });

    // Función para construir ruta de carpeta completa
    const construirRutaCarpeta = (codigoCarpeta) => {
      const partes = [];
      let carpetaActual = carpetasMap.get(codigoCarpeta);

      while (carpetaActual && carpetaActual.codigo !== carpetaPrincipal.codigo) {
        partes.unshift(carpetaActual.nombre);
        carpetaActual = carpetasMap.get(carpetaActual.codsuperior);
      }

      return partes.join('/');
    };

    // Crear estructura de carpetas vacías
    const carpetasCreadas = new Set();
    subcarpetas.forEach(carpeta => {
      if (carpeta.codigo !== carpetaPrincipal.codigo) {
        const rutaCarpeta = construirRutaCarpeta(carpeta.codigo);
        if (rutaCarpeta && !carpetasCreadas.has(rutaCarpeta)) {
          // Agregar carpeta vacía al ZIP
          archive.append(null, { name: rutaCarpeta + '/' });
          carpetasCreadas.add(rutaCarpeta);
          Logger.info(`Carpeta agregada al ZIP: ${rutaCarpeta}/`);
        }
      }
    });

    // Agregar archivos a sus respectivas carpetas
    if (archivos && archivos.length > 0) {
      archivos.forEach(archivo => {
        // Expandir ~ si la ruta comienza con ello
        let rutaArchivo = archivo.path;
        if (rutaArchivo.startsWith('~/')) {
          rutaArchivo = path.join(process.cwd(), rutaArchivo.substring(2));
        }
        rutaArchivo = path.resolve(rutaArchivo);

        if (fs.existsSync(rutaArchivo)) {
          // Construir ruta dentro del ZIP
          const rutaCarpeta = construirRutaCarpeta(archivo.codcarpeta);
          const rutaEnZip = rutaCarpeta ? `${rutaCarpeta}/${archivo.nombrearchivo}` : archivo.nombrearchivo;

          archive.file(rutaArchivo, { name: rutaEnZip });
          Logger.info(`Archivo agregado al ZIP: ${rutaEnZip}`);
        } else {
          Logger.warn(`Archivo no encontrado, se omitirá: ${rutaArchivo}`);
        }
      });
    }

    // Manejar errores
    archive.on('error', (err) => {
      Logger.error('Error al crear ZIP:', err);
      reject(err);
    });

    // Finalizar el archivo
    archive.finalize();

    // Resolver cuando termine
    archive.on('end', () => {
      Logger.info(`ZIP creado exitosamente: ${zipName}`);
      resolve();
    });
  });
};

// Mantener la función original para compatibilidad
export const comprimirArchivos = (archivos, res, zipName) => {
  return new Promise((resolve, reject) => {
    if (!archivos || archivos.length === 0) {
      return reject(new Error('No hay archivos para comprimir'));
    }

    // Crear el archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Configurar headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Pipe del archivo al response
    archive.pipe(res);

    // Agregar cada archivo al ZIP
    archivos.forEach(archivo => {
      // Expandir ~ si la ruta comienza con ello
      let rutaArchivo = archivo.path;
      if (rutaArchivo.startsWith('~/')) {
        rutaArchivo = path.join(process.cwd(), rutaArchivo.substring(2));
      }
      rutaArchivo = path.resolve(rutaArchivo);

      if (fs.existsSync(rutaArchivo)) {
        archive.file(rutaArchivo, { name: archivo.nombrearchivo });
      } else {
        Logger.warn(`Archivo no encontrado, se omitirá: ${rutaArchivo}`);
      }
    });

    // Manejar errores
    archive.on('error', (err) => {
      Logger.error('Error al crear ZIP:', err);
      reject(err);
    });

    // Finalizar el archivo
    archive.finalize();

    // Resolver cuando termine
    archive.on('end', () => {
      Logger.info(`ZIP creado exitosamente: ${zipName}`);
      resolve();
    });
  });
};
