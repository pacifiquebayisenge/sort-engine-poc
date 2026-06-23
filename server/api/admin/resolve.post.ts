/**
 * POST /api/admin/resolve
 *
 * Markeert een escalatie als opgelost en slaat de fractie op.
 * In productie: update de database + stuur notificatie naar de gebruiker.
 */

import { eventLog } from '../log.post'

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const { id, fraction, note } = body

	if (!id || !fraction) {
		throw createError({ statusCode: 400, statusMessage: 'id and fraction are required' })
	}

	// Zoek de escalatie op in de log en markeer als opgelost
	const entry = eventLog.find(
		(e) => e.event === 'escalation' && (e.id === id || `esc-${e.timestamp}` === id)
	)

	if (!entry) {
		throw createError({ statusCode: 404, statusMessage: 'Escalation not found' })
	}

	// Muteer het entry in-place (in productie: DB update)
	;(entry as Record<string, unknown>).resolved = true
	;(entry as Record<string, unknown>).resolvedFraction = fraction
	;(entry as Record<string, unknown>).resolvedNote = note ?? ''
	;(entry as Record<string, unknown>).resolvedAt = new Date().toISOString()

	console.log(`[admin] resolved escalation ${id} → ${fraction}`)

	// In productie: stuur e-mail notificatie naar gebruiker
	// await sendNotification(entry.userEmail, fraction)

	return { ok: true }
})
