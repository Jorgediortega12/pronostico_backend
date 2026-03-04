import jwt from "jsonwebtoken";
import { secretKey } from "../config/index.js";

export const signToken = (data) => {
  return jwt.sign(data, secretKey, { expiresIn: "12h" });
};
