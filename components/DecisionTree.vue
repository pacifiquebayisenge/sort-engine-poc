<template>
	<section class="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
		<h2 class="text-lg font-bold">No results found</h2>

		<p class="mt-2 text-sm text-slate-600">
			We couldn't identify this item. Answer a few questions to help us find the correct sorting
			category.
		</p>

		<div v-if="!answers.isPackaging" class="mt-5">
			<h3 class="font-semibold">Is the item packaging?</h3>

			<div class="mt-4 grid gap-3 sm:grid-cols-3">
				<button class="choice-button" @click="selectPackaging('yes')">Yes</button>

				<button class="choice-button" @click="selectPackaging('no')">No</button>

				<button class="choice-button" @click="selectPackaging('unknown')">Not sure</button>
			</div>
		</div>

		<div v-else-if="answers.isPackaging === 'yes' && !answers.material" class="mt-5">
			<h3 class="font-semibold">What material is the packaging made of?</h3>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<button class="choice-button" @click="selectMaterial('plastic')">Plastic</button>

				<button class="choice-button" @click="selectMaterial('metal')">Metal</button>

				<button class="choice-button" @click="selectMaterial('glass')">Glass</button>

				<button class="choice-button" @click="selectMaterial('paper')">Paper / Cardboard</button>

				<button class="choice-button" @click="selectMaterial('mixed')">Mixed materials</button>

				<button class="choice-button" @click="selectMaterial('unknown')">Not sure</button>
			</div>
		</div>

		<div v-else-if="answers.isPackaging === 'no' && !answers.category" class="mt-5">
			<h3 class="font-semibold">What best describes the item?</h3>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<button class="choice-button" @click="selectCategory('food-waste')">Food waste</button>

				<button class="choice-button" @click="selectCategory('garden-waste')">Garden waste</button>

				<button class="choice-button" @click="selectCategory('electronics')">Electronics</button>

				<button class="choice-button" @click="selectCategory('battery')">Battery</button>

				<button class="choice-button" @click="selectCategory('textile')">Textile</button>

				<button class="choice-button" @click="selectCategory('wood')">Wood</button>

				<button class="choice-button" @click="selectCategory('hard-plastic')">Hard plastic</button>

				<button class="choice-button" @click="selectCategory('hazardous')">Hazardous waste</button>
			</div>
		</div>

		<div v-if="result" class="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
			<h3 class="font-bold text-green-800">Suggested sorting category</h3>

			<p class="mt-2 text-green-700">
				{{ result }}
			</p>
		</div>

		<div v-if="shouldAskForMoreInfo" class="mt-6 border-t border-slate-200 pt-5">
			<h3 class="font-semibold">Still not sure?</h3>

			<p class="mt-2 text-sm text-slate-600">
				Provide more information, a barcode or a photo to help identify the item.
			</p>

			<div class="mt-4 space-y-4">
				<input v-model="extraDescription" class="input" placeholder="Describe the item..." />

				<input v-model="barcode" class="input" placeholder="Scan or enter a barcode" />

				<input type="file" accept="image/*" class="input text-sm" @change="handleFileUpload" />
			</div>

			<button
				class="mt-5 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
				@click="submitFallback"
			>
				Help identify item
			</button>
		</div>

		<button
			v-if="answers.isPackaging || result"
			class="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800"
			@click="resetTree"
		>
			Start over
		</button>
	</section>
</template>

<script setup lang="ts">
/* 
TODO: 
in the future the decision tree should be data driven, 
so that we can easily add new questions and answers without having to change the code. 
For now, we will hardcode the questions and answers.
*/

const emit = defineEmits<{
	submit: [
		{
			originalQuery: string
			answers: {
				isPackaging: string
				material: string
				category: string
			}
			extraDescription: string
			barcode: string
			uploadedImage: File | null
		},
	]
}>()

const props = defineProps<{
	originalQuery: string
}>()

const answers = reactive({
	isPackaging: '',
	material: '',
	category: '',
})

const result = ref('')
const extraDescription = ref('')
const barcode = ref('')
const uploadedImage = ref<File | null>(null)

const shouldAskForMoreInfo = computed(() => {
	return answers.isPackaging === 'unknown' || answers.material === 'unknown'
})

function selectPackaging(answer: string) {
	answers.isPackaging = answer

	if (answer === 'unknown') {
		result.value = ''
	}
}

function selectMaterial(material: string) {
	answers.material = material

	const materialToFraction: Record<string, string> = {
		plastic: 'PMD',
		metal: 'PMD',
		glass: 'Glass container',
		paper: 'Paper / Cardboard',
		mixed: 'PMD or Recycling Park depending on the item',
		unknown: '',
	}

	result.value = materialToFraction[material] || ''
}

function selectCategory(category: string) {
	answers.category = category

	const categoryToFraction: Record<string, string> = {
		'food-waste': 'Organic waste / GFT',
		'garden-waste': 'Garden waste',
		electronics: 'Recupel / Recycling Park',
		battery: 'Bebat collection point',
		textile: 'Textile container',
		wood: 'Recycling Park - Wood',
		'hard-plastic': 'Recycling Park - Hard plastics',
		hazardous: 'Hazardous waste / KGA',
	}

	result.value = categoryToFraction[category] || ''
}

function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	uploadedImage.value = input.files?.[0] ?? null
}

function submitFallback() {
	emit('submit', {
		originalQuery: props.originalQuery,
		answers,
		extraDescription: extraDescription.value,
		barcode: barcode.value,
		uploadedImage: uploadedImage.value,
	})
}

function resetTree() {
	answers.isPackaging = ''
	answers.material = ''
	answers.category = ''
	result.value = ''
	extraDescription.value = ''
	barcode.value = ''
	uploadedImage.value = null
}
</script>

<style lang="scss" scoped>
.choice-button {
	padding-top: 0.75rem;
	padding-bottom: 0.75rem;
	padding-left: 1rem;
	padding-right: 1rem;
	border-radius: 0.75rem;
	border-width: 1px;
	font-weight: 500;
	text-align: left;
	transition-property:
		background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	transition-duration: 300ms;

	&:hover {
		border-color: #059669;
	}
}

.input {
	padding-top: 0.75rem;
	padding-bottom: 0.75rem;
	padding-left: 1rem;
	padding-right: 1rem;
	border-radius: 0.75rem;
	border-width: 1px;
	outline-style: none;
	width: 100%;
	transition-property:
		background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
	transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	transition-duration: 300ms;

	&:focus {
		border-color: #059669;
		box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.25);
	}
}
</style>
