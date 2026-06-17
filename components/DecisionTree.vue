<template>
	<section class="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
		<h2 class="text-lg font-bold">No results found</h2>

		<p class="mt-2 text-sm text-slate-600">
			We couldn't identify this item. Let's try a few extra steps to find the correct sorting
			category.
		</p>

		<div v-if="currentMode === 'barcode'" class="mt-6">
			<h3 class="font-semibold">Does the item have a barcode?</h3>

			<p class="mt-2 text-sm text-slate-600">
				If the item has a barcode, scan it or enter it manually. This is usually the most accurate
				way to identify packaged products.
			</p>

			<div class="mt-4 space-y-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						v-model="barcode"
						class="flex-1 rounded-xl border border-slate-300 px-4 py-3"
						placeholder="Scan or enter a barcode"
						@keyup.enter="lookupBarcode()"
					/>

					<button
						type="button"
						class="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
						@click="lookupBarcode()"
					>
						Search
					</button>

					<button
						type="button"
						class="rounded-xl border border-green-700 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-50"
						@click="showScanner = !showScanner"
					>
						{{ showScanner ? 'Close scanner' : 'Scan barcode' }}
					</button>
				</div>

				<p v-if="barcodeError" class="text-sm text-red-600">
					{{ barcodeError }}
				</p>

				<p v-if="isLookingUpBarcode" class="text-sm text-green-700">Looking up barcode...</p>

				<ClientOnly>
					<BarcodeScanner v-if="showScanner" @detected="handleBarcodeDetected" />
				</ClientOnly>
			</div>

			<button
				type="button"
				class="mt-5 text-sm font-semibold text-slate-500 underline hover:text-slate-800"
				@click="goToAiInput"
			>
				The item has no barcode
			</button>
		</div>

		<div v-else-if="currentMode === 'ai-input'" class="mt-6">
			<h3 class="font-semibold">Describe the item</h3>

			<p class="mt-2 text-sm text-slate-600">
				Add a short description and optionally upload or take a picture. In a future version, this
				information can be analyzed by AI.
			</p>

			<div class="mt-4 space-y-4">
				<textarea
					v-model="extraDescription"
					class="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
					placeholder="Example: red aluminium Coca-Cola can, broken ceramic plate, old computer monitor..."
				/>

				<input
					type="file"
					accept="image/*"
					capture="environment"
					class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
					@change="handleFileUpload"
				/>

				<p v-if="uploadedImage" class="text-sm text-slate-500">
					Selected image: <strong>{{ uploadedImage.name }}</strong>
				</p>
			</div>

			<div class="mt-5 flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					class="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
					@click="submitFallback"
				>
					Analyze item
				</button>

				<button
					type="button"
					class="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
					@click="currentMode = 'barcode'"
				>
					Back to barcode
				</button>
			</div>
		</div>

		<button
			class="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-800"
			@click="resetTree"
		>
			Start over
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

const emit = defineEmits<{
	identified: [item: IdentifiedItem]
	submit: [payload: FallbackPayload]
}>()

const props = defineProps<{
	originalQuery: string
}>()

const currentMode = ref<'barcode' | 'ai-input'>('barcode')

const extraDescription = ref('')
const barcode = ref('')
const uploadedImage = ref<File | null>(null)
const showScanner = ref(false)

const barcodeError = ref('')
const isLookingUpBarcode = ref(false)

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
		barcodeError.value = 'Please enter a barcode.'
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
			query: {
				barcode: cleanCode,
			},
		})

		if (barcodeResult.found && barcodeResult.item) {
			emit('identified', {
				...barcodeResult.item,
				score: 0,
			})

			return
		}

		barcodeError.value = 'No product found for this barcode. You can describe the item instead.'
	} catch {
		barcodeError.value = 'Could not reach the product database. You can describe the item instead.'
	} finally {
		isLookingUpBarcode.value = false
	}
}

async function handleBarcodeDetected(code: string) {
	console.log('BARCODE DETECTED:', code)

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

function resetTree() {
	currentMode.value = 'barcode'
	extraDescription.value = ''
	barcode.value = ''
	uploadedImage.value = null
	showScanner.value = false
	barcodeError.value = ''
}
</script>
