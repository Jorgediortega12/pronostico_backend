import { Router } from 'express';
import * as controllers from './access/index.js';

const router = Router();

export default function () {
  // Obtener árbol completo de carpetas
  router.get('/obtenerArbolCarpetas', controllers.obtenerArbolCarpetas);

  // Descargar archivo individual por código
  router.get('/descargarArchivo/:codigo', controllers.descargarArchivo);

  // Ver archivo en línea (inline) por código
  router.get('/verArchivo/:codigo', controllers.verArchivo);

  // Descargar carpeta completa como ZIP por código
  router.get('/descargarCarpeta/:codigo', controllers.descargarCarpeta);

  return router;
}
