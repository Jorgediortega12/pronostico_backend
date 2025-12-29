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

  // GET cargarUCP?codpadre=2&estado=1
  router.get("/cargarUCP", validator(schema.cargarUCP), controllers.cargarUCP);

  // POST editar mercado en cascada
  router.post(
    "/editarMercadoCascade",
    validator(schema.editarMercado),
    controllers.editarMercadoCascade
  );

  router.get(
    "/cargarUmbral",
    validator(schema.cargarUmbralSchema),
    controllers.cargarUmbral
  );
  router.post(
    "/editarUmbral",
    validator(schema.editarUmbralSchema),
    controllers.editarUmbral
  );
  router.get(
    "/cargarDiasFestivos",
    validator(schema.cargarDiasFestivosSchema),
    controllers.cargarDiasFestivos
  );
  router.post(
    "/buscarDiaFestivo",
    validator(schema.buscarDiaFestivoSchema),
    controllers.buscarDiaFestivo
  );
  router.post(
    "/ingresarDiaFestivos",
    validator(schema.ingresarDiaFestivosSchema),
    controllers.ingresarDiaFestivos
  );
  router.post(
    "/borrarDiaFestivos",
    validator(schema.borrarDiaFestivosSchema),
    controllers.borrarDiaFestivos
  );
  router.get(
    "/buscarUltimaFechaHistorica/:ucp",
    validator(schema.buscarUltimaFechaHistorica),
    controllers.buscarUltimaFechaHistorica
  );
  router.get(
    "/buscarUltimaFechaClimaLog",
    controllers.buscarUltimaFechaClimaLog
  );
  router.get("/buscarUltimaFechaClima", controllers.buscarUltimaFechaClima);
  router.get("/buscarKey", controllers.buscarKey);
  router.get(
    "/buscarFactor",
    validator(schema.buscarFactor),
    controllers.buscarFactor
  );
  router.get(
    "/cargarCodigoRMPxUCP",
    validator(schema.cargarCodigoRMPxUCP),
    controllers.cargarCodigoRMPxUCP
  );
  router.get(
    "/cargarTipoArchivos",
    validator(schema.cargarTipoArchivos),
    controllers.cargarTipoArchivos
  );
  router.get(
    "/cargarUCPxAux2",
    validator(schema.cargarUCPxAux2),
    controllers.cargarUCPxAux2
  );
  router.get(
    "/buscarUCPActualizacionDatos/:ucp/:fecha",
    validator(schema.buscarUCPActualizacionDatos),
    controllers.buscarUCPActualizacionDatos
  );
  router.get(
    "/verificarExisteActualizacionDatos/:ucp/:fecha",
    validator(schema.verificarExisteActualizacionDatos),
    controllers.verificarExisteActualizacionDatos
  );
  router.post(
    "/agregarUCPActualizacionDatos",
    validator(schema.agregarUCPActualizacionDatos),
    controllers.agregarUCPActualizacionDatos
  );
  router.put(
    "/actualizarUCPActualizacionDatos",
    validator(schema.actualizarUCPActualizacionDatos),
    controllers.actualizarUCPActualizacionDatos
  );
  router.get(
    "/buscarClimaPeriodos/:ucp/:fecha",
    validator(schema.buscarClimaPeriodos),
    controllers.buscarClimaPeriodos
  );

  router.post(
    "/agregarClimaPronosticoLog/:fecha/:ucp",
    validator(schema.agregarClimaPronosticoLog),
    controllers.agregarClimaPronosticoLog
  );

  router.post(
    "/agregarClimaPeriodo/:fecha/:ucp/:indice/:clima",
    validator(schema.agregarClimaPeriodo),
    controllers.agregarClimaPeriodo
  );

  router.put(
    "/actualizarClimaPeriodos/:fecha/:ucp/:indice/:clima",
    validator(schema.actualizarClimaPeriodos),
    controllers.actualizarClimaPeriodos
  );

  router.get(
    "/buscarTipicidad/:ucp/:fecha",
    validator(schema.buscarTipicidad),
    controllers.buscarTipicidad
  );

  return router;
}
