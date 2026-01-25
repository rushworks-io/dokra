import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: '../shared/database/src/schema/index.ts',
  out: '../shared/database/migrations',
});

