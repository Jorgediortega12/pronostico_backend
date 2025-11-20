import Joi from "joi";

import { BadRequestError } from "../../helpers/api.response.js";

export const ValidationSource = {
  BODY: "body",
  HEADER: "headers",
  QUERY: "query",
  PARAM: "params",
};

export const JoiAuthBearer = () =>
  Joi.string().custom((value, helpers) => {
    if (!value.startsWith("Bearer ")) return helpers.error("any.invalid");
    if (value.split(" ")[1] === "") return helpers.error("any.invalid");
    return value;
  }, "Authorization Header Validation");

export default (schema, source = ValidationSource.BODY) =>
  (req, res, next) => {
    const { error } = schema.validate(req[source]);

    if (error === undefined) return next();

    const { details } = error;
    const message = details
      .map((i) => i.message.replace(/['"]+/g, ""))
      .join(",");

    return BadRequestError(res, message);
  };
