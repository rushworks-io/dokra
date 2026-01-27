// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: true},
    css: ['~/assets/css/main.css'],

    modules: [
        '@nuxt/fonts',
        '@nuxt/hints',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/scripts',
        '@nuxt/test-utils'
    ],

    alias: {
        '@dokra/database/*': '../shared/database/src/*',
    },

    vite: {
        plugins: [
            tailwindcss()
        ]
    },

    nitro: {
        preset: 'cloudflare_module',
        alias: {
            '@dokra/database/*': '../shared/database/src/*',
        }
    },

    runtimeConfig: {
        private: {
            betterAuthSecret: process.env.BETTER_AUTH_SECRET,
        },
        public: {
            betterAuthUrl: process.env.BETTER_AUTH_URL,
        }
    }
})

