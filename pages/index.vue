<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <section class="mx-auto max-w-3xl">
      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-green-700">
          Sort Engine PoC
        </p>
        <h1 class="mt-2 text-3xl font-bold sm:text-5xl">
          Smarter waste search
        </h1>
        <p class="mt-4 text-slate-600">
          Test fuzzy search with synonyms, keywords and match percentages.
        </p>
      </div>

      <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <label class="mb-2 block text-sm font-medium text-slate-700">
          Search waste item
        </label>

        <input
          v-model="query"
          class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
          placeholder="Try: cola blik, fanta, yoghurtpotje, bord..."
        >

        <p v-if="query" class="mt-3 text-sm text-slate-500">
          Searching for: <strong>{{ query }}</strong>
        </p>
      </div>

      <div class="mt-6 space-y-4">
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
                <span class="font-semibold text-green-700">{{ item.fraction }}</span>
              </p>
            </div>

            <div class="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
              {{ item.matchPercentage }}% match
            </div>
          </div>
        </article>

        <p
          v-if="query && results.length === 0"
          class="rounded-2xl bg-white p-5 text-slate-500 shadow-sm ring-1 ring-slate-200"
        >
          No results found.
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
type SearchResult = {
  id: string
  title: string
  fraction: string
  score: number
  matchPercentage: number
}

const query = ref('')
const results = ref<SearchResult[]>([])

watch(query, async (value) => {
  if (!value.trim()) {
    results.value = []
    return
  }

  results.value = await $fetch<SearchResult[]>('/api/search', {
    query: { q: value },
  })
})
</script>