// controllers/epm.controller.js
import * as service from "../../../../../../../services/epm.service.js";
import Logger from "../../../../../../../helpers/logger.js";
import colors from "colors";

export const consultarEPM = async (req, res) => {
  try {
    const { consulta } = req.params;
    const { desde, hasta } = req.query;
    const { session } = req.user;

    const result = await service.consultarEPM({
      consulta,
      desde,
      hasta,
      session,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.message });
    }

    return res
      .status(200)
      .json({ success: true, insertadas: result.insertadas });
  } catch (err) {
    Logger.error(colors.red("Error controller consultarEPM"), err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
