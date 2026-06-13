// routes/mpm.routes.js
import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import { validatorParamsQuery } from "../../../../../middleware/validatorParamsQuery.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/verify/documents", controllers.verifyDocuments);

  router.get(
    "/demand/:year/:month/:previous_days",
    validatorParamsQuery(schema.demand),
    controllers.getDemand,
  );

  router.post("/predict", validator(schema.predict), controllers.predict);

  router.post("/predict/excel", validator(schema.predict), controllers.predictExcel);

  return router;
}