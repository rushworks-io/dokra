import {defineConfig} from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    schema: '@dokra/shared/database/src/schema/index.ts',
    out: '@dokra/shared/database/migrations',
});

