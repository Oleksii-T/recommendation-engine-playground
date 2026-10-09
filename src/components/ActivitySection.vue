<template>
  <details class="panel workflow-section" :open="!player.bets.length">
    <summary class="section-heading">
      <span class="section-number">02</span>
      <div>
        <h2>Activity history</h2>
        <p v-if="player.generationBatches.length">
          {{ player.generationBatches.length }} batches ·
          {{ player.bets.length.toLocaleString() }} synthetic rounds
        </p>
      </div>
      <span class="disclosure-arrow">⌄</span>
    </summary>
    <div class="section-body">
      <div class="section-toolbar">
        <h3>Generate a batch</h3>
      </div>
      <form @submit.prevent="previewBatch">
        <div class="form-grid activity-form">
          <label class="span-2"
            >Game<select aria-label="Game" v-model="form.gameId" required>
              <option v-for="g in games" :key="g.id" :value="g.id">
                {{ g.name }} · {{ g.product
                }}{{ g.enabled && g.status === 'active' ? '' : ' (disabled)' }}
              </option>
            </select></label
          ><label class="span-2"
            >Start date & time (UTC)<input
              v-model="form.dateTime"
              type="datetime-local"
              required
              :max="store.settings.asOf.slice(0, 16)" /></label
          ><label
            >Rounds<input
              v-model.number="form.rounds"
              type="number"
              min="1"
              max="1000"
              required /></label
          ><label
            >Sessions<input
              v-model.number="form.sessions"
              type="number"
              min="1"
              :max="Math.min(50, form.rounds)"
              required /></label
          ><label
            >Base bet<input
              v-model.number="form.baseAmount"
              type="number"
              min="0.01"
              max="100000000"
              step="0.01"
              required /></label
          ><label
            >Randomness (%)<input
              v-model.number="form.randomness"
              type="number"
              min="0"
              max="100"
              required /></label
          ><label class="span-2"
            >Play type<select aria-label="Play type" v-model="form.playType">
              <option value="paid">Organic / paid</option>
              <option value="bonus">Bonus-funded</option>
              <option value="free">Free rounds</option>
            </select></label
          ><label class="span-2">Random seed<input v-model="form.seed" required /></label>
        </div>
        <div class="form-footer">
          <p class="footnote">
            Illustrative outcomes with an expected return below 100%.<br />Wins and losses do not
            teach the engine player preferences.
          </p>
          <button class="button" type="submit">Preview batch <span>→</span></button>
        </div>
      </form>
      <div v-if="error" class="alert error-alert" role="alert">{{ error }}</div>
      <div v-if="preview" class="batch-preview">
        <div class="section-toolbar">
          <h3>Batch preview</h3>
        </div>
        <div class="preview-stats">
          <div>
            <small>ROUNDS / SESSIONS</small
            ><strong>{{ preview.summary.rounds }} / {{ preview.summary.sessions }}</strong>
          </div>
          <div>
            <small>BET RANGE</small
            ><strong
              >{{ amount(preview.summary.minimum) }}–{{ amount(preview.summary.maximum) }}</strong
            >
          </div>
          <div>
            <small>TOTAL BET</small><strong>{{ amount(preview.summary.totalBet) }}</strong>
          </div>
          <div>
            <small>TOTAL WIN</small><strong>{{ amount(preview.summary.totalWin) }}</strong>
          </div>
          <div>
            <small>NET OUTCOME</small><strong>{{ amount(preview.summary.net) }}</strong>
          </div>
        </div>
        <p class="footnote">
          {{ timestamp(preview.summary.earliest) }} → {{ timestamp(preview.summary.latest) }} UTC
        </p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Session</th>
                <th>Time (UTC)</th>
                <th>Bet</th>
                <th>Win</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, i) in preview.bets.slice(0, 5)" :key="b.id">
                <td>{{ i + 1 }}</td>
                <td>{{ b.token.split('-').pop() }}</td>
                <td>{{ b.createdAt.slice(11, 19) }}</td>
                <td>{{ amount(b.amount) }}</td>
                <td>{{ amount(preview.wins[i].amount) }}</td>
                <td>{{ preview.wins[i].outcomeBucket }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="form-footer">
          <span class="footnote"
            >Showing the first {{ Math.min(5, preview.bets.length) }} generated rounds.</span
          ><button class="button primary" @click="addBatch">
            Confirm & add activity <span>✓</span>
          </button>
        </div>
      </div>
      <div v-if="player.generationBatches.length" class="batch-history">
        <div class="section-toolbar">
          <h3>Saved batches</h3>
          <span class="muted small-text">Most recent first</span>
        </div>
        <div v-for="b in [...player.generationBatches].reverse()" :key="b.id" class="batch-row">
          <div>
            <strong>{{ gameById(b.gameId)?.name }}</strong
            ><span
              >{{ b.config.dateTime.slice(0, 10) }} · {{ b.betIds.length }} rounds ·
              {{ b.config.sessions }} sessions · {{ playLabel[b.config.playType] }}</span
            >
          </div>
          <button class="text-button" @click="inspect(b)">Inspect rounds ↗</button
          ><button
            class="icon-button"
            :aria-label="`Delete batch ${gameById(b.gameId)?.name} ${b.config.dateTime.slice(
              0,
              10,
            )}`"
            @click="deleteBatch(b)"
          >
            ✕
          </button>
        </div>
      </div>
      <details class="technical-note">
        <summary>How are outcomes generated?</summary>
        <p>
          60% losing (0–0.8×), 25% near break-even (0.8–1.2×), 13% moderate wins (1.2–3×), and 2%
          large wins (3–10×). These synthetic outcomes illustrate varied history, not a real game’s
          RTP.
        </p>
      </details>
    </div>
  </details>
  <SideDrawer v-if="batch" :title="`${gameById(batch.gameId)?.name} activity`" @close="closeBatch">
    <p class="muted">
      {{ batch.betIds.length }} rounds · Inspect or correct individual outcomes. Changes mark saved
      runs as older player states.
    </p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Time (UTC)</th>
            <th>Bet</th>
            <th>Win</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in batchBets" :key="b.id">
            <td>{{ i + 1 }}</td>
            <td>{{ timestamp(b.createdAt) }}</td>
            <td>{{ amount(b.amount) }}</td>
            <td>{{ amount(winFor(b.id)?.amount) }}</td>
            <td>
              {{
                b.rolledBack
                  ? 'Rolled back'
                  : b.isFree
                  ? 'Free'
                  : b.isBonusBalanceUsed
                  ? 'Bonus'
                  : 'Paid'
              }}
            </td>
            <td>
              <button class="text-button" :aria-label="`Edit round ${i + 1}`" @click="startEdit(b)">
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <form v-if="edit" class="round-edit" @submit.prevent="saveEdit">
      <h3>Edit round</h3>
      <div class="form-grid">
        <label
          >Bet amount<input
            v-model.number="edit.amount"
            type="number"
            min="0"
            step="0.01"
            required /></label
        ><label
          >Win amount<input
            v-model.number="edit.winAmount"
            type="number"
            min="0"
            step="0.01"
            required /></label
        ><label class="span-2"
          >Timestamp (UTC)<input
            v-model="edit.dateTime"
            type="datetime-local"
            step="1"
            required /></label
        ><label
          >Play type<select v-model="edit.playType">
            <option value="paid">Organic / paid</option>
            <option value="bonus">Bonus-funded</option>
            <option value="free">Free rounds</option>
          </select></label
        ><label class="check-label"
          ><input v-model="edit.rolledBack" type="checkbox" /> Rolled back</label
        >
      </div>
      <p v-if="editError" class="error-text" role="alert">{{ editError }}</p>
      <div class="form-footer">
        <button class="text-button" type="button" @click="edit = null">Cancel</button
        ><button class="button primary">Save correction</button>
      </div>
    </form>
  </SideDrawer>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed, reactive, ref, watch } from 'vue'
import { usePlayground } from '../stores/playground.js'
import { games, gameById } from '../domain/games/mockGames.js'
import { generateActivity } from '../domain/simulation/activityGenerator.js'
import SideDrawer from './SideDrawer.vue'
const props = defineProps({ player: Object })
const store = usePlayground(),
  error = ref(''),
  preview = ref(null),
  batch = ref(null),
  edit = ref(null),
  editError = ref('')
const form = reactive({
  gameId: 'g01',
  dateTime: store.settings.asOf.slice(0, 10) + 'T12:00',
  rounds: 50,
  sessions: 2,
  baseAmount: 100,
  randomness: 20,
  playType: 'paid',
  seed: 'activity-42',
})
const amount = (n) =>
    Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  timestamp = (d) => d.slice(0, 19).replace('T', ' ')
const playLabel = { paid: 'Organic', bonus: 'Bonus-funded', free: 'Free rounds' }
watch(form, () => {
  preview.value = null
  error.value = ''
})
watch(
  () => store.settings.asOf,
  () => {
    preview.value = null
  },
)
watch(
  () => props.player.id,
  () => {
    preview.value = null
    batch.value = null
    edit.value = null
  },
)
function previewBatch() {
  error.value = ''
  try {
    const { gameId, ...config } = form
    config.dateTime = new Date(`${config.dateTime}Z`).toISOString()
    preview.value = generateActivity({
      playerId: props.player.id,
      game: gameById(gameId),
      config,
      asOf: store.settings.asOf,
    })
  } catch (e) {
    preview.value = null
    error.value = e.message
  }
}
function addBatch() {
  try {
    store.addBatch(preview.value)
    preview.value = null
  } catch (e) {
    error.value = e.message
  }
}
function deleteBatch(b) {
  if (
    window.confirm(
      'Delete this batch and all of its rounds? Saved results will be marked as based on an older player state.',
    )
  )
    store.deleteBatch(b.id)
}
function closeBatch() {
  batch.value = null
  edit.value = null
}
function inspect(b) {
  batch.value = b
  edit.value = null
}
const batchBets = computed(() =>
  batch.value ? props.player.bets.filter((b) => batch.value.betIds.includes(b.id)) : [],
)
const winFor = (id) => props.player.wins.find((w) => w.betId === id)
function startEdit(b) {
  editError.value = ''
  edit.value = {
    id: b.id,
    amount: b.amount,
    winAmount: winFor(b.id)?.amount || 0,
    dateTime: b.createdAt.slice(0, 19),
    playType: b.isFree ? 'free' : b.isBonusBalanceUsed ? 'bonus' : 'paid',
    rolledBack: b.rolledBack,
  }
}
function saveEdit() {
  try {
    store.correctRound(edit.value.id, {
      ...edit.value,
      createdAt: new Date(`${edit.value.dateTime}Z`).toISOString(),
    })
    edit.value = null
    store.notice = 'Round correction saved.'
  } catch (e) {
    editError.value = e.message
  }
}
</script>
