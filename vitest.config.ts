import {defineConfig} from 'vitest/config'
import {defineVitestProject} from '@nuxt/test-utils/config'

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['server/**/*.ts', 'app/**/*.ts', 'app/**/*.vue'],
            exclude: [
                'node_modules/**',
                'test/**',
                '**/*.d.ts',
                'server/db/migrations/**',
            ],
        },
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['test/unit/*.{test,spec}.ts'],
                    environment: 'node',
                },
            },
            {
                test: {
                    name: 'e2e',
                    include: ['test/e2e/*.{test,spec}.ts'],
                    environment: 'node',
                },
            },
            await defineVitestProject({
                test: {
                    name: 'nuxt',
                    include: ['test/nuxt/*.{test,spec}.ts'],
                    environment: 'nuxt',
                },
            }),
        ],
    },
})
