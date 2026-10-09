import {
  buildProfile,
  contentMatch,
  supportingSignals,
  eligibleGames,
  DAY,
} from './shared/calculations.js'
import { selectDiverse } from './shared/diversity.js'
import { recommendation } from './shared/explainability.js'
import { hybridParameters, defaults } from './shared/config.js'
export default {
  id: 'v2-hybrid-2-6-2',
  version: '2.0.0',
  name: 'Personalized Hybrid 2+6+2',
  label: 'V2 · Personalized Hybrid 2+6+2',
  shortDescription: 'Balances familiar, similar, and exploratory games.',
  parameters: hybridParameters,
  defaultConfig: defaults(hybridParameters),
  run({ player, games, dailyStats, asOf, seed, config, platform }) {
    const eligible = eligibleGames(games, platform),
      profile = buildProfile(player, games, dailyStats, asOf, config)
    const signals = eligible.map((game) => ({
      game,
      components: {
        ...contentMatch(game, profile.preferences, config),
        ...supportingSignals(game, eligible, asOf, profile),
        hasEngagement: !!profile.lastPlayed[game.id],
        repeatedEngagement:
          dailyStats
            .filter((s) => s.gameId === game.id)
            .reduce((n, s) => n + s.paidRounds + s.bonusRounds, 0) > 1,
        recentlyPlayed:
          !!profile.lastPlayed[game.id] &&
          Date.parse(asOf) - Date.parse(profile.lastPlayed[game.id]) < 14 * DAY,
        matchedFeature:
          [...game.features].sort(
            (a, b) =>
              (profile.preferences.features[b] || 0) - (profile.preferences.features[a] || 0),
          )[0] || null,
      },
    }))
    const weightsFor = (pool) =>
      pool === 'cold'
        ? {
            popularity: config.coldPopularity,
            editorial: config.coldEditorial,
            freshness: config.coldFreshness,
          }
        : pool === 'familiar'
        ? {
            ownAffinity: config.familiarAffinity,
            contentMatch: config.familiarContent,
            popularity: config.familiarPopularity,
            editorial: config.familiarEditorial,
          }
        : pool === 'discovery'
        ? {
            contentMatch: config.discoveryContent,
            popularity: config.discoveryPopularity,
            freshness: config.discoveryFreshness,
            editorial: config.discoveryEditorial,
          }
        : {
            contentMatch: config.explorationContent,
            popularity: config.explorationPopularity,
            freshness: config.explorationFreshness,
            editorial: config.explorationEditorial,
          }
    const scored = (rows, pool) =>
      rows.map((c) => {
        const weights = weightsFor(pool)
        return {
          ...c,
          pool: pool === 'cold' ? 'fallback' : pool,
          weights,
          score: Object.entries(weights).reduce((n, [k, w]) => n + w * c.components[k], 0),
        }
      })
    let selected = []
    if (profile.coldStart)
      selected = selectDiverse(scored(signals, 'cold'), 10, [], seed, config.diversityPenalty)
    else {
      const pools = [
        ['familiar', 2, signals.filter((c) => profile.affinity[c.game.id] > 0)],
        [
          'discovery',
          6,
          signals.filter(
            (c) =>
              !player.favouriteGameIds.includes(c.game.id) &&
              (!profile.lastPlayed[c.game.id] ||
                Date.parse(asOf) - Date.parse(profile.lastPlayed[c.game.id]) >= 14 * DAY),
          ),
        ],
        ['exploration', 2, signals.filter((c) => !dailyStats.some((s) => s.gameId === c.game.id))],
      ]
      // Reserve exploratory picks after Discovery; use next-best compatible candidates when a pool is short.
      for (const [pool, count, rows] of pools) {
        const picks = selectDiverse(
          scored(rows, pool),
          count,
          selected,
          `${seed}:${pool}`,
          config.diversityPenalty,
        )
        selected.push(...picks)
        if (picks.length < count)
          selected.push(
            ...selectDiverse(
              scored(signals, pool),
              count - picks.length,
              selected,
              `${seed}:fallback:${pool}`,
              config.diversityPenalty,
            ).map((c) => ({ ...c, pool: 'fallback', fallbackFor: pool })),
          )
      }
    }
    const preferred = Object.keys(profile.preferences.categories)[0]
    const summary = profile.coldStart
      ? 'Not enough player history yet — showing a varied popular selection.'
      : `This player’s strongest preference is ${
          preferred || 'a mix of games'
        }. The engine balances two familiar choices, six related discoveries, and two opportunities to explore. Wins and losses do not influence these preferences.`
    return {
      playerProfile: profile,
      recommendations: selected.map((c, i) => recommendation(c, i + 1, player, profile.coldStart)),
      summary,
    }
  },
}
