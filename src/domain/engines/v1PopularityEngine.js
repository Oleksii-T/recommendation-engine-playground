import { eligibleGames, supportingSignals } from './shared/calculations.js'
import { selectDiverse } from './shared/diversity.js'
import { recommendation } from './shared/explainability.js'
import { baselineParameters, defaults } from './shared/config.js'
export default {
  id: 'v1-popularity',
  version: '1.0.0',
  name: 'Popularity Baseline',
  label: 'V1 · Popularity Baseline',
  shortDescription: 'A varied selection of globally popular games.',
  parameters: baselineParameters,
  defaultConfig: defaults(baselineParameters),
  run({ games, asOf, seed, config, platform }) {
    const eligible = eligibleGames(games, platform)
    const profile = { affinity: {}, totalInterest: 0, preferences: {}, coldStart: false }
    const weights = {
      popularity: config.popularityWeight,
      featured: config.featuredWeight,
      top: config.topWeight,
      freshness: config.freshnessWeight,
    }
    const candidates = eligible.map((game) => {
      const components = {
        ...supportingSignals(game, eligible, asOf, profile),
        contentMatch: 0,
        contentContributions: {},
        featured: Number(game.sub_groups.includes('Featured')),
        top: Number(game.sub_groups.includes('Top')),
      }
      return {
        game,
        pool: 'baseline',
        components,
        weights,
        score: Object.entries(weights).reduce((sum, [k, w]) => sum + w * components[k], 0),
      }
    })
    const selected = selectDiverse(candidates, 10, [], seed, config.diversityPenalty)
    return {
      playerProfile: profile,
      recommendations: selected.map((c, i) => recommendation(c, i + 1, { favouriteGameIds: [] })),
      summary:
        'A varied popular selection, with small boosts for featured, top, and recently released games. Player activity does not affect this ranking.',
    }
  },
}
