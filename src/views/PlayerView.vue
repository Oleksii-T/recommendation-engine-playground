<template>
  <div class="page player-page">
    <template v-if="player">
      <div class="page-heading">
        <div class="player-heading">
          <RouterLink to="/players" class="text-button">← Players</RouterLink>
          <h1>{{ player.name }}</h1>
        </div>
      </div>
      <TabBar
        :tabs="tabs"
        :active="activeTab"
        label="Player sections"
        prefix="player"
        @select="selectTab"
      />
      <div
        id="player-panel"
        role="tabpanel"
        :aria-labelledby="`player-tab-${activeTab}`"
        tabindex="0"
        class="player-tab-panel"
      >
        <PlayerGeneral v-if="activeTab === 'general'" :key="player.id" :player="player" />
        <PlayerActivity v-else-if="activeTab === 'activity'" :key="player.id" :player="player" />
        <PlayerSimulation v-else :key="player.id" :player="player" />
      </div>
    </template>
    <section v-else class="panel empty-inline">
      <h1>Player not found</h1>
      <p>This player is no longer in the local workspace.</p>
      <RouterLink to="/players" class="button">Back to Players</RouterLink>
    </section>
  </div>
</template>
<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayground } from '../stores/playground.js'
import TabBar from '../components/TabBar.vue'
import PlayerGeneral from '../components/PlayerGeneral.vue'
import PlayerActivity from '../components/PlayerActivity.vue'
import PlayerSimulation from '../components/PlayerSimulation.vue'
const store = usePlayground(),
  route = useRoute(),
  router = useRouter()
const player = computed(() => store.players.find((p) => p.id === route.params.playerId))
const tabs = [
  { id: 'general', label: 'General info' },
  { id: 'activity', label: 'Bets and Wins' },
  { id: 'simulation', label: 'Simulation' },
]
const activeTab = computed(() => route.params.tab || 'general')
watch(
  () => player.value?.id,
  (id) => {
    if (id && store.settings.selectedPlayerId !== id) {
      store.settings.selectedPlayerId = id
      store.persist()
    }
  },
  { immediate: true, flush: 'sync' },
)
function selectTab(tab) {
  router.push({ name: 'player', params: { playerId: player.value.id, tab }, query: route.query })
}
</script>
