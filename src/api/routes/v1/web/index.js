import { Router } from "express";
import parametrosRoutes from "./parametros/index.js";

const router = Router();

export default function () {
  router.use("/parametros/", parametrosRoutes());
  return router;
}
