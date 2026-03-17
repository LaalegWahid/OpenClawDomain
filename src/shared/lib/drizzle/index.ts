import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/shared/config/env'
import fs from 'fs';
import path from 'path';

// Configure connection pool to prevent connection exhaustion
const client = postgres(env.DATABASE_URL, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 60 * 30, // Maximum lifetime of a connection in seconds (30 minutes)
  // ssl: {
  //   ca: fs.readFileSync(path.join(process.cwd(), 'global-bundle.pem')).toString(), // Match your sslmode=no-verify
  // },
});

export const db = drizzle({ client });