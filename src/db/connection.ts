import { Pool, type PoolClient } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', (_client: PoolClient) => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL error', err);
});
