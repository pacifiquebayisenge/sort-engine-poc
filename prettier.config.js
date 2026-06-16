// prettier.config.js
export default {
	semi: false,
	singleQuote: true,
	trailingComma: 'es5',
	printWidth: 100,
	useTabs: true, // use real tabs
	tabWidth: 2,
	bracketSpacing: true,

	// Vue formatting improvements
	vueIndentScriptAndStyle: false,
	singleAttributePerLine: false,

	// Plugin for import sorting (optional but recommended)
	plugins: ['@ianvs/prettier-plugin-sort-imports'],

	// Works well for Nuxt 4 structure
	importOrder: [
		'^vue$', // Vue first
		'^nuxt$', // Nuxt composables & imports
		'^@nuxt.', // Nuxt modules
		'<THIRD_PARTY_MODULES>',
		'^@/', // Aliased project imports
		'^~/',
		'^[./]', // Relative imports last
	],
}
