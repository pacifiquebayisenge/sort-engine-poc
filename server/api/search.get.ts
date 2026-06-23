import Fuse from 'fuse.js'
import { sortingItems } from '../../data/sortingItems'

/**
 * GET /api/search?q=<query>
 *
 * Fuzzy search over the local sortingItems dataset using Fuse.js.
 * In production this would call the Fost Plus API and run Fuse.js
 * over the cached response instead of the static local file.
 *
 * Normalization:
 *   - Lowercased
 *   - Diacritics stripped (é → e)
 *   - Separators (-, _, /) replaced with spaces
 *   - Duplicate whitespace collapsed
 *
 * Fuse.js weight config:
 *   synonyms  40% — highest: these are the primary alternative names
 *   title     35% — second: official name
 *   keywords  25% — supporting: brand names, colloquial terms
 */

function normalizeQuery(query: string): string {
	return query
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[-_/]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

// Build the Fuse index once at module load (not per request)
const fuse = new Fuse(sortingItems, {
	keys: [
		{ name: 'title', weight: 0.35 },
		{ name: 'synonyms', weight: 0.4 },
		{ name: 'keywords', weight: 0.25 },
	],
	threshold: 0.45,
	includeScore: true,
	ignoreLocation: true,
	minMatchCharLength: 2,
})

export default defineEventHandler(async (event) => {
	const rawQuery = getQuery(event).q?.toString() ?? ''
	const postcode = getQuery(event).postcode?.toString() ?? ''
	const query = normalizeQuery(rawQuery)

	if (!query) return []

	const results = fuse.search(query)

	const mapped = results.map((result) => ({
		...result.item,
		score: result.score,
		matchPercentage: Math.round((1 - (result.score ?? 1)) * 100),
		source: 'search' as const,
	}))

	// Fire-and-forget log — doesn't block the response
	event.waitUntil?.(
		$fetch('/api/log', {
			method: 'POST',
			body: {
				event: 'search',
				query: rawQuery,
				postcode,
				resultsCount: mapped.length,
				topMatch: mapped[0]?.title ?? null,
				topMatchPercentage: mapped[0]?.matchPercentage ?? null,
				layer: 1,
			},
		}).catch(() => {
			// Logging is non-critical
		})
	)

	return mapped
})
