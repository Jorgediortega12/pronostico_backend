import { Router } from 'express';
import * as controllers from './access/index.js';

const router = Router();

export default function () {
  // Buscar documento guardado por aux3
  router.get('/buscarSaveDocumento/:aux3', controllers.buscarSaveDocumento);

  //cargar dias potencia
  router.get('/cargarDiasPotencia/:ucp', controllers.cargarDiasPotencia);

  // buscar versiones sesion
  router.get('/buscarVersionesSesion/:nombre', controllers.buscarVersionSesion);
  return router;
}