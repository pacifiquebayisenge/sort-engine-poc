/**
 * GET /api/barcode?barcode=<code>
 *
 * Looks up a product barcode via the Open Food Facts API and maps
 * its packaging materials to a Belgian sorting fraction.
 *
 * Confidence levels:
 *   90% — packaging material confidently identified (source: 'barcode')
 *   40% — product found but material unclear (source: 'barcode-uncertain')
 *        → UI should route these back to the decision tree
 *
 * Material mapping is heuristic and crowd-sourced data in OFF is incomplete,
 * so uncertain results are explicitly flagged rather than guessed wrong.
 */

type OffPackaging = {
	material?: string
	shape?: string
	recycling?: string
}

type OffProduct = {
	product_name?: string
	product_name_nl?: string
	product_name_fr?: string
	product_name_en?: string
	brands?: string
	packagings?: OffPackaging[]
	packaging_materials_tags?: string[]
}

type OffResponse = {
	status: number
	product?: OffProduct
}

type BarcodeResultItem = {
	id: string
	title: string
	fraction: string
	matchPercentage: number
	source: 'barcode' | 'barcode-uncertain'
	brand?: string
}

function mapMaterialsToFraction(materials: string[], shapes: string[]): string | null {
	const m = materials.join(' ')
	const s = shapes.join(' ')

	// Drink cartons (Tetra Pak) are PMD in Belgium regardless of paper content
	if (/brick|carton|tetra/.test(s)) return 'PMD'

	if (/aluminium|steel|metal|tin/.test(m)) return 'PMD'
	if (/plastic|pet|hdpe|ldpe|\bpp\b|polystyrene|polypropylene|pvc/.test(m)) return 'PMD'
	if (/glass/.test(m)) return 'Glasbol'
	if (/paper|cardboard|fiber|kraft/.test(m)) return 'Papier-karton'
	if (/wood/.test(m)) return 'Recyclagepark - hout'

	return null
}

function getBestProductName(product: OffProduct): string {
	return (
		product.product_name_nl ||
		product.product_name ||
		product.product_name_fr ||
		product.product_name_en ||
		'Onbekend product'
	)
}

export default defineEventHandler(async (event) => {
	const barcode = getQuery(event).barcode?.toString().trim()

	if (!barcode) {
		throw createError({ statusCode: 400, statusMessage: 'Barcode is required' })
	}

	let offData: OffResponse

	try {
		offData = await $fetch<OffResponse>(
			`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
			{
				headers: { 'User-Agent': 'SortEnginePoC/1.0 (github.com/poc)' },
			}
		)
	} catch {
		throw createError({ statusCode: 502, statusMessage: 'Could not reach Open Food Facts' })
	}

	if (offData.status !== 1 || !offData.product) {
		return { found: false, item: null }
	}

	const product = offData.product

	const materials = (product.packagings ?? [])
		.map((p) => p.material ?? '')
		.concat(product.packaging_materials_tags ?? [])
		.map((m) => m.toLowerCase())

	const shapes = (product.packagings ?? []).map((p) => (p.shape ?? '').toLowerCase())

	const title = getBestProductName(product)
	const fraction = mapMaterialsToFraction(materials, shapes)

	const item: BarcodeResultItem = fraction
		? {
				id: `barcode-${barcode}`,
				title,
				fraction,
				matchPercentage: 90,
				source: 'barcode',
				brand: product.brands,
			}
		: {
				id: `barcode-${barcode}`,
				title,
				fraction: 'Recyclagepark',
				matchPercentage: 40,
				source: 'barcode-uncertain',
				brand: product.brands,
			}

	return { found: true, item }
})
