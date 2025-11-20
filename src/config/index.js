import dotenv from "dotenv";

dotenv.config();

export const name = process.env.APP_NAME || "Pronostico Backend API";
export const port = process.env.PORT || 3000;
export const nodeEnv = process.env.NODE_ENV || "development";
export const secretKey = process.env.JWT_SECRET || "default-secret-key";
// export const MEDIA_PATH =
//   process.env.DEV === false
//     ? path.resolve(__dirname, "../", "uploads")
//     : path.resolve(__dirname, "../../", "uploads");

export default {
  name,
  port,
  nodeEnv,
  secretKey,
};
