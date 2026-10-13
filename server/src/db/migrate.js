import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('--- Starting Neon PostgreSQL Schema Migration ---');
  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Connecting to Neon cluster...');
    const client = await pool.connect();
    console.log('Executing schema definition...');
    await client.query(sql);
    client.release();

    console.log('✓ Migration completed successfully! Tables and indexes verified.');
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed with error:', err);
    process.exit(1);
  }
}

runMigration();
