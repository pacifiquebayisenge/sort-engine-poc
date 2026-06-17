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
					Start camera
				</button>
			</div>

			<div
				v-if="isScanning"
				class="pointer-events-none absolute inset-10 rounded-lg border-[3px] border-green-400/70"
			/>
		</div>

		<div v-if="isScanning" class="flex items-center justify-between">
			<p class="text-sm text-slate-500">Point the camera at the barcode...</p>

			<button
				type="button"
				class="text-sm font-semibold text-slate-500 hover:text-slate-800"
				@click="stopScan"
			>
				Cancel
			</button>
		</div>

		<p v-if="errorMessage" class="text-sm text-red-600">
			{{ errorMessage }}
		</p>
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
		// Loaded dynamically so the decoder (and its format tables) is only
		// pulled into the bundle once someone actually opens the scanner,
		// instead of adding weight to every page load.
		const { BrowserMultiFormatReader } = await import('@zxing/browser')
		const reader = new BrowserMultiFormatReader()

		// decodeFromConstraints returns a controls object — that's what we
		// use to stop scanning later. The reader instance itself has no
		// stop/reset method in the current @zxing/browser API.
		controls = await reader.decodeFromConstraints(
			{ video: { facingMode: 'environment' } },
			videoRef.value,
			(result) => {
				if (result) {
					emit('detected', result.getText())
					stopScan()
				}

				// The callback also fires with a NotFoundException on every
				// frame where no barcode is visible yet — that's expected,
				// not an error, so we don't surface it.
			}
		)

		isScanning.value = true
	} catch {
		errorMessage.value = 'Could not access the camera. Check permissions and try again.'
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
