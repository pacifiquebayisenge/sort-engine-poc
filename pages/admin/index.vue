<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
	<main class="min-h-screen bg-slate-50 text-slate-900">
		<!-- Top bar -->
		<header class="border-b border-slate-200 bg-white px-6 py-4">
			<div class="mx-auto flex max-w-7xl items-center justify-between">
				<div class="flex items-center gap-3">
					<NuxtLink to="/" class="text-sm font-medium text-slate-500 hover:text-slate-800">
						← Terug naar app
					</NuxtLink>
					<span class="text-slate-300">|</span>
					<p class="text-sm font-semibold uppercase tracking-wide text-green-700">
						Sort Engine PoC
					</p>
					<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
						>Admin</span
					>
				</div>
				<button
					type="button"
					class="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
					:class="{ 'opacity-50': isLoading }"
					@click="loadStats"
				>
					<svg
						class="h-4 w-4"
						:class="{ 'animate-spin': isLoading }"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.93-2.69M20 15a8 8 0 01-14.93 2.69"
						/>
					</svg>
					Vernieuwen
				</button>
			</div>
		</header>

		<div class="mx-auto max-w-7xl px-6 py-8">
			<!-- Tab navigation -->
			<div class="mb-8 flex gap-1 rounded-xl bg-slate-200 p-1 w-fit">
				<button
					v-for="tab in tabs"
					:key="tab.id"
					type="button"
					class="rounded-lg px-5 py-2 text-sm font-semibold transition"
					:class="
						activeTab === tab.id
							? 'bg-white text-slate-900 shadow-sm'
							: 'text-slate-600 hover:text-slate-900'
					"
					@click="activeTab = tab.id"
				>
					{{ tab.label }}
					<span
						v-if="tab.id === 'queue' && openCount > 0"
						class="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white"
					>
						{{ openCount }}
					</span>
				</button>
			</div>

			<!-- ── TAB 1: Analytics ─────────────────────────────────────────── -->
			<div v-if="activeTab === 'analytics'">
				<!-- Summary cards -->
				<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					<div
						v-for="card in summaryCards"
						:key="card.label"
						class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
					>
						<p class="text-2xl font-bold" :class="card.color">{{ card.value }}</p>
						<p class="mt-1 text-xs font-medium text-slate-500">{{ card.label }}</p>
					</div>
				</div>

				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Zoekvolume per dag -->
					<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
						<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
							Zoekvolume — laatste 7 dagen
						</h2>
						<div v-if="stats" class="flex h-40 items-end gap-2">
							<div
								v-for="day in stats.volumeByDay"
								:key="day.date"
								class="group relative flex flex-1 flex-col items-center gap-1"
							>
								<span
									class="absolute -top-5 hidden rounded bg-slate-800 px-2 py-0.5 text-xs text-white group-hover:block"
								>
									{{ day.count }}
								</span>
								<div
									class="w-full rounded-t-md bg-green-500 transition-all"
									:style="`height: ${maxVolume > 0 ? Math.max(4, (day.count / maxVolume) * 140) : 4}px`"
								/>
								<span class="text-xs text-slate-400">{{ formatDay(day.date) }}</span>
							</div>
						</div>
						<div v-else class="flex h-40 items-center justify-center text-sm text-slate-400">
							Laden...
						</div>
					</div>

					<!-- Gebruik per laag -->
					<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
						<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
							Gebruik per laag
						</h2>
						<div v-if="stats" class="space-y-3">
							<div
								v-for="layer in stats.layerUsage"
								:key="layer.layer"
								class="flex items-center gap-3"
							>
								<span class="w-36 text-sm text-slate-600 flex-shrink-0">{{ layer.layer }}</span>
								<div class="flex-1 overflow-hidden rounded-full bg-slate-100 h-2">
									<div
										class="h-2 rounded-full bg-green-500 transition-all"
										:style="`width: ${totalSearches > 0 ? Math.max(2, (layer.count / totalSearches) * 100) : 0}%`"
									/>
								</div>
								<span class="w-8 text-right text-sm font-semibold text-slate-700">{{
									layer.count
								}}</span>
							</div>
						</div>
						<div v-else class="space-y-3">
							<div v-for="n in 5" :key="n" class="h-5 animate-pulse rounded bg-slate-100" />
						</div>
					</div>

					<!-- Meest gezochte items -->
					<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
						<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
							Meest gezochte queries
						</h2>
						<div v-if="stats" class="space-y-2">
							<div
								v-for="(item, i) in stats.topQueries"
								:key="item.query"
								class="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50"
							>
								<span class="w-5 text-center text-xs font-bold text-slate-400">{{
									parseInt(i.toString()) + 1
								}}</span>
								<span class="flex-1 text-sm font-medium text-slate-800">{{ item.query }}</span>
								<span
									class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
								>
									{{ item.count }}×
								</span>
							</div>
						</div>
						<div v-else class="space-y-2">
							<div v-for="n in 8" :key="n" class="h-9 animate-pulse rounded-xl bg-slate-100" />
						</div>
					</div>

					<!-- Feedback + negatieve items -->
					<div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
						<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
							Feedback
						</h2>
						<div v-if="stats">
							<!-- Thumbs summary -->
							<div class="mb-5 flex gap-4">
								<div class="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 flex-1">
									<span class="text-xl">👍</span>
									<div>
										<p class="text-2xl font-bold text-green-700">{{ stats.summary.thumbsUp }}</p>
										<p class="text-xs text-green-600">Correct</p>
									</div>
								</div>
								<div class="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 flex-1">
									<span class="text-xl">👎</span>
									<div>
										<p class="text-2xl font-bold text-red-700">{{ stats.summary.thumbsDown }}</p>
										<p class="text-xs text-red-600">Fout</p>
									</div>
								</div>
							</div>

							<!-- Meest negatief -->
							<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
								Meeste negatieve feedback
							</p>
							<div v-if="stats.topNegative.length > 0" class="space-y-2">
								<div
									v-for="item in stats.topNegative"
									:key="item.title"
									class="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2"
								>
									<div>
										<p class="text-sm font-medium text-slate-800">{{ item.title }}</p>
										<p class="text-xs text-slate-500">{{ item.fraction }}</p>
									</div>
									<span class="text-sm font-bold text-red-600">{{ item.count }}×</span>
								</div>
							</div>
							<p v-else class="text-sm text-slate-400">Nog geen negatieve feedback.</p>
						</div>
						<div v-else class="space-y-3">
							<div v-for="n in 4" :key="n" class="h-12 animate-pulse rounded-xl bg-slate-100" />
						</div>
					</div>
				</div>
			</div>

			<!-- ── TAB 2: Queue ─────────────────────────────────────────────── -->
			<div v-else-if="activeTab === 'queue'">
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h2 class="text-lg font-bold">Onopgeloste items</h2>
						<p class="mt-1 text-sm text-slate-500">
							Zoekopdrachten die via het contactformulier zijn geëindigd. Onderzoek het item, wijs
							een fractie toe en notificeer de gebruiker.
						</p>
					</div>
					<div class="flex gap-2">
						<button
							v-for="f in queueFilters"
							:key="f.value"
							type="button"
							class="rounded-xl px-4 py-2 text-sm font-medium transition"
							:class="
								queueFilter === f.value
									? 'bg-slate-800 text-white'
									: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
							"
							@click="queueFilter = f.value"
						>
							{{ f.label }}
						</button>
					</div>
				</div>

				<div v-if="stats" class="space-y-3">
					<div
						v-if="filteredQueue.length === 0"
						class="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"
					>
						<p class="text-slate-400">
							{{ queueFilter === 'open' ? 'Geen openstaande items 🎉' : 'Geen opgeloste items.' }}
						</p>
					</div>

					<div
						v-for="item in filteredQueue"
						:key="item.id"
						class="rounded-2xl bg-white p-5 shadow-sm ring-1 transition"
						:class="
							item.status === 'resolved'
								? 'ring-green-200 bg-green-50/30'
								: 'ring-slate-200 hover:ring-slate-300'
						"
					>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
							<div class="flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
										:class="
											item.status === 'resolved'
												? 'bg-green-100 text-green-800'
												: 'bg-orange-100 text-orange-800'
										"
									>
										{{ item.status === 'resolved' ? '✓ Opgelost' : '⏳ Open' }}
									</span>
									<span class="text-xs text-slate-400">{{ formatDateTime(item.timestamp) }}</span>
									<span v-if="item.postcode !== '—'" class="text-xs text-slate-400">
										📍 {{ item.postcode }}
									</span>
								</div>

								<p class="mt-2 font-semibold text-slate-800">
									Zoekopdracht: <span class="font-mono text-green-700">{{ item.query }}</span>
								</p>
								<p class="mt-1 text-sm text-slate-600">{{ item.description }}</p>

								<!-- Resolved info -->
								<div
									v-if="item.status === 'resolved'"
									class="mt-3 rounded-xl bg-green-100 px-4 py-3"
								>
									<p class="text-sm font-semibold text-green-800">
										Fractie: {{ item.resolvedFraction }}
									</p>
									<p v-if="item.resolvedNote" class="mt-0.5 text-xs text-green-700">
										{{ item.resolvedNote }}
									</p>
								</div>
							</div>

							<!-- Resolve form -->
							<div v-if="item.status === 'open'" class="flex-shrink-0 w-full sm:w-64">
								<div v-if="resolvingId === item.id" class="space-y-2">
									<select
										v-model="resolveForm.fraction"
										class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
									>
										<option value="">Kies fractie...</option>
										<option v-for="f in fractions" :key="f" :value="f">{{ f }}</option>
									</select>
									<textarea
										v-model="resolveForm.note"
										class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
										placeholder="Optionele toelichting..."
										rows="2"
									/>
									<div class="flex gap-2">
										<button
											type="button"
											class="flex-1 rounded-xl bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
											:disabled="!resolveForm.fraction || isResolving"
											@click="resolveItem(item.id)"
										>
											{{ isResolving ? 'Opslaan...' : 'Oplossen' }}
										</button>
										<button
											type="button"
											class="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
											@click="resolvingId = null"
										>
											✕
										</button>
									</div>
								</div>
								<button
									v-else
									type="button"
									class="w-full rounded-xl border border-green-700 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
									@click="startResolve(item.id)"
								>
									Onderzoeken & oplossen →
								</button>
							</div>
						</div>
					</div>
				</div>

				<div v-else class="space-y-3">
					<div
						v-for="n in 4"
						:key="n"
						class="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200"
					/>
				</div>
			</div>
		</div>
	</main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '#app'

console.log('ADMIN PAGE LOADED')

console.log('ADMIN PAGE LOADED')
useHead({ title: 'Admin — Sort Engine PoC' })

type Stats = {
	summary: {
		totalSearches: number
		totalFeedback: number
		totalEscalations: number
		noResultRate: number
		thumbsUp: number
		thumbsDown: number
	}
	volumeByDay: { date: string; count: number }[]
	topQueries: { query: string; count: number }[]
	layerUsage: { layer: string; count: number }[]
	topNegative: { title: string; fraction: string; count: number }[]
	unresolvedQueue: {
		id: string
		timestamp: string
		query: string
		description: string
		postcode: string
		status: 'open' | 'resolved'
		resolvedFraction?: string
		resolvedNote?: string
	}[]
}

const tabs = [
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'queue', label: 'Onopgeloste items' },
]
const activeTab = ref('analytics')

const stats = ref<Stats | null>(null)
const isLoading = ref(false)

const queueFilter = ref<'open' | 'resolved' | 'all'>('open')
const queueFilters = [
	{ label: 'Open', value: 'open' as const },
	{ label: 'Opgelost', value: 'resolved' as const },
	{ label: 'Alles', value: 'all' as const },
]

const resolvingId = ref<string | null>(null)
const isResolving = ref(false)
const resolveForm = reactive({ fraction: '', note: '' })

const fractions = [
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

const openCount = computed(
	() =>
		stats.value?.unresolvedQueue.filter((i: { status: string }) => i.status === 'open').length ?? 0
)

const totalSearches = computed(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	() => stats.value?.layerUsage.reduce((a: any, l: { count: any }) => a + l.count, 0) ?? 1
)

const maxVolume = computed(() =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Math.max(...(stats.value?.volumeByDay.map((d: { count: any }) => d.count) ?? [0]), 1)
)

const summaryCards = computed(() => {
	if (!stats.value) return []
	const s = stats.value.summary
	return [
		{ label: 'Totale zoekopdrachten', value: s.totalSearches, color: 'text-slate-800' },
		{
			label: 'No-result rate',
			value: `${s.noResultRate}%`,
			color: s.noResultRate > 20 ? 'text-red-600' : 'text-green-600',
		},
		{ label: 'Feedback gegeven', value: s.totalFeedback, color: 'text-slate-800' },
		{ label: 'Positieve feedback', value: s.thumbsUp, color: 'text-green-600' },
		{ label: 'Negatieve feedback', value: s.thumbsDown, color: 'text-red-600' },
		{
			label: 'Open escalaties',
			value: openCount.value,
			color: openCount.value > 0 ? 'text-orange-600' : 'text-slate-400',
		},
	]
})

const filteredQueue = computed(() => {
	if (!stats.value) return []
	const q = stats.value.unresolvedQueue
	if (queueFilter.value === 'open') return q.filter((i: { status: string }) => i.status === 'open')
	if (queueFilter.value === 'resolved')
		return q.filter((i: { status: string }) => i.status === 'resolved')
	return q
})

async function loadStats() {
	isLoading.value = true
	try {
		stats.value = await $fetch<Stats>('/api/admin/stats')
	} catch {
		console.error('Failed to load stats')
	} finally {
		isLoading.value = false
	}
}

function startResolve(id: string) {
	resolvingId.value = id
	resolveForm.fraction = ''
	resolveForm.note = ''
}

async function resolveItem(id: string) {
	if (!resolveForm.fraction) return
	isResolving.value = true
	try {
		await $fetch('/api/admin/resolve', {
			method: 'POST',
			body: { id, fraction: resolveForm.fraction, note: resolveForm.note },
		})
		resolvingId.value = null
		await loadStats()
	} catch {
		console.error('Failed to resolve item')
	} finally {
		isResolving.value = false
	}
}

function formatDay(date: string) {
	return new Date(date).toLocaleDateString('nl-BE', { weekday: 'short' })
}

function formatDateTime(ts: string) {
	return new Date(ts).toLocaleString('nl-BE', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	})
}

// Load on mount
onMounted(loadStats)
</script>
