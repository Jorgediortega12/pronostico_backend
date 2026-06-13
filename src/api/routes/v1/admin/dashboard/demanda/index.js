import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  // ─── Predict (ML) ──────────────────────────────────────────────────────────
  router.post("/predict", validator(schema.predict), controllers.predict);
  router.post("/predict/excel", validator(schema.predict), controllers.predictExcel);

  // ─── Day Behavior (ML) ─────────────────────────────────────────────────────
  router.post("/day/behavior", validator(schema.dayBehavior), controllers.dayBehavior);
  router.post("/day/behavior/excel", validator(schema.dayBehavior), controllers.dayBehaviorExcel);

  // ─── Monthly Demand ─────────────────────────────────────────────────────────
  router.get("/monthly", controllers.getMonthlyDemand);
  router.get("/monthly/:year", controllers.getMonthlyDemandByYear);
  router.put("/monthly/update", validator(schema.updateMonthlyType), controllers.updateMonthlyType);

  // ─── Monthly Info ───────────────────────────────────────────────────────────
  router.post("/monthly/info", validator(schema.monthlyInfo), controllers.monthlyInfo);

  // ─── Yearly ─────────────────────────────────────────────────────────────────
  router.get("/yearly/last", controllers.getLastYear);
  router.get("/yearly/list", controllers.listHistoricYears);

  // ─── Type Year ──────────────────────────────────────────────────────────────
  router.post("/yearly/type", validator(schema.createTypeYearList), controllers.createTypeYearList);
  router.put("/yearly/type", validator(schema.updateTypeYearList), controllers.updateTypeYearList);
  router.get(
    "/yearly/type/:user_id/:session_id",
    controllers.getTypeYearList
  );

  // ─── User Models ─────────────────────────────────────────────────────────────
  router.post("/model/create", validator(schema.createModel), controllers.createModel);
  router.post("/model/savevalues", validator(schema.saveModelValues), controllers.saveModelValues);
  router.post("/model/savevalues/year", validator(schema.saveModelByYear), controllers.saveModelByYear);
  router.get("/model/values/:model_id", controllers.getModelValues);
  router.get("/model/names/:user_id/:session_id", controllers.getUserModels);
  router.post("/model/type", validator(schema.changeModelType), controllers.changeModelType);

  return router;
}