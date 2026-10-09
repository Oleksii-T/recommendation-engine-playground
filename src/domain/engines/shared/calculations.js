import { paylinesBucket } from '../../games/taxonomy.js'
export const DAY = 86400000
export const recencyWeight = (days, halfLife = 30) => 2 ** (-days / halfLife)
export const dailyEngagement = (s) =>
  2 * Number(s.paidRounds > 0) +
  Math.log1p(Math.min(s.paidRounds, 100)) +
  0.5 * Math.log1p(Math.min(s.engagedSessions, 10)) +
  0.25 * Math.log1p(Math.min(s.bonusRounds, 100))
export function buildProfile(player, games, stats, asOf, config) {
  const affinity = {},
    lastPlayed = {}
  for (const s of stats) {
    const days = Math.max(0, (Date.parse(asOf) - Date.parse(`${s.date}T00:00:00Z`)) / DAY)
    // Daily buckets use the UTC calendar day, so today's activity retains full weight.
    const dayAge =
      Math.floor(Date.parse(asOf) / DAY) - Math.floor(Date.parse(`${s.date}T00:00:00Z`) / DAY)
    if (dayAge > config.historyWindow) continue
    affinity[s.gameId] =
      (affinity[s.gameId] || 0) +
      recencyWeight(Math.floor(days), config.halfLife) * dailyEngagement(s)
    if (!lastPlayed[s.gameId] || s.lastPlayedAt > lastPlayed[s.gameId])
      lastPlayed[s.gameId] = s.lastPlayedAt
  }
  for (const id of new Set(player.favouriteGameIds))
    if (games.some((g) => g.id === id)) affinity[id] = (affinity[id] || 0) + config.favouriteBoost
  const total = Object.values(affinity).reduce((a, b) => a + b, 0)
  const preferences = { categories: {}, providers: {}, themes: {}, features: {}, paylines: {} }
  for (const g of games) {
    const share = total ? (affinity[g.id] || 0) / total : 0
    const attrs = {
      categories: [g.category],
      providers: [g.product],
      themes: g.themes,
      features: g.features,
      paylines: paylinesBucket(g.paylines) ? [paylinesBucket(g.paylines)] : [],
    }
    for (const [group, values] of Object.entries(attrs))
      for (const value of new Set(values))
        preferences[group][value] = (preferences[group][value] || 0) + share
  }
  for (const group of Object.keys(preferences))
    preferences[group] = Object.fromEntries(
      Object.entries(preferences[group])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]),
    )
  return { affinity, lastPlayed, totalInterest: total, preferences, coldStart: total <= 0 }
}
export function contentMatch(game, preferences, config) {
  const avg = (items, map) =>
    items.length ? items.reduce((n, x) => n + (map[x] || 0), 0) / items.length : 0
  const matches = {
    categoryMatch: preferences.categories[game.category] || 0,
    providerMatch: preferences.providers[game.product] || 0,
    themeMatch: avg(game.themes, preferences.themes),
    featureMatch: avg(game.features, preferences.features),
    paylinesMatch: preferences.paylines[paylinesBucket(game.paylines)] || 0,
  }
  const available = {
    categoryMatch: !!game.category,
    providerMatch: !!game.product,
    themeMatch: game.themes.length > 0,
    featureMatch: game.features.length > 0,
    paylinesMatch: !!game.paylines,
  }
  const weights = {
    categoryMatch: config.categoryWeight,
    providerMatch: config.providerWeight,
    themeMatch: config.themeWeight,
    featureMatch: config.featureWeight,
    paylinesMatch: config.paylinesWeight,
  }
  const denominator = Object.keys(weights).reduce(
    (sum, k) => sum + (available[k] ? weights[k] : 0),
    0,
  )
  const contributions = Object.fromEntries(
    Object.keys(weights).map((k) => [
      k,
      denominator && available[k] ? (matches[k] * weights[k]) / denominator : 0,
    ]),
  )
  return {
    ...matches,
    contentMatch: Object.values(contributions).reduce((a, b) => a + b, 0),
    contentContributions: contributions,
    availableWeights: Object.fromEntries(
      Object.keys(weights).map((k) => [
        k,
        denominator && available[k] ? weights[k] / denominator : 0,
      ]),
    ),
  }
}
export function supportingSignals(game, eligible, asOf, profile) {
  const maxPop = Math.max(1, ...eligible.map((g) => g.weekly_session_count))
  return {
    popularity: Math.log1p(game.weekly_session_count) / Math.log1p(maxPop),
    freshness: Math.exp(-Math.max(0, (Date.parse(asOf) - Date.parse(game.created_at)) / DAY) / 45),
    editorial: Number(game.sub_groups.some((s) => ['Featured', 'Top'].includes(s))),
    ownAffinity: (profile.affinity[game.id] || 0) / Math.max(1, ...Object.values(profile.affinity)),
  }
}
export const eligibleGames = (games, platform) =>
  games.filter((g) => g.enabled && g.status === 'active' && g.platforms.includes(platform))
