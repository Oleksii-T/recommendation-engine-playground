<template>
  <div class="page">
    <div class="page-heading">
      <div>
        <h1>Simulations<span class="heading-dot">.</span></h1>
      </div>
      <div class="demo-control">
        <label class="sr-only" for="demo-scenario">Demo scenario</label
        ><select id="demo-scenario" v-model="scenario">
          <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.name }}</option></select
        ><button class="button" @click="loadDemo">Load demo <span>↗</span></button>
      </div>
    </div>
    <section class="panel player-panel">
      <div class="section-heading">
        <span class="section-number">01</span>
        <div>
          <h2>Player</h2>
        </div>
        <button class="button small" @click="creating = !creating">＋ Create player</button>
      </div>
      <div class="section-body">
        <form v-if="creating" class="inline-create" @submit.prevent="create">
          <label
            >Player name<input
              ref="nameInput"
              v-model="newName"
              placeholder="e.g. Alex · Slot explorer"
              maxlength="80"
              required /></label
          ><button class="button primary">Save player</button
          ><button class="text-button" type="button" @click="creating = false">Cancel</button>
        </form>
        <div v-if="error" class="alert error-alert" role="alert">{{ error }}</div>
        <template v-if="store.player"
          ><div class="player-control">
            <div class="avatar">{{ store.player.name.slice(0, 1).toUpperCase() }}</div>
            <label class="player-select"
              >Selected player<select
                v-model="store.settings.selectedPlayerId"
                @change="store.persist()"
              >
                <option v-for="p in store.players" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select></label
            >
            <div class="player-actions">
              <button class="text-button" @click="startRename">Rename</button
              ><button class="text-button" @click="resetPlayer">Reset player</button
              ><button class="text-button danger" @click="deletePlayer">Delete</button>
            </div>
          </div>
          <form v-if="renaming" class="inline-create" @submit.prevent="renamePlayer">
            <label>New player name<input v-model="rename" maxlength="80" required /></label
            ><button class="button">Save name</button>
          </form>
          <div class="player-stats">
            <div>
              <span>GAMES PLAYED</span
              ><strong
                >{{ summary.games }}<small> / {{ games.length }}</small></strong
              >
            </div>
            <div>
              <span>ROUNDS</span><strong>{{ summary.rounds.toLocaleString() }}</strong>
            </div>
            <div>
              <span>ACTIVE DAYS</span><strong>{{ summary.days }}</strong>
            </div>
            <div>
              <span>TOTAL BET</span><strong>{{ amount(summary.totalBet) }}</strong>
            </div>
            <div>
              <span>TOTAL WIN</span><strong>{{ amount(summary.totalWin) }}</strong>
            </div>
            <div>
              <span>LATEST ACTIVITY</span
              ><strong class="date-stat">{{
                summary.latest ? summary.latest.slice(0, 10) : 'No activity yet'
              }}</strong>
            </div>
          </div>
          <details class="favourites-panel">
            <summary>
              ☆ Favourite games
              <span class="muted">{{ store.player.favouriteGameIds.length }} selected</span>
            </summary>
            <div class="favourite-picker">
              <input
                v-model="favouriteSearch"
                aria-label="Search favourite games"
                placeholder="Search favourites…"
              />
              <div class="favourite-options">
                <label
                  v-for="g in games.filter((g) =>
                    g.name.toLowerCase().includes(favouriteSearch.toLowerCase()),
                  )"
                  :key="g.id"
                  ><input
                    v-model="store.player.favouriteGameIds"
                    type="checkbox"
                    :value="g.id"
                    @change="store.persist()"
                  />{{ g.name }}<span>{{ g.product }}</span></label
                >
              </div>
            </div>
          </details></template
        >
        <div v-else class="player-empty">
          <div class="empty-player-icon">♙</div>
          <div>
            <h3>No players yet</h3>
            <p>Create a synthetic player to start from scratch, or explore a demo scenario.</p>
          </div>
          <button class="text-button" @click="loadDemo">
            Try {{ scenarios.find((s) => s.id === scenario).name.toLowerCase() }} →
          </button>
        </div>
      </div>
    </section>
    <ActivitySection v-if="store.player" :key="store.player.id" :player="store.player" />
    <section v-else class="panel disabled-section">
      <div class="section-heading">
        <span class="section-number">02</span>
        <div>
          <h2>Activity history</h2>
          <p>Select a player to generate and inspect activity.</p>
        </div>
      </div>
    </section>
    <section class="panel run-panel">
      <div class="section-heading">
        <span class="section-number">03</span>
        <div>
          <h2>Run configuration</h2>
          <p>{{ store.engine.shortDescription }}</p>
        </div>
        <span class="pill">{{ store.engine.version }}</span>
      </div>
      <div class="section-body">
        <div class="form-grid run-form">
          <label
            >Simulated platform<select
              aria-label="Simulated platform"
              v-model="store.settings.platform"
              @change="store.persist()"
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select></label
          ><label
            >As-of date & time (UTC)<input
              :value="store.settings.asOf.slice(0, 16)"
              type="datetime-local"
              required
              @change="changeDate($event.target.value)" /></label
          ><label
            >Run seed<input
              v-model="store.settings.seed"
              maxlength="1000"
              required
              @change="store.persist()" /></label
          ><label
            >Compare with<select
              aria-label="Compare with"
              v-model="store.settings.compareEngine"
              @change="store.persist()"
            >
              <option value="">No comparison</option>
              <option
                v-for="e in engines.filter((e) => e.id !== store.engine.id)"
                :key="e.id"
                :value="e.id"
              >
                {{ e.label }}
              </option>
            </select></label
          >
        </div>
        <FormulaPanel />
        <p v-if="formulaError" class="error-text" role="alert">{{ formulaError }}</p>
        <p v-if="runError" class="error-text" role="alert">{{ runError }}</p>
        <div class="form-footer">
          <div class="run-engine-label">
            <span class="status-dot"></span
            ><span
              ><strong>{{ store.engine.label }}</strong></span
            >
          </div>
          <div class="button-group">
            <button
              v-if="
                store.settings.compareEngine && store.settings.compareEngine !== store.engine.id
              "
              class="button"
              :disabled="!canRun"
              @click="execute(true)"
            >
              Run and compare</button
            ><button class="button primary" :disabled="!canRun" @click="execute(false)">
              Run recommendation <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
    <div v-if="store.player?.recommendationRuns.length" class="saved-runs">
      <label
        >Saved run<select v-model="selectedRunId">
          <option
            v-for="r in [...store.player.recommendationRuns].reverse()"
            :key="r.id"
            :value="r.id"
          >
            {{ getEngine(r.engineId)?.label }} · {{ r.asOf.slice(0, 10) }} · #{{
              r.inputFingerprint.slice(0, 6)
            }}
            · {{ r.createdAt.slice(11, 19) }}
          </option>
        </select></label
      ><span>{{ store.player.recommendationRuns.length }} runs saved</span>
    </div>
    <ResultsPanel :run="selectedRun" :compare-run="compareRun" :stale="stale" />
  </div>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { usePlayground } from '../stores/playground.js'
import { games } from '../domain/games/mockGames.js'
import { engines, getEngine } from '../domain/engines/registry.js'
import { scenarios } from '../domain/scenarios/builtInScenarios.js'
import { activitySummary } from '../domain/simulation/dailyStats.js'
import { playerFingerprint } from '../domain/simulation/fingerprint.js'
import { validateConfig } from '../domain/engines/shared/config.js'
import ActivitySection from '../components/ActivitySection.vue'
import FormulaPanel from '../components/FormulaPanel.vue'
import ResultsPanel from '../components/ResultsPanel.vue'
const store = usePlayground(),
  scenario = ref('slots'),
  creating = ref(false),
  renaming = ref(false),
  newName = ref(''),
  rename = ref(''),
  error = ref(''),
  runError = ref(''),
  favouriteSearch = ref(''),
  nameInput = ref(null),
  selectedRunId = ref('')
const amount = (n) =>
  n.toLocaleString('en-ZA', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const summary = computed(() => (store.player ? activitySummary(store.player) : null))
const formulaError = computed(
  () =>
    store.formulaErrors[store.engine.id] ||
    validateConfig(store.engine.parameters, store.settings.configs[store.engine.id]),
)
const canRun = computed(() => !!store.player && !formulaError.value && !!store.settings.seed.trim())
const selectedRun = computed(
  () => store.player?.recommendationRuns.find((r) => r.id === selectedRunId.value) || null,
)
const compareRun = computed(() => {
  if (
    !selectedRun.value ||
    !store.settings.compareEngine ||
    store.settings.compareEngine === selectedRun.value.engineId
  )
    return null
  return (
    [...store.player.recommendationRuns]
      .reverse()
      .find(
        (r) =>
          r.engineId === store.settings.compareEngine &&
          r.inputFingerprint === selectedRun.value.inputFingerprint,
      ) || null
  )
})
const stale = computed(() =>
  selectedRun.value && store.player
    ? selectedRun.value.playerFingerprint !== playerFingerprint(store.player)
    : false,
)
watch(
  () => store.player?.id,
  () => {
    selectedRunId.value =
      [...(store.player?.recommendationRuns || [])]
        .reverse()
        .find((r) => r.engineId === store.engine.id)?.id ||
      store.player?.recommendationRuns.at(-1)?.id ||
      ''
    error.value = ''
    runError.value = ''
    renaming.value = false
  },
  { immediate: true },
)
watch(
  () => store.player?.recommendationRuns,
  (runs) => {
    if (!runs?.some((r) => r.id === selectedRunId.value))
      selectedRunId.value =
        [...(runs || [])].reverse().find((r) => r.engineId === store.engine.id)?.id ||
        runs?.at(-1)?.id ||
        ''
  },
)
watch(
  () => store.engine.id,
  (id) => {
    selectedRunId.value =
      [...(store.player?.recommendationRuns || [])].reverse().find((r) => r.engineId === id)?.id ||
      ''
    if (store.settings.compareEngine === id) store.settings.compareEngine = ''
    store.persist()
  },
)
watch(creating, async (value) => {
  if (value) {
    await nextTick()
    nameInput.value?.focus()
  }
})
function create() {
  try {
    store.createPlayer(newName.value)
    creating.value = false
    newName.value = ''
    error.value = ''
    store.notice = 'Synthetic player created.'
  } catch (e) {
    error.value = e.message
  }
}
function startRename() {
  renaming.value = !renaming.value
  rename.value = store.player.name
}
function renamePlayer() {
  try {
    store.renamePlayer(rename.value)
    renaming.value = false
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}
function deletePlayer() {
  if (window.confirm(`Delete ${store.player.name} and all of their local simulation history?`))
    store.deletePlayer()
}
function resetPlayer() {
  if (window.confirm('Reset this player’s activity, favourites, and saved recommendation runs?')) {
    store.resetPlayer()
    selectedRunId.value = ''
  }
}
function loadDemo() {
  store.loadScenario(scenario.value)
  creating.value = false
}
function changeDate(value) {
  try {
    const parsed = new Date(`${value}Z`).toISOString()
    store.settings.asOf = parsed
    store.persist()
    runError.value = ''
  } catch {
    runError.value = 'Enter a valid UTC as-of date.'
  }
}
function execute(compare) {
  try {
    const runs = store.run(compare)
    selectedRunId.value = runs[0].id
    runError.value = ''
  } catch (e) {
    runError.value = e.message
  }
}
</script>
