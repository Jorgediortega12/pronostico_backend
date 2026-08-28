import { Router } from "express";
import pronosticosRoutes from "./pronosticos/index.js";
import demandaRoutes from "./demanda/index.js";
import carpetasRoutes from "./carpetas/index.js";
import configuracionRoutes from "./configuracion/index.js";
import sesionesRoutes from "./sesiones/index.js";
import MenuRoutes from "./menu/index.js";
import FactoresRoutes from "./factores/index.js";
import EpmRoutes from "./epm/index.js";
import CircuitosRoutes from "./circuitos/index.js";
import analysisRoutes from "./analysis/index.js";
import cronRoutes from "./cron/index.js";
import ademRoutes from "./adem/index.js";
import cubrimientoRoutes from "./cubrimiento/index.js";
import mpmRoutes from "./mpm/index.js";
import convocatoriaRoutes from "./convocatoria/index.js";
import valoracionRoutes from "./valoracion/index.js";
import auditoriaRoutes from "./auditoria/index.js";
import climaMapaRoutes from "./clima_mapa/index.js";
import medidasFactoresRoutes from "./medidas_factores/index.js";
import dnaIdoConfigRoutes from "./dna_ido_config/index.js";
import noticiasIdeamRoutes from "./noticias_ideam/index.js";
import noticiasUngrdRoutes from "./noticias_ungrd/index.js";
import configCiudadesClimaRoutes from "./config_ciudades_clima/index.js";

const router = Router();

export default function () {
  router.use("/pronosticos", pronosticosRoutes());
  router.use("/demanda", demandaRoutes());
  router.use("/carpetas", carpetasRoutes());
  router.use("/configuracion", configuracionRoutes());
  router.use("/sesiones", sesionesRoutes());
  router.use("/menu", MenuRoutes());
  router.use("/factores", FactoresRoutes());
  router.use("/epm", EpmRoutes());
  router.use("/circuitos", CircuitosRoutes());
  router.use("/analysis", analysisRoutes());
  router.use("/cron", cronRoutes());
  router.use("/adem", ademRoutes());
  router.use("/cubrimiento", cubrimientoRoutes());
  router.use("/mpm", mpmRoutes());
  router.use("/convocatoria", convocatoriaRoutes());
  router.use("/valoracion", valoracionRoutes());
  router.use("/auditoria", auditoriaRoutes());
  router.use("/clima_mapa", climaMapaRoutes());
  router.use("/medidas_factores", medidasFactoresRoutes());
  router.use("/dna_ido_config", dnaIdoConfigRoutes());
  router.use("/noticias_ideam", noticiasIdeamRoutes());
  router.use("/noticias_ungrd", noticiasUngrdRoutes());
  router.use("/config_ciudades_clima", configCiudadesClimaRoutes());

  return router;
}