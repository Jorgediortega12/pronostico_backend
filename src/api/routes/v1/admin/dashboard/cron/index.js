import { Router } from "express";
import validator from "../../../../../middleware/validator.js";
import * as schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get("/config", controllers.getConfig);
  router.post("/config", validator(schema.setConfig), controllers.setConfig);
  router.post("/sync/manual", controllers.manualSync);
  return router;
}