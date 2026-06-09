import { Router } from "express";
import validator from "../../../../../../api/middleware/validator.js";
import { validatorParamsQuery } from "../../../../../../api/middleware/validatorParamsQuery.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // ── Demanda
  router.post("/demands",          validator(schema.getDemands),   controllers.getDemands);
  router.get("/demand/dates",                                      controllers.getDemandDates);
  router.get("/demand/dates/v2",                                   controllers.getDemandDatesV2);

  // ── Macroeconómicas 
  router.post("/economics",        validator(schema.getAllEconomics),    controllers.getAllEconomics);
  router.get("/economics",                                               controllers.getEconomicsIds);
  router.get("/economics/dates",                                         controllers.getEconomicsDates);
  router.get("/economics/:id",     validatorParamsQuery(schema.getEconomicById), controllers.getEconomicById);
  router.post("/economics/vs-demand", validator(schema.variableVsDemand), controllers.variableVsDemand);
  router.post("/economics/add",    validator(schema.insertEconomics),   controllers.insertEconomics);
  router.delete("/economics/delete", validator(schema.deleteEconomics), controllers.deleteEconomics);

  // ── Clima 
  router.post("/climates/hour",        validator(schema.climateByRange),   controllers.getClimateHour);
  router.post("/climates/day",         validator(schema.climateDay),       controllers.getClimateDay);
  router.post("/climates/month",       validator(schema.climateMonth),     controllers.getClimateMonth);
  router.post("/climates/year",        validator(schema.climateYear),      controllers.getClimateYear);
  router.post("/climates/day/all",     validator(schema.climateAllTypes),  controllers.getClimateDayAllTypes);
  router.post("/climates/month/all",   validator(schema.climateAllTypes),  controllers.getClimateMonthAllTypes);
  router.post("/climates/year/all",    validator(schema.climateYearAllTypes), controllers.getClimateYearAllTypes);

  // ── Correlación 
  router.post("/correlation",      validator(schema.correlation),   controllers.getCorrelation);

  // ── Grilla / Días
  router.post("/grid",             validator(schema.gridInfo),      controllers.getGridInfo);
  router.post("/days/types",       validator(schema.daysTypes),     controllers.getDaysTypes);

  return router;
}