<template>
  <section class="panel player-panel">
    <div class="section-heading">
      <div><h2>General info</h2></div>
      <div class="player-actions">
        <button class="text-button" @click="startRename">Rename</button
        ><button class="text-button" @click="resetPlayer">Reset player</button
        ><button class="text-button danger" @click="deletePlayer">Delete</button>
      </div>
    </div>
    <div class="section-body">
      <dl class="player-metadata">
        <div>
          <dt>Name</dt>
          <dd>{{ player.name }}</dd>
        </div>
        <div>
          <dt>Created (UTC)</dt>
          <dd>{{ player.createdAt.slice(0, 19).replace('T', ' ') }}</dd>
        </div>
      </dl>
      <form v-if="renaming" class="inline-create" @submit.prevent="renamePlayer">
        <label>New player name<input v-model="rename" maxlength="80" required /></label
        ><button class="button">Save name</button
        ><button type="button" class="text-button" @click="renaming = false">Cancel</button>
      </form>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
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
          <span class="muted">{{ player.favouriteGameIds.length }} selected</span>
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
                :checked="player.favouriteGameIds.includes(g.id)"
                type="checkbox"
                :value="g.id"
                @change="store.setFavourite(g.id, $event.target.checked)"
              />{{ g.name }}<span>{{ g.product }}</span></label
            >
          </div>
        </div>
      </details>
    </div>
  </section>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayground } from '../stores/playground.js'
import { games } from '../domain/games/mockGames.js'
import { activitySummary } from '../domain/simulation/dailyStats.js'
const props = defineProps({ player: Object })
const store = usePlayground(),
  router = useRouter(),
  renaming = ref(false),
  rename = ref(''),
  error = ref(''),
  favouriteSearch = ref('')
const summary = computed(() => activitySummary(props.player)),
  amount = (n) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function startRename() {
  rename.value = props.player.name
  renaming.value = !renaming.value
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
  if (window.confirm(`Delete ${props.player.name} and all of their local simulation history?`)) {
    store.deletePlayer()
    router.push('/players')
  }
}
function resetPlayer() {
  if (window.confirm('Reset this player’s activity, favourites, and saved recommendation runs?'))
    store.resetPlayer()
}
</script>
