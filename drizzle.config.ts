import { env } from '@/shared/config/env';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
// host: env.DATABASE_HOST,
//     port: env.DATABASE_PORT,
//     user: env.DATABASE_USER,
//     password: env.DATABASE_PASS, 
//     database: env.DATABASE_DB,
url:env.DATABASE_URL
    
  }
});