<template>
  <ActivitySection ref="activity" :player="player" />
  <section class="panel rounds-panel" aria-label="Bets and wins history">
    <div class="section-heading">
      <div><h2>Bets and Wins</h2></div>
      <span class="muted small-text">{{ player.bets.length.toLocaleString() }} rounds</span>
    </div>
    <div class="table-scroll">
      <table class="rounds-table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Time (UTC)</th>
            <th>Bet</th>
            <th>Win</th>
            <th>Play type</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bet in visible" :key="bet.id">
            <td>{{ gameById(bet.gameId).name }}</td>
            <td>{{ bet.createdAt.slice(0, 19).replace('T', ' ') }}</td>
            <td class="numeric">{{ amount(bet.amount) }}</td>
            <td class="numeric">{{ amount(wins[bet.id]?.amount || 0) }}</td>
            <td>
              {{ bet.isFree ? 'Free' : bet.isBonusBalanceUsed ? 'Bonus-funded' : 'Organic / paid' }}
            </td>
            <td>{{ bet.rolledBack ? 'Rolled back' : 'Valid' }}</td>
            <td>
              <button
                class="text-button"
                :aria-label="`Edit round ${bet.round}`"
                @click="activity.inspectRound(bet)"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!player.bets.length" class="empty-inline">
      No activity yet. Generate a batch to add bets and wins.
    </p>
    <div v-if="pages > 1" class="pagination">
      <button class="button small" :disabled="page === 1" @click="page--">Previous</button
      ><span>Page {{ page }} of {{ pages }}</span
      ><button class="button small" :disabled="page === pages" @click="page++">Next</button>
    </div>
  </section>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed, ref, watch } from 'vue'
import ActivitySection from './ActivitySection.vue'
import { gameById } from '../domain/games/mockGames.js'
const props = defineProps({ player: Object }),
  activity = ref(null),
  page = ref(1)
const wins = computed(() => Object.fromEntries(props.player.wins.map((win) => [win.betId, win])))
const sorted = computed(() =>
  [...props.player.bets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / 50)))
const visible = computed(() => sorted.value.slice((page.value - 1) * 50, page.value * 50))
watch(pages, (count) => {
  page.value = Math.min(page.value, count)
})
const amount = (n) =>
  n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>
