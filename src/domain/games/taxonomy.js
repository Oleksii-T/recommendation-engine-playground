export const categories = [
  'Video Slots',
  'Live Roulette',
  'Live Blackjack',
  'Live Baccarat',
  'Blackjack',
  'Roulette',
  'Baccarat',
  'Poker',
  'Crash',
  'Bingo',
  'Casual/Other',
]
export function paylinesBucket(value) {
  if (!value) return null
  if (value <= 10) return '1–10 paylines'
  if (value <= 19) return '11–19 paylines'
  if (value <= 30) return '20–30 paylines'
  if (value <= 100) return '31–100 paylines'
  return '100+ ways'
}
