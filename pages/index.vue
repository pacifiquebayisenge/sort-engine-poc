<template>
	<main class="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
		<section class="mx-auto max-w-3xl">
			<header class="mb-8">
				<p class="text-sm font-semibold uppercase tracking-wide text-green-700">Sort Engine PoC</p>

				<h1 class="mt-2 text-3xl font-bold sm:text-5xl">Smarter waste search</h1>

				<p class="mt-4 text-slate-600">
					Test fuzzy search with synonyms, keywords and match percentages.
				</p>
			</header>

			<section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
				<label for="search" class="mb-2 block text-sm font-medium text-slate-700">
					Search waste item
				</label>

				<input
					id="search"
					v-model="query"
					class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
					placeholder="Try: cola blik, fanta, yoghurtpotje, bord..."
					autocomplete="off"
				/>

				<div class="mt-3 flex items-center justify-between gap-3 text-sm">
					<p v-if="query" class="text-slate-500">
						Searching for: <strong>{{ query }}</strong>
					</p>

					<p v-if="isLoading" class="text-green-700">Searching...</p>
				</div>

				<p v-if="errorMessage" class="mt-3 text-sm text-red-600">
					{{ errorMessage }}
				</p>
			</section>

			<section v-if="shouldShowResults" class="mt-6 space-y-4">
				<div
					v-if="hasLowConfidence"
					class="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900"
				>
					<h2 class="font-bold">Low confidence results</h2>

					<p class="mt-1 text-sm">
						The best match is below {{ MIN_CONFIDENCE_PERCENTAGE }}%. You can use guided
						identification to narrow down the correct sorting category.
					</p>
				</div>

				<article
					v-for="item in results"
					:key="item.id"
					class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
				>
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h2 class="text-lg font-bold">
								{{ item.title }}
							</h2>

							<p class="mt-1 text-sm text-slate-600">
								Fraction:
								<span class="font-semibold text-green-700">
									{{ item.fraction }}
								</span>
							</p>
						</div>

						<div
							class="w-fit rounded-full px-4 py-2 text-sm font-bold"
							:class="getMatchBadgeClass(item.matchPercentage)"
						>
							{{ item.matchPercentage }}% match
						</div>
					</div>
				</article>
			</section>

			<section
				v-if="shouldShowNotRightResultCard"
				class="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
			>
				<h2 class="text-lg font-bold">Not the right result?</h2>

				<p class="mt-2 text-sm text-slate-600">
					If these suggestions don't match your item, you can answer a few questions to help
					identify it.
				</p>

				<button
					class="mt-4 rounded-xl border border-green-700 px-5 py-3 font-semibold text-green-700 transition hover:bg-green-50"
					type="button"
					@click="showDecisionTreeManually = true"
				>
					Use guided identification
				</button>
			</section>

			<DecisionTree
				v-if="shouldShowDecisionTree"
				:original-query="query"
				@identified="handleIdentifiedItem"
				@submit="handleFallbackSubmit"
			/>
		</section>
	</main>
</template>

<script setup lang="ts">
const MIN_CONFIDENCE_PERCENTAGE = 60

type SearchResult = {
	id: string
	title: string
	fraction: string
	score: number
	matchPercentage: number
}

const query = ref('')
const results = ref<SearchResult[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const showDecisionTreeManually = ref(false)

let debounceTimeout: ReturnType<typeof setTimeout> | null = null

const hasQuery = computed(() => query.value.trim().length > 0)

const hasResults = computed(() => results.value.length > 0)

const bestMatchPercentage = computed(() => {
	return results.value[0]?.matchPercentage ?? 0
})

const hasLowConfidence = computed(() => {
	return hasResults.value && bestMatchPercentage.value < MIN_CONFIDENCE_PERCENTAGE
})

const shouldShowResults = computed(() => {
	return hasResults.value && !showDecisionTreeManually.value
})

const shouldShowNotRightResultCard = computed(() => {
	return hasQuery.value && hasResults.value && !showDecisionTreeManually.value
})

const shouldShowDecisionTree = computed(() => {
	return (
		hasQuery.value &&
		!isLoading.value &&
		(results.value.length === 0 || showDecisionTreeManually.value)
	)
})

watch(query, (value) => {
	showDecisionTreeManually.value = false

	if (debounceTimeout) {
		clearTimeout(debounceTimeout)
	}

	debounceTimeout = setTimeout(() => {
		searchItems(value)
	}, 250)
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

		results.value = await $fetch<SearchResult[]>('/api/search', {
			query: { q: searchTerm },
		})
	} catch {
		errorMessage.value = 'Something went wrong while searching.'
		results.value = []
	} finally {
		isLoading.value = false
	}
}

function handleIdentifiedItem(item: SearchResult) {
	results.value = [item]
	showDecisionTreeManually.value = false
}

function handleFallbackSubmit(payload: unknown) {
	console.log('Fallback submitted:', payload)

	// Later:
	// 1. Try barcode lookup
	// 2. Try search again using extra description
	// 3. Send image to recognition service
	// 4. Create Sorting Doubt request
}

function getMatchBadgeClass(matchPercentage: number) {
	if (matchPercentage >= 80) {
		return 'bg-green-100 text-green-800'
	}

	if (matchPercentage >= 50) {
		return 'bg-yellow-100 text-yellow-800'
	}

	return 'bg-slate-100 text-slate-700'
}
</script>
