import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time, version()');
    return res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        clusterTime: dbRes.rows[0].current_time,
        version: dbRes.rows[0].version.split(' ')[0] + ' ' + dbRes.rows[0].version.split(' ')[1],
      },
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error) {
    return res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

export default router;
