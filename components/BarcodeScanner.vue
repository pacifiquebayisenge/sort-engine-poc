<template>
	<div class="space-y-3">
		<div class="relative overflow-hidden rounded-xl bg-slate-900">
			<video ref="videoRef" class="aspect-[4/3] w-full object-cover" muted playsinline />

			<div v-if="!isScanning" class="absolute inset-0 flex items-center justify-center">
				<button
					type="button"
					class="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
					@click="startScan"
				>
					Camera starten
				</button>
			</div>

			<!-- Scan frame overlay -->
			<div
				v-if="isScanning"
				class="pointer-events-none absolute inset-10 rounded-lg border-[3px] border-green-400/70"
			/>

			<!-- Corner decorations -->
			<template v-if="isScanning">
				<div
					class="pointer-events-none absolute left-10 top-10 h-6 w-6 rounded-tl-md border-l-4 border-t-4 border-green-400"
				/>
				<div
					class="pointer-events-none absolute right-10 top-10 h-6 w-6 rounded-tr-md border-r-4 border-t-4 border-green-400"
				/>
				<div
					class="pointer-events-none absolute bottom-10 left-10 h-6 w-6 rounded-bl-md border-b-4 border-l-4 border-green-400"
				/>
				<div
					class="pointer-events-none absolute bottom-10 right-10 h-6 w-6 rounded-br-md border-b-4 border-r-4 border-green-400"
				/>
			</template>
		</div>

		<div v-if="isScanning" class="flex items-center justify-between">
			<p class="text-sm text-slate-500">Richt de camera op de barcode...</p>
			<button
				type="button"
				class="text-sm font-semibold text-slate-500 hover:text-slate-800"
				@click="stopScan"
			>
				Annuleren
			</button>
		</div>

		<p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
	</div>
</template>

<script setup lang="ts">
import type { IScannerControls } from '@zxing/browser'

const emit = defineEmits<{
	detected: [code: string]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const isScanning = ref(false)
const errorMessage = ref('')

let controls: IScannerControls | null = null

async function startScan() {
	if (!videoRef.value) return
	errorMessage.value = ''

	try {
		// Dynamically imported so the decoder is only bundled when the scanner opens
		const { BrowserMultiFormatReader } = await import('@zxing/browser')
		const reader = new BrowserMultiFormatReader()

		controls = await reader.decodeFromConstraints(
			{ video: { facingMode: 'environment' } },
			videoRef.value,
			(result) => {
				if (result) {
					emit('detected', result.getText())
					stopScan()
				}
				// NotFoundException fires every frame without a barcode — expected, not an error
			}
		)

		isScanning.value = true
	} catch {
		errorMessage.value =
			'Camera kon niet geactiveerd worden. Controleer je toestemming en probeer opnieuw.'
		isScanning.value = false
	}
}

function stopScan() {
	controls?.stop()
	controls = null
	isScanning.value = false
}

onUnmounted(() => {
	stopScan()
})
</script>
