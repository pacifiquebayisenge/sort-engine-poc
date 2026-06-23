/**
 * GET /api/admin/stats
 */

import { eventLog } from '../log.post'

export default defineEventHandler(() => {
	const now = new Date()

	const searches = eventLog.filter((e) => e.event === 'search')
	const feedbacks = eventLog.filter((e) => e.event === 'feedback')
	const escalations = eventLog.filter((e) => e.event === 'escalation')

	// ── Zoekvolume per dag (laatste 7 dagen) ─────────────────────────────────
	const volumeByDay: Record<string, number> = {}
	for (let i = 6; i >= 0; i--) {
		const d = new Date(now)
		d.setDate(d.getDate() - i)
		volumeByDay[d.toISOString().slice(0, 10)] = 0
	}
	searches.forEach((e) => {
		const day = e.timestamp.slice(0, 10)
		if (day in volumeByDay) volumeByDay[day]!++
	})

	// ── Meest gezochte queries ────────────────────────────────────────────────
	const queryCounts: Record<string, number> = {}
	searches.forEach((e) => {
		if (e.query) queryCounts[e.query] = (queryCounts[e.query] ?? 0) + 1
	})
	const topQueries = Object.entries(queryCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([query, count]) => ({ query, count }))

	// ── Gebruik per laag ──────────────────────────────────────────────────────
	const layerLabels: Record<number, string> = {
		1: 'Fuzzy search',
		2: 'Beslissingsboom',
		3: 'Barcode',
		4: 'AI-classificatie',
		5: 'Contactformulier',
	}
	const layerCounts: Record<string, number> = {
		'Fuzzy search': 0,
		Beslissingsboom: 0,
		Barcode: 0,
		'AI-classificatie': 0,
		Contactformulier: 0,
	}
	searches.forEach((e) => {
		const label = layerLabels[e.layer ?? 1]
		if (label) layerCounts[label]!++
	})
	const layerUsage = Object.entries(layerCounts).map(([layer, count]) => ({ layer, count }))

	// ── No-result rate ────────────────────────────────────────────────────────
	const totalSearches = searches.length
	const noResultSearches = searches.filter(
		(e) => e.resultsCount === 0 || e.resultsCount === undefined
	).length
	const noResultRate = totalSearches > 0 ? Math.round((noResultSearches / totalSearches) * 100) : 0

	// ── Feedback verdeling ────────────────────────────────────────────────────
	const thumbsUp = feedbacks.filter((e) => e.feedback === 'up').length
	const thumbsDown = feedbacks.filter((e) => e.feedback === 'down').length

	const negativeFeedback: Record<string, { title: string; fraction: string; count: number }> = {}
	feedbacks
		.filter((e) => e.feedback === 'down')
		.forEach((e) => {
			const key = e.itemId ?? e.itemTitle ?? 'unknown'
			if (!negativeFeedback[key]) {
				negativeFeedback[key] = {
					title: e.itemTitle ?? key,
					fraction: e.fraction ?? '—',
					count: 0,
				}
			}
			negativeFeedback[key]!.count++
		})
	const topNegative = Object.values(negativeFeedback)
		.sort((a, b) => b.count - a.count)
		.slice(0, 5)

	// ── Onopgeloste items queue ───────────────────────────────────────────────
	const unresolvedQueue = escalations
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, 50)
		.map((e) => ({
			id: e.id ?? `esc-${e.timestamp}`,
			timestamp: e.timestamp,
			query: e.query ?? '—',
			description: e.message ?? '—',
			postcode: e.postcode ?? '—',
			status: (e.resolved ? 'resolved' : 'open') as 'open' | 'resolved',
			resolvedFraction: e.resolvedFraction,
			resolvedNote: e.resolvedNote,
		}))

	return {
		summary: {
			totalSearches,
			totalFeedback: feedbacks.length,
			totalEscalations: escalations.length,
			noResultRate,
			thumbsUp,
			thumbsDown,
		},
		volumeByDay: Object.entries(volumeByDay).map(([date, count]) => ({ date, count })),
		topQueries,
		layerUsage,
		topNegative,
		unresolvedQueue,
	}
})
