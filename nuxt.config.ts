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

    vite: {
        plugins: [
            tailwindcss()
        ]
    },

    nitro: {
        preset: 'cloudflare_module',
    },

    runtimeConfig: {
        private: {
            betterAuthSecret: process.env.BETTER_AUTH_SECRET,
            r2AccessKeyID: process.env.R2_ACCESS_KEY_ID,
            r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        public: {
            betterAuthUrl: process.env.BETTER_AUTH_URL,
        }
    }
})