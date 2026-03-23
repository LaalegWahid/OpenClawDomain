import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../config/env';

const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  ssl: "require",
});

// Configure connection pool to prevent connection exhaustion
// const client = postgres(env.DATABASE_URL, {
//   max: 10, // Maximum number of connections in the pool
//   idle_timeout: 20, // Close idle connections after 20 seconds
//   connect_timeout: 30, // Connection timeout in seconds
//   max_lifetime: 60 * 30, // Maximum lifetime of a connection in seconds (30 minutes)
//   // ssl: {
//   //   ca: fs.readFileSync(path.join(process.cwd(), 'global-bundle.pem')).toString(), // Match your sslmode=no-verify
//   // },
// });

export const db = drizzle({ client });