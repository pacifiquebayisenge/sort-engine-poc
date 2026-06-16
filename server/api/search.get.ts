import Fuse from 'fuse.js'
import { sortingItems } from '../../data/sortingItems'

/**
 * Normalizes the search query before running the search.
 *
 * Why?
 * - Makes searches case-insensitive
 * - Removes accents (é -> e, à -> a)
 * - Replaces separators such as "-" and "_" with spaces
 * - Removes duplicate spaces
 *
 * Example:
 * "Coca-Cola" -> "coca cola"
 * "Énergy   Drink" -> "energy drink"
 */
function normalizeQuery(query: string) {
    return query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export default defineEventHandler((event) => {

    const rawQuery = getQuery(event).q?.toString() || ''


    const query = normalizeQuery(rawQuery)

    // Return an empty result set when no query is provided.
    if (!query) {
        return []
    }

    /**
     * Create a Fuse.js search index.
     *
     * Fuse.js performs fuzzy searching instead of exact matching.
     * This means users can find results even when:
     * - they make small spelling mistakes
     * - they use alternative wording
     * - they use synonyms
     *
     * Weight configuration:
     * - synonyms (40%) have the highest importance
     * - title (35%) is second
     * - keywords (25%) are supporting information
     */
    const fuse = new Fuse(sortingItems, {
        keys: [
            { name: 'title', weight: 0.35 },
            { name: 'synonyms', weight: 0.4 },
            { name: 'keywords', weight: 0.25 },
        ],

        /**
         * Search sensitivity.
         *
         * Lower values:
         * - stricter matching
         * - fewer results
         *
         * Higher values:
         * - more tolerant matching
         * - more results
         */
        threshold: 0.45,

        // Include Fuse.js similarity score in the response.
        includeScore: true,

        // Search the entire string instead of focusing on character position.
        ignoreLocation: true,

        // Ignore searches shorter than 2 characters.
        minMatchCharLength: 2,
    })

    /**
     * Execute the fuzzy search.
     *
     * Example:
     * "cola"
     * "cola blik"
     * "coca cola"
     * "monster energy"
     */
    const results = fuse.search(query)

    /**
     * Transform the Fuse.js results into a format that is easier
     * to display in the UI.
     *
     * Fuse score:
     * 0 = perfect match
     * 1 = poor match
     *
     * We convert it into a percentage:
     * 100% = perfect match
     * 0% = poor match
     */
    return results.map((result) => ({
        ...result.item,

        // Original Fuse similarity score.
        score: result.score,

        // User-friendly confidence percentage.
        matchPercentage: Math.round((1 - (result.score ?? 1)) * 100),
    }))
})