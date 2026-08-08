import { Router } from "express";
import validator, {
  ValidationSource,
} from "../../../../../middleware/validator.js";
import schema from "./access/schema.js";
import * as controllers from "./access/index.js";

const router = Router();

export default function () {
  router.get(
    "/listar",
    validator(schema.listar, ValidationSource.QUERY),
    controllers.listar,
  );

  router.get(
    "/contar-signo-negativo",
    validator(schema.contarSignoNegativo, ValidationSource.QUERY),
    controllers.contarSignoNegativo,
  );

  router.post(
    "/invertir-signo-negativo",
    validator(schema.invertirSignoNegativo),
    controllers.invertirSignoNegativo,
  );

  return router;
}
