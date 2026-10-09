const field = (key, label, value, group, min = 0, max = 1, step = 0.05) => ({
  key,
  label,
  description: `Adjust ${label.toLowerCase()} in the calculation.`,
  default: value,
  group,
  min,
  max,
  step,
  type: 'number',
})
export const hybridParameters = [
  field('historyWindow', 'History window (days)', 90, 'History', 1, 365, 1),
  field('halfLife', 'Recency half-life (days)', 30, 'History', 1, 180, 1),
  field('favouriteBoost', 'Favourite interest points', 6, 'History', 0, 20, 0.5),
  field('diversityPenalty', 'Similarity penalty', 0.15, 'History'),
  field('categoryWeight', 'Category match', 0.3, 'Content match'),
  field('providerWeight', 'Provider match', 0.2, 'Content match'),
  field('themeWeight', 'Theme match', 0.2, 'Content match'),
  field('featureWeight', 'Feature match', 0.2, 'Content match'),
  field('paylinesWeight', 'Paylines match', 0.1, 'Content match'),
  field('familiarAffinity', 'Player interest', 0.65, 'Familiar'),
  field('familiarContent', 'Content match', 0.2, 'Familiar'),
  field('familiarPopularity', 'Popularity', 0.1, 'Familiar'),
  field('familiarEditorial', 'Editorial', 0.05, 'Familiar'),
  field('discoveryContent', 'Content match', 0.7, 'Discovery'),
  field('discoveryPopularity', 'Popularity', 0.2, 'Discovery'),
  field('discoveryFreshness', 'Freshness', 0.05, 'Discovery'),
  field('discoveryEditorial', 'Editorial', 0.05, 'Discovery'),
  field('explorationContent', 'Content match', 0.45, 'Exploration'),
  field('explorationPopularity', 'Popularity', 0.35, 'Exploration'),
  field('explorationFreshness', 'Freshness', 0.15, 'Exploration'),
  field('explorationEditorial', 'Editorial', 0.05, 'Exploration'),
  field('coldPopularity', 'Popularity', 0.7, 'Cold start'),
  field('coldEditorial', 'Editorial', 0.2, 'Cold start'),
  field('coldFreshness', 'Freshness', 0.1, 'Cold start'),
]
export const baselineParameters = [
  field('popularityWeight', 'Popularity', 0.85, 'Baseline'),
  field('featuredWeight', 'Featured boost', 0.06, 'Baseline'),
  field('topWeight', 'Top boost', 0.06, 'Baseline'),
  field('freshnessWeight', 'Freshness', 0.03, 'Baseline'),
  field('diversityPenalty', 'Similarity penalty', 0.15, 'Diversity'),
]
export const defaults = (fields) => Object.fromEntries(fields.map((f) => [f.key, f.default]))
export function validateConfig(fields, config) {
  for (const f of fields)
    if (
      !Number.isFinite(config[f.key]) ||
      config[f.key] < f.min ||
      config[f.key] > f.max ||
      (f.step === 1 && !Number.isInteger(config[f.key]))
    )
      return `${f.label} must be between ${f.min} and ${f.max}${
        f.step === 1 ? ' (whole numbers)' : ''
      }.`
  for (const group of new Set(fields.map((f) => f.group))) {
    if (['History', 'Diversity'].includes(group)) continue
    const sum = fields.filter((f) => f.group === group).reduce((n, f) => n + config[f.key], 0)
    if (Math.abs(sum - 1) > 0.000001)
      return `${group} weights must total 1 (currently ${sum.toFixed(2)}).`
  }
  return ''
}
