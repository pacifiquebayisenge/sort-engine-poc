/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/ai-classify
 *
 * Classifies a waste item via OpenRouter.
 *
 * Gebruikt `openrouter/free` — een speciale router van OpenRouter zelf
 * die automatisch een beschikbaar gratis model kiest. Zo hoef je geen
 * modellijst bij te houden als modellen van de gratis tier verdwijnen.
 *
 * Docs: https://openrouter.ai/openrouter/free
 *
 * Let op: `openrouter/free` is text-only. Als er een afbeelding is,
 * proberen we eerst een vision model; bij 404 vallen we terug op text.
 */

import { useRuntimeConfig } from '#imports'
import { createError, defineEventHandler, readBody } from 'h3'

const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free'
const FREE_ROUTER = 'openrouter/free'

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const body = await readBody(event)

	const description = `${body.extraDescription ?? ''}`.trim()
	const originalQuery = `${body.originalQuery ?? ''}`.trim()
	const imageBase64 = body.imageBase64 as string | null | undefined
	const postcode = `${body.postcode ?? ''}`.trim()

	if (!description && !imageBase64) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Either a description or an image is required',
		})
	}

	if (!config.openRouterApiKey) {
		throw createError({
			statusCode: 503,
			statusMessage: 'OPENROUTER_API_KEY is not configured.',
		})
	}

	const allowedFractions = [
		'PMD',
		'Glasbol',
		'Papier-karton',
		'Restafval',
		'GFT',
		'Tuinafval / GFT',
		'Textielcontainer',
		'Bebat / inzamelpunt',
		'Recupel / recyclagepark',
		'Recyclagepark - harde plastics',
		'Recyclagepark - hout',
		'Recyclagepark - metaal',
		'KGA / recyclagepark',
		'Recyclagepark - bouwafval',
	]

	const systemPrompt = `Je bent een Belgische afvalsorteerhulp. Je classificeert afvalitems voor de Belgische sorteerregels (Fost Plus).
Geef altijd exact één fractie terug uit de toegestane lijst. Retourneer enkel geldige JSON, geen andere tekst.`

	const userPromptParts: string[] = []
	if (originalQuery) userPromptParts.push(`Originele zoekopdracht: "${originalQuery}"`)
	if (description) userPromptParts.push(`Beschrijving: "${description}"`)
	if (postcode) userPromptParts.push(`Postcode van de gebruiker: ${postcode}`)
	if (imageBase64)
		userPromptParts.push(
			'Er is ook een afbeelding bijgevoegd. Analyseer die samen met de beschrijving.'
		)

	userPromptParts.push(
		`\nKies exact één fractie uit:\n${allowedFractions.map((f) => `- ${f}`).join('\n')}`,
		`\nRetourneer enkel JSON:\n{\n  "title": "korte itemnaam in het Nederlands",\n  "fraction": "één toegestane fractie",\n  "confidence": 0-100,\n  "reason": "korte reden in het Nederlands"\n}`
	)

	const userPrompt = userPromptParts.join('\n')

	const headers = {
		Authorization: `Bearer ${config.openRouterApiKey}`,
		'Content-Type': 'application/json',
		'HTTP-Referer': 'https://sort-engine-poc.local',
		'X-Title': 'Sort Engine PoC',
	}

	// ── Stap 1: probeer vision model als er een foto is ──────────────────────
	if (imageBase64) {
		try {
			const result = await callOpenRouter({
				model: VISION_MODEL,
				systemPrompt,
				userContent: [
					{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
					{ type: 'text', text: userPrompt },
				],
				headers,
			})
			if (result) {
				console.log(`[ai-classify] vision model succeeded: ${VISION_MODEL}`)
				return result
			}
		} catch (err: any) {
			// Vision model niet beschikbaar — val terug op text
			console.warn(
				`[ai-classify] vision model failed, falling back to text: ${err?.data?.error?.message ?? err?.message}`
			)
		}
	}

	// ── Stap 2: openrouter/free — altijd beschikbaar, text-only ─────────────
	try {
		const result = await callOpenRouter({
			model: FREE_ROUTER,
			systemPrompt,
			userContent: [{ type: 'text', text: userPrompt }],
			headers,
		})
		if (result) {
			console.log(`[ai-classify] free router succeeded`)
			return result
		}
	} catch (err: any) {
		console.error(`[ai-classify] free router failed:`, err?.data?.error?.message ?? err?.message)
	}

	throw createError({
		statusCode: 502,
		statusMessage: 'AI provider is currently unreachable. Try again later.',
	})
})

// ── Helper ───────────────────────────────────────────────────────────────────

async function callOpenRouter({
	model,
	systemPrompt,
	userContent,
	headers,
}: {
	model: string
	systemPrompt: string
	userContent: any[]
	headers: Record<string, string>
}): Promise<Record<string, unknown> | null> {
	const response = await $fetch<{
		choices: { message: { content: string } }[]
	}>('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers,
		body: {
			model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent },
			],
			temperature: 0.1,
			max_tokens: 300,
		},
	})

	const text = response.choices[0]?.message?.content
	if (!text) return null

	const match = text.match(/\{[\s\S]*\}/)
	if (!match) return null

	return JSON.parse(match[0])
}
