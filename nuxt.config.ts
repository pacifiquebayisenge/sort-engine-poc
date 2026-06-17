// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },

	runtimeConfig: {
		huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY,
	},

	modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n', '@pinia/nuxt'],

	css: ['assets/css/main.css'],

	vite: {
		optimizeDeps: {
			include: ['@zxing/browser'],
		},
	},
})
