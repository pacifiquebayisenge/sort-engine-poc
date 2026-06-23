// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	devtools: { enabled: true },

	compatibilityDate: '2026-06-23',

	i18n: {
		defaultLocale: 'nl',
		strategy: 'no_prefix',
		locales: [{ code: 'nl', name: 'Nederlands' }],
	},

	ssr: false,

	runtimeConfig: {
		openRouterApiKey: process.env.OPENROUTER_API_KEY,
	},

	modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', '@pinia/nuxt'],

	css: ['assets/css/main.css'],

	vite: {
		optimizeDeps: {
			include: ['@zxing/browser'],
		},
	},
})
