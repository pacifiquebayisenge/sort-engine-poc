<template>
	<section class="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-bold">
					{{
						currentMode === 'questions'
							? 'Geleide identificatie'
							: currentMode === 'barcode'
								? 'Barcode opzoeken'
								: 'Item beschrijven'
					}}
				</h2>
				<p class="mt-1 text-sm text-slate-500">Stap {{ currentStep }} van 3</p>
			</div>

			<!-- Step indicator -->
			<div class="flex gap-1.5 pt-1">
				<span
					v-for="n in 3"
					:key="n"
					class="h-1.5 w-6 rounded-full transition-colors"
					:class="n <= currentStep ? 'bg-green-600' : 'bg-slate-200'"
				/>
			</div>
		</div>

		<!-- ─── STEP 1: Guided questions ─────────────────────────────────── -->
		<div v-if="currentMode === 'questions'" class="mt-6 space-y-5">
			<div v-if="activeQuestion" class="space-y-3">
				<p class="font-semibold text-slate-800">{{ activeQuestion.question }}</p>

				<div class="grid gap-2 sm:grid-cols-2">
					<button
						v-for="option in activeQuestion.options"
						:key="option.value"
						type="button"
						class="rounded-xl border px-4 py-3 text-left text-sm font-medium transition"
						:class="
							selectedAnswers[activeQuestion.id] === option.value
								? 'border-green-600 bg-green-50 text-green-800'
								: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
						"
						@click="answerQuestion(activeQuestion.id, option.value, option.fraction)"
					>
						<span class="mr-2">{{ option.icon }}</span>
						{{ option.label }}
					</button>
				</div>
			</div>

			<!-- Identified via decision tree -->
			<div v-if="treeResult" class="rounded-xl border border-green-200 bg-green-50 p-4">
				<p class="text-sm font-semibold text-green-800">Fractie bepaald via beslissingsboom</p>
				<p class="mt-1 text-lg font-bold text-green-900">{{ treeResult.fraction }}</p>
				<p class="mt-0.5 text-sm text-green-700">{{ treeResult.item }}</p>
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						class="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
						@click="confirmTreeResult"
					>
						Bevestigen
					</button>
					<button
						type="button"
						class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
						@click="goToBarcode"
					>
						Toch barcode scannen
					</button>
				</div>
			</div>

			<button
				v-if="!treeResult"
				type="button"
				class="mt-2 text-sm font-semibold text-slate-500 underline hover:text-slate-800"
				@click="goToBarcode"
			>
				Sla vragen over → scan barcode
			</button>
		</div>

		<!-- ─── STEP 2: Barcode ──────────────────────────────────────────── -->
		<div v-else-if="currentMode === 'barcode'" class="mt-6">
			<p class="text-sm text-slate-600">
				Scan de barcode op de verpakking of typ hem manueel in. Dit is doorgaans de nauwkeurigste
				methode voor verpakte producten.
			</p>

			<div class="mt-4 space-y-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						v-model="barcode"
						class="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
						placeholder="Barcode invoeren"
						inputmode="numeric"
						@keyup.enter="lookupBarcode()"
					/>
					<button
						type="button"
						class="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
						:disabled="isLookingUpBarcode || !barcode.trim()"
						@click="lookupBarcode()"
					>
						{{ isLookingUpBarcode ? 'Zoeken...' : 'Opzoeken' }}
					</button>
					<button
						type="button"
						class="rounded-xl border border-green-700 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-50"
						@click="showScanner = !showScanner"
					>
						{{ showScanner ? 'Scanner sluiten' : '📷 Scan' }}
					</button>
				</div>

				<p v-if="barcodeError" class="text-sm text-red-600">{{ barcodeError }}</p>

				<ClientOnly>
					<BarcodeScanner v-if="showScanner" @detected="handleBarcodeDetected" />
				</ClientOnly>
			</div>

			<div class="mt-5 flex gap-3">
				<button
					type="button"
					class="text-sm font-semibold text-slate-500 underline hover:text-slate-800"
					@click="currentMode = 'questions'"
				>
					← Terug naar vragen
				</button>
				<button
					type="button"
					class="text-sm font-semibold text-slate-500 underline hover:text-slate-800"
					@click="goToAiInput"
				>
					Geen barcode → beschrijf item
				</button>
			</div>
		</div>

		<!-- ─── STEP 3: AI input ──────────────────────────────────────────── -->
		<div v-else-if="currentMode === 'ai-input'" class="mt-6">
			<p class="text-sm text-slate-600">
				Geef een korte omschrijving en laad eventueel een foto op. De AI analyseert tekst én
				afbeelding samen.
			</p>

			<div class="mt-4 space-y-4">
				<textarea
					v-model="extraDescription"
					class="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
					placeholder="Bijv: rood aluminium blikje van Coca-Cola, kapotte keramieken mok, oud computermonitor..."
				/>

				<!-- Image upload / camera -->
				<div>
					<label class="mb-1.5 block text-sm font-medium text-slate-700">
						Foto (optioneel maar aanbevolen)
					</label>
					<input
						type="file"
						accept="image/*"
						capture="environment"
						class="w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-green-700"
						@change="handleFileUpload"
					/>
					<div v-if="uploadedImage" class="mt-2 flex items-center gap-2 text-sm text-slate-500">
						<span>📷</span>
						<span>{{ uploadedImage.name }}</span>
						<button
							type="button"
							class="text-red-400 hover:text-red-600"
							@click="uploadedImage = null"
						>
							✕
						</button>
					</div>
					<p v-if="uploadedImage" class="mt-1 text-xs text-green-600">
						Foto wordt meegestuurd naar de AI voor analyse
					</p>
				</div>
			</div>

			<div class="mt-5 flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					class="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
					:disabled="!extraDescription.trim() && !uploadedImage"
					@click="submitFallback"
				>
					🤖 Analyseer met AI
				</button>
				<button
					type="button"
					class="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
					@click="currentMode = 'barcode'"
				>
					← Terug naar barcode
				</button>
			</div>

			<p class="mt-3 text-xs text-slate-400">
				Geen resultaat via AI?
				<button type="button" class="underline hover:text-slate-600" @click="openContactForm">
					Stuur een vraag naar Fost Plus
				</button>
			</p>
		</div>

		<!-- Reset -->
		<button
			class="mt-6 text-sm font-semibold text-slate-400 hover:text-slate-700"
			@click="resetTree"
		>
			↺ Opnieuw beginnen
		</button>
	</section>
</template>

<script setup lang="ts">
type IdentifiedItem = {
	id: string
	title: string
	fraction: string
	score: number
	matchPercentage: number
	source?: string
	brand?: string
}

type FallbackPayload = {
	originalQuery: string
	extraDescription: string
	barcode: string
	uploadedImage: File | null
}

type Question = {
	id: string
	question: string
	options: {
		value: string
		label: string
		icon: string
		fraction?: string
		nextQuestion?: string
	}[]
}

// ── Decision tree questions ───────────────────────────────────────────────────
// Each answer either resolves to a fraction or points to the next question.
// This replaces the flat binary "barcode or describe" with a real guided flow.
const QUESTIONS: Question[] = [
	{
		id: 'category',
		question: 'Wat voor soort item is het?',
		options: [
			{
				value: 'packaging',
				label: 'Verpakking / huishoud',
				icon: '📦',
				nextQuestion: 'packaging-material',
			},
			{
				value: 'electronics',
				label: 'Elektrisch apparaat',
				icon: '🔌',
				fraction: 'Recupel / recyclagepark',
			},
			{
				value: 'furniture',
				label: 'Meubel / groot object',
				icon: '🛋️',
				nextQuestion: 'furniture-material',
			},
			{ value: 'garden', label: 'Tuin- of voedselafval', icon: '🌿', nextQuestion: 'organic-type' },
			{
				value: 'hazardous',
				label: 'Chemisch / gevaarlijk',
				icon: '⚠️',
				fraction: 'KGA / recyclagepark',
			},
			{ value: 'textile', label: 'Kleding / textiel', icon: '👕', nextQuestion: 'textile-state' },
		],
	},
	{
		id: 'packaging-material',
		question: 'Uit welk materiaal is de verpakking?',
		options: [
			{ value: 'plastic-soft', label: 'Zacht plastic (folie, zakje)', icon: '🛍️', fraction: 'PMD' },
			{ value: 'plastic-rigid', label: 'Hard plastic (fles, pot)', icon: '🧴', fraction: 'PMD' },
			{ value: 'metal', label: 'Metaal (blik, spuitbus leeg)', icon: '🥫', fraction: 'PMD' },
			{ value: 'glass', label: 'Glas (fles, pot)', icon: '🍾', fraction: 'Glasbol' },
			{ value: 'cardboard', label: 'Karton / papier', icon: '📦', nextQuestion: 'cardboard-state' },
			{ value: 'composite', label: 'Gemengd / drankkarton', icon: '🧃', fraction: 'PMD' },
		],
	},
	{
		id: 'cardboard-state',
		question: 'Is het karton propere en niet-vet?',
		options: [
			{ value: 'clean', label: 'Ja, proper en droog', icon: '✅', fraction: 'Papier-karton' },
			{ value: 'dirty', label: 'Nee, vet of bevuild', icon: '❌', fraction: 'Restafval' },
		],
	},
	{
		id: 'furniture-material',
		question: 'Van welk materiaal is het meubel?',
		options: [
			{ value: 'wood', label: 'Hout', icon: '🪵', fraction: 'Recyclagepark - hout' },
			{ value: 'metal', label: 'Metaal', icon: '🔩', fraction: 'Recyclagepark - metaal' },
			{
				value: 'hard-plastic',
				label: 'Hard plastic',
				icon: '🪑',
				fraction: 'Recyclagepark - harde plastics',
			},
			{
				value: 'mixed',
				label: 'Gemengd materiaal',
				icon: '🛋️',
				fraction: 'Recyclagepark / grofvuil',
			},
		],
	},
	{
		id: 'organic-type',
		question: 'Wat voor organisch afval is het?',
		options: [
			{ value: 'food', label: 'Etensresten / groente-fruit', icon: '🥦', fraction: 'GFT' },
			{
				value: 'garden',
				label: 'Gras, bladeren, snoeiafval',
				icon: '🍂',
				fraction: 'Tuinafval / GFT',
			},
			{
				value: 'branches',
				label: 'Dikke takken',
				icon: '🌳',
				fraction: 'Recyclagepark / tuinafval',
			},
		],
	},
	{
		id: 'textile-state',
		question: 'Is het textiel proper en droog?',
		options: [
			{ value: 'clean', label: 'Ja, proper en droog', icon: '✅', fraction: 'Textielcontainer' },
			{ value: 'dirty', label: 'Nee, vuil, nat of beschimmeld', icon: '❌', fraction: 'Restafval' },
		],
	},
]

const emit = defineEmits<{
	identified: [item: IdentifiedItem]
	submit: [payload: FallbackPayload]
}>()

const props = defineProps<{
	originalQuery: string
	postcode?: string
}>()

const currentMode = ref<'questions' | 'barcode' | 'ai-input'>('questions')
const currentQuestionId = ref('category')
const selectedAnswers = ref<Record<string, string>>({})
const treeResult = ref<{ fraction: string; item: string } | null>(null)

const extraDescription = ref('')
const barcode = ref('')
const uploadedImage = ref<File | null>(null)
const showScanner = ref(false)
const barcodeError = ref('')
const isLookingUpBarcode = ref(false)

const currentStep = computed(() => {
	if (currentMode.value === 'questions') return 1
	if (currentMode.value === 'barcode') return 2
	return 3
})

const activeQuestion = computed(() => {
	if (treeResult.value) return null
	return QUESTIONS.find((q) => q.id === currentQuestionId.value) ?? null
})

function answerQuestion(questionId: string, value: string, fraction?: string) {
	selectedAnswers.value[questionId] = value

	const question = QUESTIONS.find((q) => q.id === questionId)
	const option = question?.options.find((o) => o.value === value)

	if (!option) return

	if (option.fraction) {
		// Resolved — show result
		const label = option.label
		treeResult.value = { fraction: option.fraction, item: label }
	} else if (option.nextQuestion) {
		// Drill deeper
		currentQuestionId.value = option.nextQuestion
	}
}

function confirmTreeResult() {
	if (!treeResult.value) return
	emit('identified', {
		id: `tree-${Date.now()}`,
		title: treeResult.value.item,
		fraction: treeResult.value.fraction,
		score: 0,
		matchPercentage: 85,
		source: 'decision-tree',
	})
}

function goToBarcode() {
	currentMode.value = 'barcode'
}

function goToAiInput() {
	showScanner.value = false
	barcodeError.value = ''
	currentMode.value = 'ai-input'
}

function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	uploadedImage.value = input.files?.[0] ?? null
}

async function lookupBarcode(code = barcode.value) {
	const cleanCode = code.trim()
	if (!cleanCode) {
		barcodeError.value = 'Voer een barcode in.'
		return
	}

	try {
		barcodeError.value = ''
		isLookingUpBarcode.value = true

		const barcodeResult = await $fetch<{
			found: boolean
			item: {
				id: string
				title: string
				fraction: string
				matchPercentage: number
				source?: string
				brand?: string
			} | null
		}>('/api/barcode', {
			query: { barcode: cleanCode },
		})

		if (barcodeResult.found && barcodeResult.item) {
			emit('identified', { ...barcodeResult.item, score: 0 })
			return
		}

		barcodeError.value = 'Geen product gevonden voor deze barcode. Beschrijf het item hieronder.'
		// Auto-advance to AI input after failed barcode
		setTimeout(goToAiInput, 1200)
	} catch {
		barcodeError.value = 'Kon de productdatabase niet bereiken. Beschrijf het item hieronder.'
	} finally {
		isLookingUpBarcode.value = false
	}
}

async function handleBarcodeDetected(code: string) {
	barcode.value = code
	showScanner.value = false
	await lookupBarcode(code)
}

function submitFallback() {
	emit('submit', {
		originalQuery: props.originalQuery,
		extraDescription: extraDescription.value,
		barcode: barcode.value,
		uploadedImage: uploadedImage.value,
	})
}

function openContactForm() {
	window.open('https://www.betersorteren.be/sorteertwijfels', '_blank')
}

function resetTree() {
	currentMode.value = 'questions'
	currentQuestionId.value = 'category'
	selectedAnswers.value = {}
	treeResult.value = null
	extraDescription.value = ''
	barcode.value = ''
	uploadedImage.value = null
	showScanner.value = false
	barcodeError.value = ''
}
</script>
