/**
 * reconcile-migrations.ts
 *
 * Fixes the drizzle.__drizzle_migrations tracking table after a merge conflict
 * caused duplicated / out-of-sync migration files.
 *
 * Run with: pnpm tsx scripts/reconcile-migrations.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { readMigrationFiles } from 'drizzle-orm/migrator';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment');
}

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'src/shared/db/migrations');
const MIGRATIONS_SCHEMA  = 'drizzle';
const MIGRATIONS_TABLE   = '__drizzle_migrations';

async function main() {
  // Use drizzle's own reader so hashes are computed identically to what
  // drizzle-kit migrate would use.
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  console.log(`\n📂 Journal contains ${migrations.length} migration(s):`);
  migrations.forEach((m, i) =>
    console.log(`  [${i}] created_at=${m.folderMillis}  hash=${m.hash.slice(0, 12)}...`)
  );

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    // ── Ensure tracking schema / table exist ──────────────────────────────
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
        id         SERIAL  PRIMARY KEY,
        hash       text    NOT NULL,
        created_at bigint
      )
    `);

    // ── Read what the DB already knows about ─────────────────────────────
    const { rows: existing } = await client.query<{ hash: string; created_at: string }>(
      `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY created_at ASC`
    );
    console.log(`\n🗄️  DB tracking table has ${existing.length} record(s):`);
    existing.forEach((r) =>
      console.log(`  created_at=${r.created_at}  hash=${r.hash.slice(0, 12)}...`)
    );

    const existingMillis = new Set(existing.map((r) => String(r.created_at)));

    // ── Insert any missing entries ────────────────────────────────────────
    let inserted = 0;
    for (const migration of migrations) {
      const key = String(migration.folderMillis);
      if (existingMillis.has(key)) {
        console.log(`  ✅ Already recorded: created_at=${key}`);
      } else {
        await client.query(
          `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (hash, created_at) VALUES ($1, $2)`,
          [migration.hash, migration.folderMillis]
        );
        console.log(`  ➕ Inserted:         created_at=${key}`);
        inserted++;
      }
    }

    console.log(`\n✅ Done — inserted ${inserted} missing record(s). DB is now in sync with the journal.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
