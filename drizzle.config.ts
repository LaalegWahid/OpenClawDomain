import { env } from './src/shared/config/env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL
  }
});