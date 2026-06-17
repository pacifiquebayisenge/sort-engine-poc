type OffPackaging = {
	material?: string
	shape?: string
	recycling?: string
}

type OffProduct = {
	product_name?: string
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

/**
 * Best-effort mapping from Open Food Facts packaging material/shape tags
 * to the Fost Plus sorting fractions used in sortingItems.ts.
 *
 * This is a heuristic fallback for products that aren't in our curated
 * sortingItems list. Open Food Facts packaging data is crowd-sourced and
 * not always complete, so this should be refined as edge cases come up
 * (composite packaging, drink cartons, multi-material trays, ...).
 *
 * Returns null when we can't confidently determine a fraction.
 */
function mapMaterialsToFraction(materials: string[], shapes: string[]): string | null {
	const joinedMaterials = materials.join(' ')
	const joinedShapes = shapes.join(' ')

	// Drink cartons / Tetra Pak style packaging go in PMD in Belgium,
	// regardless of their paper content, so check shape first.
	if (/brick|carton/.test(joinedShapes)) {
		return 'PMD'
	}

	if (/aluminium|steel|metal|tin/.test(joinedMaterials)) {
		return 'PMD'
	}

	if (/plastic|pet|hdpe|ldpe|^pp$| pp |polystyrene|polypropylene/.test(joinedMaterials)) {
		return 'PMD'
	}

	if (/glass/.test(joinedMaterials)) {
		return 'Glasbol'
	}

	if (/paper|cardboard|fiber/.test(joinedMaterials)) {
		return 'Papier-karton'
	}

	if (/wood/.test(joinedMaterials)) {
		return 'Recyclagepark - hout'
	}

	return null
}

export default defineEventHandler(async (event) => {
	const barcode = getQuery(event).barcode?.toString().trim()

	if (!barcode) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Barcode is required',
		})
	}

	let offData: OffResponse

	try {
		offData = await $fetch<OffResponse>(
			`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
		)
	} catch {
		throw createError({
			statusCode: 502,
			statusMessage: 'Could not reach the product database',
		})
	}

	if (offData.status !== 1 || !offData.product) {
		return {
			found: false,
			item: null,
		}
	}

	const product = offData.product

	const materials = (product.packagings ?? [])
		.map((packaging) => packaging.material ?? '')
		.concat(product.packaging_materials_tags ?? [])
		.map((material) => material.toLowerCase())

	const shapes = (product.packagings ?? []).map((packaging) =>
		(packaging.shape ?? '').toLowerCase()
	)

	const title = product.product_name || product.product_name_en || 'Unknown product'
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
				// We found the product but couldn't confidently determine the
				// packaging material, so we flag it as uncertain rather than
				// guessing wrong. The UI can route this back into the
				// decision tree instead of presenting it as a confident match.
				id: `barcode-${barcode}`,
				title,
				fraction: 'Recyclagepark',
				matchPercentage: 40,
				source: 'barcode-uncertain',
				brand: product.brands,
			}

	return {
		found: true,
		item,
	}
})
