import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

// Strip sslmode/sslrootcert from the URL — postgres.js forwards unknown
// query params as server startup parameters, which PostgreSQL rejects.
// SSL is handled entirely via the `ssl` option below.
const url = new URL(env.DATABASE_URL);
url.searchParams.delete('sslmode');
url.searchParams.delete('sslrootcert');
const cleanUrl = url.toString();

const certPath = path.join(process.cwd(), 'global-bundle.pem');
const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
const sslOptions = (process.env.LOCAL_DEV === "true" && isLocalHost)
  ? false
  : fs.existsSync(certPath)
    ? { ca: fs.readFileSync(certPath).toString() }
    : true;

const client = postgres(cleanUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 60 * 30,
  ssl: sslOptions,
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