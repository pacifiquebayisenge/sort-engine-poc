/* eslint-disable @typescript-eslint/no-explicit-any */
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const body = await readBody(event)

	const description = `${body.extraDescription ?? ''}`.trim()

	if (!description) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Description is required',
		})
	}

	const allowedFractions = [
		'PMD',
		'Glass container',
		'Paper / Cardboard',
		'Residual waste',
		'Organic waste / GFT',
		'Garden waste',
		'Textile container',
		'Bebat collection point',
		'Recupel / Recycling Park',
		'Recycling Park - Hard plastics',
		'Recycling Park - Wood',
		'Recycling Park - Metal',
		'Hazardous waste / KGA',
		'Construction waste',
	]

	const prompt = `
You classify waste items for a Belgian sorting guide.

Item description:
"${description}"

Choose exactly one allowed fraction:
${allowedFractions.map((fraction) => `- ${fraction}`).join('\n')}

Return JSON only:
{
  "title": "short item name",
  "fraction": "one allowed fraction",
  "confidence": 0-100,
  "reason": "short reason"
}
`

	try {
		const response = await $fetch<{
			choices: {
				message: {
					content: string
				}
			}[]
		}>('https://router.huggingface.co/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.huggingFaceApiKey}`,
				'Content-Type': 'application/json',
			},
			body: {
				model: 'meta-llama/Llama-3.1-8B-Instruct',
				messages: [
					{
						role: 'system',
						content:
							'You classify waste items for a Belgian sorting guide. Return valid JSON only.',
					},
					{
						role: 'user',
						content: prompt,
					},
				],
				temperature: 0.1,
				max_tokens: 250,
			},
		})

		const generatedText = response.choices[0]?.message?.content

		if (!generatedText) {
			throw createError({
				statusCode: 502,
				statusMessage: 'AI did not return a response',
			})
		}

		const jsonMatch = generatedText.match(/\{[\s\S]*\}/)

		if (!jsonMatch) {
			throw createError({
				statusCode: 502,
				statusMessage: 'AI response was not valid JSON',
			})
		}

		return JSON.parse(jsonMatch[0])
	} catch (error: any) {
		console.error('Hugging Face request failed:', error?.data || error)

		throw createError({
			statusCode: 502,
			statusMessage: 'AI provider is currently unreachable',
		})
	}
})
