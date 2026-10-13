import { query } from '../config/db.js';
import { hashPassword } from '../services/cryptoService.js';

async function seedDatabase() {
  console.log('--- Seeding Initial Test Users ---');
  try {
    const defaultPassword = 'Password@123';
    const passwordHash = await hashPassword(defaultPassword);

    const testUsers = [
      {
        fullName: 'Alice Cybersecurity',
        email: 'alice@security.edu',
      },
      {
        fullName: 'Bob Cryptographer',
        email: 'bob@security.edu',
      },
    ];

    for (const u of testUsers) {
      const res = await query(
        `INSERT INTO users (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
         RETURNING id, full_name, email`,
        [u.fullName, u.email, passwordHash]
      );
      console.log(`✓ Seeded user: ${res.rows[0].email} (${res.rows[0].full_name}) with password: ${defaultPassword}`);
    }

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
