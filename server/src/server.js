import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';

const startServer = async () => {
  try {
    // Verify Neon database connectivity before binding port
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now, current_database() as db');
    client.release();

    console.log(`[DATABASE] Connected to Neon PostgreSQL '${res.rows[0].db}' successfully at ${res.rows[0].now}`);

    const server = app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`  Secure QR-Based Authentication System Backend Server `);
      console.log(`=======================================================`);
      console.log(`  Status   : RUNNING`);
      console.log(`  Port     : ${config.port}`);
      console.log(`  Env      : ${config.nodeEnv}`);
      console.log(`  API Base : http://localhost:${config.port}/api`);
      console.log(`  Health   : http://localhost:${config.port}/api/health`);
      console.log(`=======================================================`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        await pool.end();
        console.log('Database pool terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
