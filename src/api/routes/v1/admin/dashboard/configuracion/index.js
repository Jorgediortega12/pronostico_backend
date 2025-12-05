import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // Buscar documento guardado por aux3
  router.get(
    "/buscarSaveDocumento/:aux3",
    validator(schema.buscarSaveDocumento),
    controllers.buscarSaveDocumento
  );

  //cargar dias potencia
  router.get(
    "/cargarDiasPotencia/:ucp",
    validator(schema.cargarDiasPotencia),
    controllers.cargarDiasPotencia
  );

  // buscar versiones sesion
  router.get(
    "/buscarVersionesSesion/:nombre",
    validator(schema.buscarVersioneSesion),
    controllers.buscarVersionSesion
  );

  // Buscar dias festivos
  router.get(
    "/buscarDiaFestivo/:fecha/:ucp",
    validator(schema.buscarDiaFestivo),
    controllers.buscarDiaFestivo
  );

  //cargar dias potencias
  router.get(
    "/buscarPotenciaDia/:ucp/:dia",
    validator(schema.buscarPotenciaDia),
    controllers.buscarPotenciaDia
  );

  // traer datos de historicos desde fechaInicio hasta el más reciente
  router.get(
    "/cargarPeriodosxUCPDesdeFecha/:ucp/:fechaInicio",
    validator(schema.cargarPeriodosxUCPDesdeFecha),
    controllers.cargarPeriodosxUCPDesdeFecha
  );

  // traer datos climas desde fechaInicio hasta el más reciente
  router.get(
    "/cargarVariablesClimaticasxUCPDesdeFecha/:ucp/:fechaInicio",
    validator(schema.cargarPeriodosxUCPDesdeFecha),
    controllers.cargarVariablesClimaticasxUCPDesdeFecha
  );

  // traer datos de historicos desde el limite hasta la fechaInicio
  router.get(
    "/cargarPeriodosxUCPxUnaFechaxLimite/:ucp/:fechaInicio/:limite",
    validator(schema.cargarPeriodosxUCPxUnaFechaxLimite),
    controllers.cargarPeriodosxUCPxUnaFechaxLimite
  );

  //cargar todos los dias potencias
  router.get(
    "/cargarTodosLosDiasPotencia",
    controllers.cargarTodosLosDiasPotencia
  );

  // actualizar dia potencia
  router.put(
    "/actualizarDiaPotencia",
    validator(schema.actualizarDiaPotencia),
    controllers.actualizarDiaPotencia
  );

  // POST crear dia potencia
  router.post(
    "/crearDiaPotencia",
    validator(schema.crearDiaPotencia),
    controllers.crearDiaPotencia
  );

  // POST agregar UCP fuente
  router.post(
    "/agregarUCPMedida",
    validator(schema.agregarUCPMedida),
    controllers.agregarUCPMedida
  );

  // GET cargar fuentes
  router.get("/cargarFuentes", controllers.cargarFuentes);

  // PUT actualizar
  router.put(
    "/actualizarUCPMedida",
    validator(schema.actualizarUCPMedida), // si usas middleware
    controllers.actualizarUCPMedida
  );

  // DELETE eliminar
  router.delete(
    "/eliminarUCPMedida/:codigo",
    validator(schema.eliminarUCPMedidaParams),
    controllers.eliminarUCPMedida
  );

  // GET cargar equivalencias
  router.get("/cargarEquivalencias", controllers.cargarEquivalencias);

  return router;
}
