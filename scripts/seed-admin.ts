import { adminPool } from "../src/db/pools.js";
import { env } from "../src/config/env.js";
import { hashPassword } from "../src/lib/security.js";

async function run(): Promise<void> {
  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);

  await adminPool.query(
    `
      INSERT INTO admin_users (username, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (username) DO UPDATE
      SET email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
    `,
    [env.SEED_ADMIN_USERNAME, env.SEED_ADMIN_EMAIL, passwordHash]
  );

  console.log(`Seeded admin user: ${env.SEED_ADMIN_USERNAME}`);
  await adminPool.end();
}

run().catch(async (error) => {
  console.error("Seed failed", error);
  await adminPool.end();
  process.exit(1);
});
