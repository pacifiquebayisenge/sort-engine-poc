<template>
	<main class="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
		<section class="mx-auto max-w-3xl">
			<!-- Header -->
			<header class="mb-8">
				<p class="text-sm font-semibold uppercase tracking-wide text-green-700">Sort Engine PoC</p>
				<h1 class="mt-2 text-3xl font-bold sm:text-5xl">Wat mag waarheen?</h1>
				<p class="mt-4 text-slate-600">
					Zoek een afvalitem, scan een barcode of laat AI meekijken.
				</p>
			</header>

			<!-- Postcode + search -->
			<section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
				<!-- Postcode row -->
				<div class="mb-4 flex items-center gap-3">
					<div
						class="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
					>
						<span class="text-lg">📍</span>
						<input
							v-model="postcode"
							class="w-24 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
							placeholder="Postcode"
							maxlength="4"
							inputmode="numeric"
						/>
						<span v-if="postcode" class="text-xs text-slate-400"
							>— sorteerregels voor jouw gemeente</span
						>
					</div>
				</div>

				<!-- Search input -->
				<label for="search" class="mb-2 block text-sm font-medium text-slate-700">
					Zoek afvalitem
				</label>

				<div class="relative">
					<input
						id="search"
						v-model="query"
						class="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-base outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
						placeholder="Probeer: cola blik, wijnfles, nespresso capsule..."
						autocomplete="off"
					/>
					<span v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
						<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
						</svg>
					</span>
					<button
						v-else-if="query"
						type="button"
						class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
						@click="clearSearch"
					>
						✕
					</button>
				</div>

				<p v-if="errorMessage" class="mt-3 text-sm text-red-600">
					{{ errorMessage }}
				</p>
			</section>

			<!-- Low confidence warning -->
			<div
				v-if="shouldShowResults && hasLowConfidence"
				class="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900"
			>
				<p class="font-semibold">Lage zekerheid</p>
				<p class="mt-1 text-sm">
					De beste match heeft minder dan {{ MIN_CONFIDENCE_PERCENTAGE }}% zekerheid. Gebruik de
					beslissingsboom hieronder om het item preciezer te identificeren.
				</p>
			</div>

			<!-- Results -->
			<section v-if="shouldShowResults" class="mt-4 space-y-3">
				<article
					v-for="item in results"
					:key="item.id"
					class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
				>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div class="flex-1">
							<!-- Source badge -->
							<div class="mb-2 flex flex-wrap gap-2">
								<span
									v-if="item.source === 'barcode'"
									class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
								>
									📦 Barcode
								</span>
								<span
									v-else-if="item.source === 'barcode-uncertain'"
									class="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800"
								>
									📦 Barcode — onzeker
								</span>
								<span
									v-else-if="item.source === 'ai'"
									class="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800"
								>
									🤖 AI-classificatie
								</span>
								<span
									v-else
									class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800"
								>
									🔍 Zoekresultaat
								</span>
							</div>

							<h2 class="text-lg font-bold">{{ item.title }}</h2>

							<p v-if="item.brand" class="mt-0.5 text-xs text-slate-400">{{ item.brand }}</p>

							<p class="mt-1 text-sm text-slate-600">
								Fractie:
								<span class="font-semibold text-green-700">{{ item.fraction }}</span>
							</p>

							<!-- AI reason -->
							<p v-if="item.reason" class="mt-2 text-xs text-slate-500 italic">
								{{ item.reason }}
							</p>

							<!-- Postcode note for uncertain barcode -->
							<p v-if="item.source === 'barcode-uncertain'" class="mt-2 text-xs text-orange-700">
								Het verpakkingsmateriaal kon niet met zekerheid bepaald worden. Gebruik de
								beslissingsboom hieronder voor een nauwkeurigere identificatie.
							</p>
						</div>

						<div class="flex flex-col items-end gap-2">
							<!-- Match % badge -->
							<div
								class="w-fit rounded-full px-4 py-1.5 text-sm font-bold"
								:class="getMatchBadgeClass(item.matchPercentage)"
							>
								{{ item.matchPercentage }}%
							</div>

							<!-- Feedback buttons -->
							<div class="flex gap-1">
								<button
									type="button"
									class="rounded-lg px-2 py-1 text-sm transition"
									:class="
										item.feedback === 'up'
											? 'bg-green-100 text-green-700'
											: 'text-slate-400 hover:text-green-600 hover:bg-green-50'
									"
									:title="'Correct resultaat'"
									@click="submitFeedback(item, 'up')"
								>
									👍
								</button>
								<button
									type="button"
									class="rounded-lg px-2 py-1 text-sm transition"
									:class="
										item.feedback === 'down'
											? 'bg-red-100 text-red-700'
											: 'text-slate-400 hover:text-red-600 hover:bg-red-50'
									"
									:title="'Fout resultaat'"
									@click="submitFeedback(item, 'down')"
								>
									👎
								</button>
							</div>
						</div>
					</div>
				</article>
			</section>

			<!-- "Not the right result?" card -->
			<section
				v-if="shouldShowNotRightResultCard"
				class="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
			>
				<h2 class="font-bold">Niet het juiste resultaat?</h2>
				<p class="mt-1 text-sm text-slate-600">
					Beantwoord een paar vragen of scan de barcode om het item preciezer te identificeren.
				</p>
				<button
					class="mt-3 rounded-xl border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
					type="button"
					@click="showDecisionTreeManually = true"
				>
					Gebruik geleide identificatie →
				</button>
			</section>

			<!-- AI analyzing state -->
			<div
				v-if="isAnalyzing"
				class="mt-4 flex items-center gap-3 rounded-2xl bg-purple-50 p-4 text-sm text-purple-700"
			>
				<svg class="h-4 w-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
				</svg>
				<span>AI analyseert het item...</span>
			</div>

			<p v-if="aiErrorMessage" class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
				{{ aiErrorMessage }}
			</p>

			<!-- Decision tree -->
			<DecisionTree
				v-if="shouldShowDecisionTree"
				:original-query="query"
				:postcode="postcode"
				@identified="handleIdentifiedItem"
				@submit="handleFallbackSubmit"
			/>
		</section>
	</main>
</template>

<script setup lang="ts">
console.log('HOME PAGE LOADED')
const MIN_CONFIDENCE_PERCENTAGE = 60

type SearchResult = {
	id: string
	title: string
	fraction: string
	score: number
	matchPercentage: number
	source?: 'barcode' | 'barcode-uncertain' | 'ai' | 'search'
	brand?: string
	reason?: string
	feedback?: 'up' | 'down'
}

const query = ref('')
const postcode = ref('')
const results = ref<SearchResult[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const showDecisionTreeManually = ref(false)
const aiErrorMessage = ref('')
const isAnalyzing = ref(false)

let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const hasQuery = computed(() => query.value.trim().length > 0)
const hasResults = computed(() => results.value.length > 0)

const bestMatchPercentage = computed(() => results.value[0]?.matchPercentage ?? 0)

const hasLowConfidence = computed(
	() => hasResults.value && bestMatchPercentage.value < MIN_CONFIDENCE_PERCENTAGE
)

const shouldShowResults = computed(() => hasResults.value && !showDecisionTreeManually.value)

const shouldShowNotRightResultCard = computed(
	() => hasQuery.value && hasResults.value && !showDecisionTreeManually.value
)

const shouldShowDecisionTree = computed(
	() =>
		hasQuery.value &&
		!isLoading.value &&
		(results.value.length === 0 || showDecisionTreeManually.value)
)

watch(query, (value: string) => {
	showDecisionTreeManually.value = false
	if (debounceTimeout) clearTimeout(debounceTimeout)
	debounceTimeout = setTimeout(() => searchItems(value), 250)
})

async function searchItems(value: string) {
	const searchTerm = value.trim()
	if (!searchTerm) {
		results.value = []
		errorMessage.value = ''
		isLoading.value = false
		return
	}

	try {
		isLoading.value = true
		errorMessage.value = ''
		const raw = await $fetch<Omit<SearchResult, 'source' | 'feedback'>[]>('/api/search', {
			query: { q: searchTerm },
		})
		results.value = raw.map((r) => ({ ...r, source: 'search' as const }))
	} catch {
		errorMessage.value = 'Er ging iets mis bij het zoeken.'
		results.value = []
	} finally {
		isLoading.value = false
	}
}

function clearSearch() {
	query.value = ''
	results.value = []
	showDecisionTreeManually.value = false
	errorMessage.value = ''
}

function handleIdentifiedItem(item: SearchResult) {
	results.value = [item]
	showDecisionTreeManually.value = false
}

async function handleFallbackSubmit(payload: {
	originalQuery: string
	extraDescription: string
	barcode: string
	uploadedImage: File | null
}) {
	try {
		aiErrorMessage.value = ''
		isAnalyzing.value = true

		// Convert image to base64 if present
		let imageBase64: string | null = null
		if (payload.uploadedImage) {
			imageBase64 = await fileToBase64(payload.uploadedImage)
		}

		const aiResult = await $fetch<{
			title: string
			fraction: string
			confidence: number
			reason: string
		}>('/api/ai-classify', {
			method: 'POST',
			body: {
				originalQuery: payload.originalQuery,
				extraDescription: payload.extraDescription,
				imageBase64,
				postcode: postcode.value,
			},
		})

		results.value = [
			{
				id: `ai-${Date.now()}`,
				title: aiResult.title,
				fraction: aiResult.fraction,
				score: 0,
				matchPercentage: aiResult.confidence,
				source: 'ai',
				reason: aiResult.reason,
			},
		]

		showDecisionTreeManually.value = false
	} catch {
		aiErrorMessage.value =
			'AI-classificatie is momenteel niet beschikbaar. Probeer het later opnieuw.'
	} finally {
		isAnalyzing.value = false
	}
}

async function submitFeedback(item: SearchResult, type: 'up' | 'down') {
	// Toggle off if already selected
	if (item.feedback === type) {
		item.feedback = undefined
		return
	}
	item.feedback = type

	// Fire-and-forget — log to server, no blocking UI
	try {
		await $fetch('/api/log', {
			method: 'POST',
			body: {
				event: 'feedback',
				query: query.value,
				postcode: postcode.value,
				itemId: item.id,
				itemTitle: item.title,
				fraction: item.fraction,
				source: item.source,
				matchPercentage: item.matchPercentage,
				feedback: type,
			},
		})
	} catch {
		// Feedback logging failure is non-critical, silently ignore
	}
}

function getMatchBadgeClass(matchPercentage: number) {
	if (matchPercentage >= 80) return 'bg-green-100 text-green-800'
	if (matchPercentage >= 50) return 'bg-yellow-100 text-yellow-800'
	return 'bg-slate-100 text-slate-700'
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result as string
			// Strip the "data:image/...;base64," prefix — the server only needs the raw data
			resolve(result.split(',')[1] ?? result)
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}
</script>
