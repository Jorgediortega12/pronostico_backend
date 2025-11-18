import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
});

pool.on('connect', () => {
  console.log('Conexión exitosa a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

export default pool;
