const historyHelp = {
  historyWindow: {
    description:
      'How far back the engine looks when learning what this player likes. Increasing it includes older activity; decreasing it focuses on more recent play. This changes the taste profile and which games count as familiar.',
    example:
      'With 90 days, play from 60 days ago counts toward the profile. With 30 days, that same activity is ignored. Favourites still add interest even without recent play.',
    note: 'Measured back from the Run configuration’s as-of date, using UTC days. Activity is kept in the player’s history.',
  },
  halfLife: {
    description:
      'How quickly older play loses influence. A larger value keeps old preferences relevant for longer; a smaller value reacts faster to changing tastes.',
    example:
      'With a 30-day half-life, the same activity counts at half strength after 30 days and quarter strength after 60 days.',
    note: 'This reduces the interest learned from play. It does not change when a game was played or the history window.',
  },
  favouriteBoost: {
    description:
      'Extra interest points added once to each favourite game. Increasing this makes favourites more influential in familiar-game ranking and in the categories, providers, themes and features the player is seen to like.',
    example:
      'If a game has 4 interest points from play, a favourite boost of 6 takes it to 10. A favourite with no play gets 6 points.',
    note: 'These are interest points, not a percentage of the final score. At 0, favourites add no extra interest points.',
  },
  diversityPenalty: {
    description:
      'Reduces a candidate’s selection score when it resembles games already picked. Increasing it encourages more variety across categories, providers, themes and features; decreasing it gives the original ranking more influence.',
    example:
      'A game scoring 0.80 with 60% similarity gets a 0.09 deduction when the penalty is 0.15: 0.80 − (0.15 × 0.60) = 0.71 for selection.',
    note: 'The displayed original score stays 0.80. At 0, this extra deduction stops; provider and repeated-combination limits still apply.',
  },
}

const contentHelp = {
  categoryWeight: {
    description:
      'How much the game’s category contributes to its overall content match. Increasing this favours categories the player likes, such as Video Slots or Live Roulette.',
    example:
      'If 80% of the player’s interest is in Video Slots, a slot gets 0.80 × 0.30 = 0.24 from category match at a weight of 0.30.',
  },
  providerWeight: {
    description:
      'How much the game’s provider contributes to its overall content match. Increasing this favours studios the player already likes.',
    example:
      'If Pragmatic Play accounts for 60% of the player’s interest, its games get 0.60 × 0.20 = 0.12 from provider match at a weight of 0.20.',
  },
  themeWeight: {
    description:
      'How much themes, such as Egyptian or Adventure, contribute to content match. Increasing this helps games with familiar themes rank higher, including games from different providers.',
    example:
      'If the player’s interest shares are 0.80 for Egyptian and 0.40 for Adventure, a game with both averages 0.60. At a weight of 0.20, the contribution is 0.12.',
  },
  featureWeight: {
    description:
      'How much features, such as Free Spins or Multipliers, contribute to content match. Increasing this favours mechanics found in games the player likes.',
    example:
      'If the player’s interest shares are 0.80 for Free Spins and 0.20 for Multipliers, a game with both averages 0.50. At a weight of 0.20, the contribution is 0.10.',
  },
  paylinesWeight: {
    description:
      'How much a matching payline range contributes to content match. A payline is a pattern of symbol positions that can produce a win. Increasing this favours games in the payline ranges the player likes.',
    example:
      'A 25-payline game and a 30-payline game are both in the 20–30 range. If that range has a preference share of 0.70, a weight of 0.10 adds 0.07 to content match.',
  },
}

const contexts = {
  Familiar: 'the Familiar score, used for the target of 2 games the player has shown interest in',
  Discovery:
    'the Discovery score, used for the target of 6 related games, excluding favourites and games played in the last 14 days',
  Exploration:
    'the Exploration score, used for the target of 2 games absent from the player’s recorded play history',
  'Cold start':
    'the Cold start score, used for all 10 recommendations when there is no interest from qualifying play or favourites',
  Baseline:
    'the V1 score, used for all 10 recommendations without using this player’s history or favourites',
}

const signals = {
  Content: {
    description:
      'How much similarity to the player’s taste profile matters. Increasing this favours matching categories, providers, themes, features and payline ranges.',
    score: 0.8,
    explanation: 'a game has a content match of 0.80',
  },
  Popularity: {
    description:
      'How much global popularity matters. Popularity uses weekly game sessions across players, with very large counts scaled down so one blockbuster does not overwhelm the ranking. Increasing this favours widely played games.',
    score: 1,
    explanation:
      'the game is the most played among eligible games, giving it a popularity signal of 1',
  },
  Freshness: {
    description:
      'How much newly added games are favoured. A game added at the as-of date gets the strongest freshness signal; the signal fades with age. Increasing this gives newer games more influence.',
    score: 0.37,
    explanation:
      'a game was added about 45 days before the as-of date, giving it a freshness signal of about 0.37',
  },
  Editorial: {
    description:
      'How much a Featured or Top tag boosts a game. Increasing this gives your editorial selections more influence. A game with either tag gets the boost once, even if it has both.',
    score: 1,
    explanation: 'the game is tagged Featured or Top, giving it an editorial signal of 1',
  },
  Affinity: {
    description:
      'How much the player’s direct interest in this specific game matters. Interest comes from play activity, its recency and favourites. Increasing this favours established favourites and frequently played games. Bet amounts, wins and losses do not add interest.',
    score: 1,
    explanation: 'the game has the player’s strongest interest, giving it an interest signal of 1',
  },
  featuredWeight: {
    description:
      'How much the Featured tag boosts a game in V1. Increasing this gives Featured games more influence; an untagged game gets no contribution from this setting.',
    score: 1,
    explanation: 'the game has the Featured tag',
  },
  topWeight: {
    description:
      'How much the Top tag boosts a game in V1. Increasing this gives Top games more influence. In V1, a game tagged both Featured and Top gets both separate boosts.',
    score: 1,
    explanation: 'the game has the Top tag',
  },
}

export function formulaHelp(field) {
  if (historyHelp[field.key]) return historyHelp[field.key]
  if (contentHelp[field.key])
    return {
      ...contentHelp[field.key],
      note: `A weight of ${field.default.toFixed(2)} means ${Math.round(
        field.default * 100,
      )}% of the content-match formula. The five weights must total 1. These examples assume all metadata is available; missing attributes are skipped and the remaining weights are rescaled.`,
    }
  const signal =
    signals[field.key] ||
    signals[
      field.key === 'popularityWeight'
        ? 'Popularity'
        : field.key === 'freshnessWeight'
        ? 'Freshness'
        : field.key.replace(/^(familiar|discovery|exploration|cold)/, '')
    ]
  return {
    description: `${signal.description} This contributes to ${contexts[field.group]}.`,
    example: `If ${signal.explanation}, the default weight of ${field.default.toFixed(2)} adds ${(
      signal.score * field.default
    ).toFixed(2)} to this score. A weight of 0 makes this signal contribute nothing.`,
    note: `A weight of ${field.default.toFixed(2)} means ${Math.round(
      field.default * 100,
    )}% of this group’s scoring formula. The ${
      field.group
    } weights must total 1, so increasing one means reducing another. Weights change ranking; they do not change how many games the group requests.`,
  }
}
