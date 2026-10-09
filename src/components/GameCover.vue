<template>
  <div class="game-cover" :class="[game.color, { compact }]" aria-hidden="true">
    <span class="cover-corner">{{ symbols[game.category] || '✦' }}</span
    ><span class="cover-monogram">{{
      game.name
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
    }}</span
    ><span v-if="!compact" class="cover-title">{{ game.name }}</span
    ><span class="cover-lines"></span>
  </div>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
defineProps({ game: Object, compact: Boolean })
const symbols = {
  'Video Slots': '✦',
  'Live Roulette': '◎',
  'Live Blackjack': '♠',
  'Live Baccarat': '♦',
  Blackjack: '♠',
  Roulette: '◎',
  Baccarat: '♦',
  Poker: '♣',
  Crash: '↗',
  Bingo: '⊞',
  'Casual/Other': '◇',
}
</script>
