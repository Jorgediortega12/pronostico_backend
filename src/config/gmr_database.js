import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

const gmrPool = new Pool({
  host: process.env.GMR_POSTGRES_HOST,
  port: parseInt(process.env.GMR_POSTGRES_PORT || "5435"),
  database: process.env.GMR_POSTGRES_DATABASE,
  user: process.env.GMR_POSTGRES_USER,
  password: process.env.GMR_POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export default gmrPool;
