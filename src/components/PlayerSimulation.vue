<template>
  <div class="simulation-navigation">
    <button
      id="new-simulation-button"
      class="button"
      :aria-pressed="active === 'new'"
      aria-controls="run-panel"
      @click="selectRun('new')"
    >
      ＋ New simulation
    </button>
    <TabBar
      v-if="tabs.length"
      :tabs="tabs"
      :active="active"
      label="Simulation runs"
      prefix="run"
      secondary
      @select="selectRun"
      @delete="deleteSimulation"
    />
  </div>
  <div
    id="run-panel"
    role="tabpanel"
    :aria-labelledby="active === 'new' ? 'new-simulation-button' : `run-tab-${active}`"
    tabindex="0"
    class="run-tab-panel"
  >
    <RunConfiguration v-if="active === 'new'" @run="created" />
    <template v-else-if="run"
      ><div class="run-selection">
        <button class="button danger" @click="deleteSimulation(run.id)">Delete simulation</button>
        <label
          >Compare with<select
            aria-label="Compare with"
            :value="comparison?.id || ''"
            @change="selectComparison($event.target.value)"
          >
            <option value="">No comparison</option>
            <option v-for="candidate in comparisons" :key="candidate.id" :value="candidate.id">
              {{ runLabel(candidate) }}
            </option>
          </select></label
        >
      </div>
      <ResultsPanel :run="run" :compare-run="comparison" :stale="stale"
    /></template>
  </div>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayground } from '../stores/playground.js'
import { getEngine } from '../domain/engines/registry.js'
import { playerFingerprint } from '../domain/simulation/fingerprint.js'
import TabBar from './TabBar.vue'
import RunConfiguration from './RunConfiguration.vue'
import ResultsPanel from './ResultsPanel.vue'
const props = defineProps({ player: Object }),
  store = usePlayground(),
  route = useRoute(),
  router = useRouter()
const runs = computed(() => props.player.recommendationRuns)
const active = computed(() =>
  route.query.run === 'new'
    ? 'new'
    : runs.value.some((r) => r.id === route.query.run)
    ? route.query.run
    : runs.value.at(-1)?.id || 'new',
)
const run = computed(() => runs.value.find((r) => r.id === active.value) || null)
const runLabel = (r) =>
  `Run ${r.sequence || runs.value.findIndex((candidate) => candidate.id === r.id) + 1} · ${
    getEngine(r.engineId).label.split(' · ')[0]
  }`
const tabs = computed(() =>
  [...runs.value].reverse().map((r) => ({ id: r.id, label: runLabel(r), deletable: true })),
)
const comparisons = computed(() =>
  run.value
    ? runs.value.filter(
        (r) => r.id !== run.value.id && r.inputFingerprint === run.value.inputFingerprint,
      )
    : [],
)
const comparison = computed(() => {
  if (route.query.compare === 'none') return null
  if (route.query.compare)
    return comparisons.value.find((r) => r.id === route.query.compare) || null
  return (
    [...comparisons.value]
      .reverse()
      .find(
        (r) => r.engineId === store.settings.compareEngine && r.engineId !== run.value?.engineId,
      ) || null
  )
})
const stale = computed(() =>
  run.value ? run.value.playerFingerprint !== playerFingerprint(props.player) : false,
)
function selectRun(id) {
  router.push({ query: { run: id } })
}
function selectComparison(id) {
  router.replace({ query: { run: active.value, compare: id || 'none' } })
}
function created(results) {
  router.push({ query: { run: results[0].id, ...(results[1] ? { compare: results[1].id } : {}) } })
}
async function deleteSimulation(id) {
  const target = runs.value.find((r) => r.id === id)
  if (!target || !window.confirm(`Delete simulation ${runLabel(target)}?`)) return
  const index = tabs.value.findIndex((tab) => tab.id === id)
  const remaining = tabs.value.filter((tab) => tab.id !== id)
  const selected =
    active.value === id
      ? remaining[Math.min(index, remaining.length - 1)]?.id || 'new'
      : active.value
  const query = { ...route.query, run: selected }
  if (query.compare === id || active.value === id) query.compare = 'none'
  store.deleteRun(id)
  await router.replace({ query })
  await nextTick()
  document
    .getElementById(selected === 'new' ? 'new-simulation-button' : `run-tab-${selected}`)
    ?.focus()
}
</script>
