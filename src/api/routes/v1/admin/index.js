import { Router } from "express";
import dashboardRoutes from "./dashboard/index.js";
// import { decodeInfo } from "../../../../helpers";
const router = Router();

export default function () {
  // const sessionDecrypt = (req, res, next) => {
  //   const data = decodeInfo(
  //     req.body.session.dataEncrypt,
  //     req.body.session.timeStamp
  //   );
  //   req.body.session = JSON.parse(data);
  //   next();
  // };

  // router.use("/dashboard/", sessionDecrypt, dashboardRoutes());
  router.use("/dashboard/", dashboardRoutes());
  return router;
}
