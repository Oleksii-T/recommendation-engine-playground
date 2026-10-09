const value = (n) => (Number.isFinite(n) ? String(n) : '?')
const weight = (n) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 20,
        useGrouping: false,
      })
    : '?'
const mix = (c, terms) => terms.map(([key, label]) => `${weight(c[key])} × ${label}`).join(' + ')

export function formulaGroupGuide(group, c) {
  const scoring = {
    Familiar: {
      purpose: 'Rank the games this player already shows interest in. Target: 2 places.',
      terms: [
        ['familiarAffinity', 'game interest'],
        ['familiarContent', 'content match'],
        ['familiarPopularity', 'popularity'],
        ['familiarEditorial', 'editorial'],
      ],
      note: 'Game interest comes from recency-weighted play and favourite points.',
    },
    Discovery: {
      purpose:
        'Rank related games to discover. Target: 6 places. Exclude favourites and games played in the last 14 days of the learned history.',
      terms: [
        ['discoveryContent', 'content match'],
        ['discoveryPopularity', 'popularity'],
        ['discoveryFreshness', 'freshness'],
        ['discoveryEditorial', 'editorial'],
      ],
      note: 'Content match links this step to learned taste. The recent-play check uses the selected history window.',
    },
    Exploration: {
      purpose: 'Rank games absent from the player’s recorded activity. Target: 2 places.',
      terms: [
        ['explorationContent', 'content match'],
        ['explorationPopularity', 'popularity'],
        ['explorationFreshness', 'freshness'],
        ['explorationEditorial', 'editorial'],
      ],
      note: '“Not played” uses qualifying activity on or before the as-of date, even outside the learning window.',
    },
    'Cold start': {
      purpose:
        'Use this ranking when qualifying play and favourites produce no interest. It fills all 10 places instead of using 2+6+2.',
      terms: [
        ['coldPopularity', 'popularity'],
        ['coldEditorial', 'editorial'],
        ['coldFreshness', 'freshness'],
      ],
      note: 'Editorial is 1 for a Featured or Top game, otherwise 0. Freshness fades with a game’s age.',
    },
    Baseline: {
      purpose:
        'Rank all eligible games for V1. Player activity and favourites do not enter this calculation.',
      terms: [
        ['popularityWeight', 'popularity'],
        ['featuredWeight', 'Featured'],
        ['topWeight', 'Top'],
        ['freshnessWeight', 'freshness'],
      ],
      note: 'Featured and Top each equal 1 when the tag is present. A game with both gets both boosts.',
    },
  }
  if (scoring[group])
    return {
      stage: 'Ranking',
      purpose: scoring[group].purpose,
      formula: `score = ${mix(c, scoring[group].terms)}`,
      note: `${scoring[group].note} Signals use a 0–1 scale. Weights must total 1; 0.70 means 70% of this formula.`,
    }
  if (group === 'History')
    return {
      stage: 'Learning',
      purpose:
        'Build interest in each game from daily play. Use that interest to learn the player’s preferred categories, providers, themes, features and paylines.',
      formula: `recency = 2 ^ (−days ago / ${value(
        c.halfLife,
      )})\ninterest = sum(daily engagement × recency) + ${value(c.favouriteBoost)} per favourite`,
      note: `Look back ${value(
        c.historyWindow,
      )} UTC days. Equal activity counts at half strength after ${value(
        c.halfLife,
      )} days. Daily engagement uses capped round and session counts, with less weight for bonus/free play.`,
    }
  if (group === 'Content match')
    return {
      stage: 'Matching',
      purpose:
        'Compare each game’s attributes with learned preferences. This creates one content-match signal, reused by Familiar, Discovery and Exploration.',
      formula: `content match = (${mix(c, [
        ['categoryWeight', 'category'],
        ['providerWeight', 'provider'],
        ['themeWeight', 'theme'],
        ['featureWeight', 'feature'],
        ['paylinesWeight', 'paylines'],
      ])}) / sum(available weights)`,
      note: `Example: an 80% category preference contributes about ${
        Number.isFinite(c.categoryWeight) ? (0.8 * c.categoryWeight).toFixed(2) : '?'
      } with a category weight of ${weight(
        c.categoryWeight,
      )}, when all metadata is available. Missing attributes are skipped and the remaining weights are rescaled.`,
    }
  return {
    stage: 'Selection',
    purpose:
      'Apply variety while picking games from each ranked group. Compare a candidate with games already chosen.',
    formula: `selection score = score − ${weight(
      c.diversityPenalty,
    )} × highest similarity to earlier picks`,
    note: 'Prefer at most 3 games per provider and 2 with the same category/theme/feature combination. Relax these limits only when no candidate can satisfy them. Displayed recommendation scores stay unchanged.',
  }
}
