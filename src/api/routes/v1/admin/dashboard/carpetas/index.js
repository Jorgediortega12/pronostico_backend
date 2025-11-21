import { Router } from 'express';
import * as controllers from './access/index.js';

const router = Router();

export default function () {
  // Obtener árbol completo de carpetas
  router.get('/obtenerArbolCarpetas', controllers.obtenerArbolCarpetas);

  return router;
}
