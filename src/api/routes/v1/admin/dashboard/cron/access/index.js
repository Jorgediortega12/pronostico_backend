import { SuccessResponse, InternalError } from "../../../../../../../helpers/api.response.js";
import * as cronService from "../../../../../../../services/cron.service.js";
import Logger from "../../../../../../../helpers/logger.js";

export const getConfig = async (req, res) => {
  try {
    const config = await cronService.getCronConfig();
    return SuccessResponse(res, config);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const setConfig = async (req, res) => {
  try {
    const { hour, minute } = req.body;
    const config = await cronService.setCronConfig({ hour, minute });
    return SuccessResponse(res, config);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};

export const manualSync = async (req, res) => {
  try {
    const config = await cronService.manualSync();
    return SuccessResponse(res, config);
  } catch (err) {
    Logger.error(err);
    return InternalError(res, err.message);
  }
};