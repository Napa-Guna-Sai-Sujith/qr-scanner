import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// Configure connection pool optimized for Neon PostgreSQL
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false, // Required for Neon cloud TLS connections
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DATABASE POOL ERROR]', err.message);
});

/**
 * Execute parameterized query with automatic error logging
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development' && duration > 500) {
      console.warn(`[SLOW QUERY ${duration}ms]:`, text.slice(0, 100));
    }
    return res;
  } catch (error) {
    console.error('[DB QUERY FAILED]:', error.message);
    throw error;
  }
};

/**
 * Helper to run operations within an atomic PostgreSQL transaction
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
