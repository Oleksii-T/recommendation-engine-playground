export const componentLabels = {
  categoryMatch: 'Category',
  providerMatch: 'Provider',
  themeMatch: 'Themes',
  featureMatch: 'Features',
  paylinesMatch: 'Paylines',
  ownAffinity: 'Player interest',
  popularity: 'Popularity',
  freshness: 'Freshness',
  editorial: 'Editorial',
  featured: 'Featured',
  top: 'Top',
}
export function recommendation(candidate, rank, player, coldStart = false) {
  const { game, pool, score, components, weights, diversityPenalty = 0 } = candidate
  const contributions = {}
  for (const [key, weight] of Object.entries(weights)) {
    if (key === 'contentMatch') {
      for (const [part, value] of Object.entries(components.contentContributions)) {
        contributions[part] = value * weight
      }
    } else contributions[key] = (components[key] || 0) * weight
  }
  const reasons = []
  const add = (code, text) => reasons.push({ code, text })
  if (
    player.favouriteGameIds.includes(game.id) &&
    pool === 'familiar' &&
    contributions.ownAffinity > 0
  )
    add('favourite', 'Saved as a favourite')
  if (
    components.hasEngagement &&
    components.ownAffinity > 0.3 &&
    pool === 'familiar' &&
    contributions.ownAffinity > 0
  )
    add(
      'engagement',
      components.repeatedEngagement
        ? components.recentlyPlayed
          ? 'Played repeatedly and recently'
          : 'Strong repeated engagement'
        : 'Demonstrated player interest',
    )
  if (!coldStart && components.categoryMatch > 0.25 && contributions.categoryMatch > 0)
    add('category', `Strong interest in ${game.category}`)
  if (!coldStart && components.providerMatch > 0.15 && contributions.providerMatch > 0)
    add('provider', `Preferred provider · ${Math.round(components.providerMatch * 100)}%`)
  if (!coldStart && components.featureMatch > 0.2 && contributions.featureMatch > 0)
    add('features', `${components.matchedFeature} matches this player’s taste`)
  if (components.freshness > 0.5 && contributions.freshness > 0)
    add('freshness', 'New game worth exploring')
  if (components.popularity > 0.75 && contributions.popularity > 0)
    add('popularity', 'Popular with players')
  if (contributions.editorial > 0 || contributions.featured > 0 || contributions.top > 0)
    add('editorial', 'Featured or top selection')
  if (!reasons.length) add('eligible', 'A compatible alternative to explore')
  const clauses = {
    favourite: 'it is saved as a favourite',
    engagement: components.repeatedEngagement
      ? 'the player has engaged with it repeatedly'
      : 'the player has shown interest in it',
    category: `its ${game.category} category matches the player’s interests`,
    provider: 'it comes from a preferred provider',
    features: `its ${components.matchedFeature} feature matches the player’s taste`,
    freshness: 'it is a recent release',
    popularity: 'it is popular in this catalogue',
    editorial: 'it is a featured or top selection',
    eligible: 'it is compatible with the selected platform',
  }
  const signalNames = {
    ownAffinity: 'player interest',
    contentMatch: 'taste match',
    popularity: 'popularity',
    freshness: 'new-release freshness',
    editorial: 'editorial selections',
    featured: 'featured selections',
    top: 'top selections',
  }
  const formulaText = `This group combines ${Object.entries(weights)
    .filter(([, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, weight]) => `${Math.round(weight * 100)}% ${signalNames[key] || key}`)
    .join(', ')}.`
  return {
    gameId: game.id,
    rank,
    pool,
    fallbackFor: candidate.fallbackFor || null,
    score,
    reasonCodes: reasons.slice(0, 3).map((r) => r.code),
    reasonText: reasons.slice(0, 3).map((r) => r.text),
    components: { ...components, diversityPenalty },
    calculationTrace: {
      contributions,
      weights,
      formula: Object.entries(weights)
        .map(([key, weight]) => `${weight} × ${key}`)
        .join(' + '),
      selectionFormula: 'selectionScore = originalScore - diversityPenalty',
      originalScore: score,
      diversityPenalty,
      selectionScore: score - diversityPenalty,
      formulaText,
      explanation: `${game.name} was selected because ${reasons
        .slice(0, 2)
        .map((r) => clauses[r.code])
        .join(' and ')}.`,
      eligibility: { enabled: game.enabled, status: game.status, platforms: [...game.platforms] },
    },
  }
}
