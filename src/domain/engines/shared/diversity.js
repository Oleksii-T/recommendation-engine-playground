import { seededRandom } from '../../simulation/seededRandom.js'
const overlap = (a, b) => {
  const union = new Set([...a, ...b])
  return union.size ? a.filter((x) => b.includes(x)).length / union.size : 0
}
export function similarity(a, b) {
  return (
    0.4 * Number(a.category === b.category) +
    0.2 * Number(a.product === b.product) +
    0.2 * overlap(a.themes, b.themes) +
    0.2 * overlap(a.features, b.features)
  )
}
const combination = (g) => `${g.category}:${[...g.themes].sort()}:${[...g.features].sort()}`
export function selectDiverse(candidates, count, selected, seed, penalty = 0.15) {
  const random = seededRandom(seed)
  const pending = candidates
    .filter((c) => !selected.some((s) => s.game.id === c.game.id))
    .map((c) => ({ ...c, tie: random() }))
  const chosen = []
  while (pending.length && chosen.length < count) {
    const prior = [...selected, ...chosen]
    let allowed = pending.filter(
      (c) =>
        prior.filter((s) => s.game.product === c.game.product).length < 3 &&
        prior.filter((s) => combination(s.game) === combination(c.game)).length < 2,
    )
    // Relax caps only when no candidate can satisfy them; never return fewer solely for a cap.
    if (!allowed.length) allowed = pending
    const ranked = allowed
      .map((c) => ({
        ...c,
        diversityPenalty: prior.length
          ? penalty * Math.max(...prior.map((s) => similarity(c.game, s.game)))
          : 0,
      }))
      .sort(
        (a, b) => b.score - b.diversityPenalty - (a.score - a.diversityPenalty) || a.tie - b.tie,
      )
    chosen.push(ranked[0])
    pending.splice(
      pending.findIndex((c) => c.game.id === ranked[0].game.id),
      1,
    )
  }
  return chosen
}
