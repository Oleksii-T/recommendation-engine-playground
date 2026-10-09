<template>
  <div class="page">
    <div class="page-heading">
      <h1>Players</h1>
      <div class="button-group">
        <button class="text-button" @click="showDemos = true">Load demo</button
        ><button class="button primary" @click="showCreate = true">＋ Add Player</button>
      </div>
    </div>
    <section class="panel players-panel" aria-label="Players">
      <div class="table-scroll">
        <table class="players-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Bets</th>
              <th>Wins</th>
              <th>Last simulation run</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.player.id" @click="openPlayer(row.player.id)">
              <td>
                <RouterLink
                  :to="playerLocation(row.player.id)"
                  class="player-table-link"
                  @click.stop
                  ><span class="avatar">{{ row.player.name[0].toUpperCase() }}</span
                  ><strong>{{ row.player.name }}</strong></RouterLink
                >
              </td>
              <td class="numeric">
                <strong>{{ amount(row.summary.totalBet) }}</strong
                ><small>{{ row.summary.rounds.toLocaleString() }} bets</small>
              </td>
              <td class="numeric">
                <strong>{{ amount(row.summary.totalWin) }}</strong
                ><small>{{ row.wins.toLocaleString() }} win outcomes</small>
              </td>
              <td>
                <template v-if="row.lastRun"
                  ><time :datetime="row.lastRun.createdAt"
                    >{{ formatDate(row.lastRun.createdAt) }} UTC</time
                  ><small>{{ getEngine(row.lastRun.engineId).label }}</small></template
                ><span v-else class="muted">Not run yet</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!rows.length" class="empty-inline">
        <h2>No players yet</h2>
        <p>Click Add Player to create a player.</p>
      </div>
    </section>
    <ModalDialog v-if="showCreate" title="Add Player" @close="showCreate = false"
      ><form @submit.prevent="create">
        <label>Player name<input v-model="name" autofocus maxlength="80" required /></label>
        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
        <div class="form-footer">
          <button class="text-button" type="button" @click="showCreate = false">Cancel</button
          ><button class="button primary" :disabled="!name.trim()">Add Player</button>
        </div>
      </form></ModalDialog
    >
    <ModalDialog v-if="showDemos" title="Load demo" @close="showDemos = false"
      ><div class="scenario-list">
        <button
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="scenario-option"
          @click="loadDemo(scenario.id)"
        >
          <strong>{{ scenario.name }}</strong
          ><span>{{ scenario.description }}</span>
        </button>
      </div></ModalDialog
    >
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayground } from '../stores/playground.js'
import { activitySummary } from '../domain/simulation/dailyStats.js'
import { getEngine } from '../domain/engines/registry.js'
import { scenarios } from '../domain/scenarios/builtInScenarios.js'
import ModalDialog from '../components/ModalDialog.vue'
const store = usePlayground(),
  router = useRouter(),
  showCreate = ref(false),
  showDemos = ref(false),
  name = ref(''),
  error = ref('')
const rows = computed(() =>
  store.players.map((player) => {
    const summary = activitySummary(player)
    const validBetIds = new Set(player.bets.filter((b) => !b.rolledBack).map((b) => b.id))
    return {
      player,
      summary,
      wins: player.wins.filter((w) => validBetIds.has(w.betId)).length,
      lastRun: player.recommendationRuns.at(-1),
    }
  }),
)
const amount = (n) =>
    n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  formatDate = (value) => value.slice(0, 19).replace('T', ' ')
const playerLocation = (playerId) => ({ name: 'player', params: { playerId, tab: 'general' } })
function openPlayer(id) {
  router.push(playerLocation(id))
}
watch(showCreate, () => {
  name.value = ''
  error.value = ''
})
function create() {
  try {
    const player = store.createPlayer(name.value)
    showCreate.value = false
    store.notice = 'Player created.'
    openPlayer(player.id)
  } catch (e) {
    error.value = e.message
  }
}
function loadDemo(id) {
  store.loadScenario(id)
  showDemos.value = false
  openPlayer(store.settings.selectedPlayerId)
}
</script>
