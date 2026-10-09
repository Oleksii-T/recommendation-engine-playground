import { hashSeed } from './seededRandom.js'
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    )
  return value
}
export function fingerprint(value) {
  const text = JSON.stringify(canonical(value))
  return `${hashSeed(text).toString(16).padStart(8, '0')}-${hashSeed(`snapshot:${text}`)
    .toString(16)
    .padStart(8, '0')}`
}
export function playerSnapshot(player) {
  const { id, name, favouriteGameIds, bets, wins, generationBatches } = player
  return JSON.parse(JSON.stringify({ id, name, favouriteGameIds, bets, wins, generationBatches }))
}
export const playerFingerprint = (player) => fingerprint(playerSnapshot(player))
