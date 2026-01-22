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
            betterAuthUrl: process.env.BETTER_AUTH_URL,
        }
    }
})