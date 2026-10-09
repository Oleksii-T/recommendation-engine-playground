import { games } from '../domain/games/mockGames.js'
import { engines, getEngine } from '../domain/engines/registry.js'
import { validateConfig } from '../domain/engines/shared/config.js'
import { validateBatch } from '../domain/simulation/activityGenerator.js'
export const STORAGE_KEY = 'recommendation-playground:v1'
export const SCHEMA_VERSION = 1
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const date = (value) =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value
const ids = games.map((g) => g.id)
const number = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
const text = (v) => typeof v === 'string' && v.length > 0 && v.length <= 1000
const object = (v) => v && typeof v === 'object' && !Array.isArray(v)
export function validateState(data) {
  assert(
    data && data.schemaVersion === SCHEMA_VERSION,
    'Unsupported state version. Import a version 1 playground export.',
  )
  assert(
    Array.isArray(data.players) &&
      Array.isArray(data.presets) &&
      data.settings &&
      typeof data.settings === 'object',
    'The file is not a complete playground export.',
  )
  assert(
    data.players.length <= 500 && data.presets.length <= 500,
    'This export exceeds the supported local limits.',
  )
  assert(
    new Set(data.players.map((p) => p.id)).size === data.players.length,
    'Player IDs must be unique.',
  )
  for (const p of data.players) {
    assert(
      text(p.id) && text(p.name) && p.name.length <= 80 && date(p.createdAt),
      'A player has invalid details.',
    )
    assert(
      ['favouriteGameIds', 'bets', 'wins', 'generationBatches', 'recommendationRuns'].every((k) =>
        Array.isArray(p[k]),
      ),
      'A player is missing activity or saved runs.',
    )
    assert(
      p.favouriteGameIds.every((id) => ids.includes(id)),
      'A favourite refers to an unknown game.',
    )
    assert(
      p.bets.length <= 100000 && p.wins.length <= 100000 && p.recommendationRuns.length <= 1000,
      'A player exceeds the supported activity or run limits.',
    )
    assert(
      new Set(p.bets.map((b) => b.id)).size === p.bets.length &&
        new Set(p.wins.map((w) => w.id)).size === p.wins.length,
      'Activity IDs must be unique.',
    )
    for (const b of p.bets)
      assert(
        text(b.id) &&
          b.playerId === p.id &&
          ids.includes(b.gameId) &&
          number(b.amount) &&
          date(b.createdAt) &&
          text(b.token) &&
          text(b.round) &&
          ['isFree', 'isBonusBalanceUsed', 'rolledBack'].every((k) => typeof b[k] === 'boolean'),
        'A bet has invalid amounts, identifiers, play type, or timestamp.',
      )
    const betMap = new Map(p.bets.map((b) => [b.id, b]))
    for (const w of p.wins) {
      const b = betMap.get(w.betId)
      assert(
        text(w.id) &&
          b &&
          w.playerId === p.id &&
          w.gameId === b.gameId &&
          w.token === b.token &&
          w.round === b.round &&
          number(w.amount) &&
          date(w.createdAt),
        'A win has invalid values or no matching bet.',
      )
    }
    assert(
      new Set(p.wins.map((w) => w.betId)).size === p.bets.length && p.wins.length === p.bets.length,
      'Every bet must have exactly one win outcome.',
    )
    assert(
      new Set(p.generationBatches.map((b) => b.id)).size === p.generationBatches.length &&
        new Set(p.recommendationRuns.map((r) => r.id)).size === p.recommendationRuns.length,
      'Batch and run IDs must be unique.',
    )
    const winIds = new Set(p.wins.map((w) => w.id))
    const assigned = new Set()
    for (const batch of p.generationBatches) {
      assert(
        text(batch.id) &&
          batch.playerId === p.id &&
          ids.includes(batch.gameId) &&
          batch.config &&
          batch.summary &&
          Array.isArray(batch.betIds) &&
          Array.isArray(batch.winIds) &&
          batch.betIds.length === batch.winIds.length,
        'A batch is incomplete.',
      )
      assert(
        date(batch.config.dateTime) &&
          date(batch.summary.earliest) &&
          date(batch.summary.latest) &&
          batch.config.rounds === batch.betIds.length &&
          batch.summary.rounds === batch.betIds.length &&
          batch.summary.sessions === batch.config.sessions &&
          ['minimum', 'maximum', 'totalBet', 'totalWin'].every((key) =>
            number(batch.summary[key]),
          ) &&
          Number.isFinite(batch.summary.net),
        'A batch has invalid configuration or summary values.',
      )
      validateBatch(batch.config, batch.summary.latest)
      assert(
        batch.betIds.every((id) => betMap.has(id) && !assigned.has(id)) &&
          batch.winIds.every((id) => winIds.has(id)),
        'A batch refers to missing or repeated activity.',
      )
      batch.betIds.forEach((id) => assigned.add(id))
    }
    assert(assigned.size === p.bets.length, 'All activity must belong to a batch.')
    for (const run of p.recommendationRuns) {
      const engine = getEngine(run.engineId)
      assert(
        engine &&
          text(run.id) &&
          run.playerId === p.id &&
          date(run.asOf) &&
          date(run.createdAt) &&
          text(run.inputFingerprint) &&
          text(run.playerFingerprint) &&
          text(run.seed) &&
          ['desktop', 'mobile'].includes(run.platform) &&
          run.engineConfig &&
          !validateConfig(engine.parameters, run.engineConfig),
        'A saved run has invalid configuration or metadata.',
      )
      assert(
        Array.isArray(run.dailyStats) &&
          run.playerProfile &&
          run.playerProfile.preferences &&
          Array.isArray(run.recommendations) &&
          typeof run.summary === 'string',
        'A saved result is incomplete.',
      )
      assert(
        object(run.playerProfile.preferences) &&
          Object.values(run.playerProfile.preferences).every(
            (group) =>
              object(group) &&
              Object.values(group).every((value) => number(value) && value <= 1.000001),
          ),
        'Saved preference shares must be numeric maps between 0 and 1.',
      )
      for (const stat of run.dailyStats) {
        assert(
          stat.playerId === p.id &&
            ids.includes(stat.gameId) &&
            /^\d{4}-\d{2}-\d{2}$/.test(stat.date) &&
            date(stat.lastPlayedAt) &&
            ['paidRounds', 'bonusRounds', 'engagedSessions'].every(
              (key) => number(stat[key]) && Number.isInteger(stat[key]),
            ),
          'Saved daily statistics are invalid.',
        )
      }
      assert(
        run.recommendations.length <= 10 &&
          new Set(run.recommendations.map((r) => r.gameId)).size === run.recommendations.length,
        'Saved recommendations must be unique and contain at most 10 games.',
      )
      for (const r of run.recommendations)
        assert(
          ids.includes(r.gameId) &&
            number(r.score) &&
            Array.isArray(r.reasonText) &&
            r.reasonText.every((x) => typeof x === 'string') &&
            r.components &&
            number(r.components.popularity) &&
            r.calculationTrace &&
            r.calculationTrace.contributions &&
            r.calculationTrace.eligibility &&
            ['baseline', 'familiar', 'discovery', 'exploration', 'fallback'].includes(r.pool),
          'A saved recommendation has an invalid explanation trace.',
        )
      for (const [index, recommendation] of run.recommendations.entries()) {
        const trace = recommendation.calculationTrace
        assert(
          recommendation.rank === index + 1 &&
            recommendation.score <= 1.000001 &&
            object(trace.contributions) &&
            Object.values(trace.contributions).every(number) &&
            Math.abs(
              Object.values(trace.contributions).reduce((sum, value) => sum + value, 0) -
                recommendation.score,
            ) < 0.000001 &&
            number(trace.diversityPenalty) &&
            number(trace.originalScore) &&
            typeof trace.explanation === 'string' &&
            typeof trace.formulaText === 'string' &&
            Array.isArray(trace.eligibility.platforms),
          'Saved score contributions or explanations are invalid.',
        )
      }
    }
  }
  const s = data.settings
  assert(
    getEngine(s.activeEngine) &&
      (s.selectedPlayerId === null || data.players.some((p) => p.id === s.selectedPlayerId)) &&
      (s.compareEngine === '' || getEngine(s.compareEngine)) &&
      ['desktop', 'mobile'].includes(s.platform) &&
      date(s.asOf) &&
      typeof s.seed === 'string' &&
      s.seed.length <= 1000 &&
      s.configs &&
      typeof s.configs === 'object',
    'The saved settings are invalid.',
  )
  assert(
    engines.every((e) => object(s.configs[e.id])),
    'Settings must include configuration for every registered engine.',
  )
  for (const [id, config] of Object.entries(s.configs)) {
    const engine = getEngine(id)
    assert(
      engine && !validateConfig(engine.parameters, config),
      'Saved formula weights are invalid.',
    )
  }
  for (const preset of data.presets) {
    const e = getEngine(preset.engineId)
    assert(
      e &&
        text(preset.id) &&
        text(preset.name) &&
        preset.config &&
        !validateConfig(e.parameters, preset.config),
      'A formula preset is invalid.',
    )
  }
  // Copy the validated JSON document. Imported strings are rendered as text, never HTML.
  return JSON.parse(JSON.stringify(data))
}
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { data: raw ? validateState(JSON.parse(raw)) : null, warning: '' }
  } catch (e) {
    return {
      data: null,
      warning: `Saved data could not be loaded: ${e.message} You can export the stored file or reset local data.`,
    }
  }
}
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
