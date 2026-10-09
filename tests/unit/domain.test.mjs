import { test } from 'node:test'
import assert from 'node:assert/strict'
import { games } from '../../src/domain/games/mockGames.js'
import { seededRandom } from '../../src/domain/simulation/seededRandom.js'
import { generateActivity, generateOutcome } from '../../src/domain/simulation/activityGenerator.js'
import { deriveDailyStats } from '../../src/domain/simulation/dailyStats.js'
import { buildScenario, DEMO_AS_OF as asOf } from '../../src/domain/scenarios/builtInScenarios.js'
import {
  buildProfile,
  contentMatch,
  dailyEngagement,
  recencyWeight,
} from '../../src/domain/engines/shared/calculations.js'
import { engines, runEngine, compareResults } from '../../src/domain/engines/registry.js'
import { validateConfig } from '../../src/domain/engines/shared/config.js'
import { fingerprint, playerFingerprint } from '../../src/domain/simulation/fingerprint.js'
import { validateState, SCHEMA_VERSION } from '../../src/stores/persistence.js'
const clone = (x) => JSON.parse(JSON.stringify(x)),
  v1 = engines[0],
  v2 = engines[1]
const config = {
  rounds: 1000,
  sessions: 12,
  baseAmount: 100,
  randomness: 20,
  playType: 'paid',
  dateTime: '2026-10-01T12:00:00.000Z',
  seed: 'test-42',
}
const generate = (overrides = {}) =>
  generateActivity({ playerId: 'test', game: games[0], config: { ...config, ...overrides }, asOf })
const run = (player, engine = v2, overrides = {}) =>
  runEngine({
    engineId: engine.id,
    player,
    games,
    asOf,
    seed: 'engine-42',
    platform: 'desktop',
    config: engine.defaultConfig,
    ...overrides,
  })
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)
test('catalogue has diversity, complete model fields, and unique IDs', () => {
  assert.equal(games.length, 32)
  assert.equal(new Set(games.map((g) => g.id)).size, 32)
  assert.ok(new Set(games.map((g) => g.product)).size >= 6)
  assert.equal(new Set(games.map((g) => g.category)).size, 11)
  for (const g of games)
    for (const key of [
      'game_id',
      'game_code',
      'game_url',
      'enabled',
      'status',
      'source',
      'created_at',
      'weekly_session_count',
      'isBonusPlay',
      'isFreebet',
      'url_thumb',
      'url_background',
    ])
      assert.ok(key in g)
})
test('seeded random and activity are identical for identical inputs', () => {
  const a = seededRandom('same'),
    b = seededRandom('same')
  for (let i = 0; i < 100; i++) assert.equal(a(), b())
  assert.deepEqual(generate(), generate())
  assert.notDeepEqual(generate().bets, generate({ seed: 'other' }).bets)
})
test('base 100 ±20% always remains 80–120 and rounds match wins', () => {
  const b = generate()
  assert.equal(b.bets.length, 1000)
  assert.equal(b.wins.length, 1000)
  for (let i = 0; i < b.bets.length; i++) {
    assert.ok(b.bets[i].amount >= 80 && b.bets[i].amount <= 120)
    assert.equal(b.wins[i].betId, b.bets[i].id)
    assert.equal(b.wins[i].token, b.bets[i].token)
    assert.equal(b.wins[i].round, b.bets[i].round)
    if (i) assert.ok(b.bets[i].createdAt > b.bets[i - 1].createdAt)
  }
  assert.equal(new Set(b.bets.map((x) => x.token)).size, 12)
  assert.equal(new Set(generate({ randomness: 0 }).bets.map((x) => x.amount)).size, 1)
})
test('win buckets use documented boundaries and fixed-seed frequency is loss leaning', () => {
  for (const [choice, name, expected] of [
    [0.1, 'Losing', 40],
    [0.6, 'Near break-even', 100],
    [0.85, 'Moderate win', 210],
    [0.98, 'Large win', 650],
  ]) {
    let i = 0
    const values = [choice, 0.5]
    const out = generateOutcome(100, () => values[i++])
    assert.equal(out.bucket, name)
    assert.equal(out.amount, expected)
  }
  const random = seededRandom('distribution'),
    counts = {},
    total = 50000
  let returnSum = 0
  for (let i = 0; i < total; i++) {
    const o = generateOutcome(100, random)
    counts[o.bucket] = (counts[o.bucket] || 0) + 1
    returnSum += o.amount
  }
  for (const [name, expected] of [
    ['Losing', 0.6],
    ['Near break-even', 0.25],
    ['Moderate win', 0.13],
    ['Large win', 0.02],
  ])
    assert.ok(Math.abs(counts[name] / total - expected) < 0.012)
  assert.ok(returnSum / total < 100)
})
test('batch validation rejects invalid sessions, amounts, date, rounds, randomness, seed and overflow', () => {
  for (const values of [
    { rounds: 0 },
    { rounds: 1001 },
    { rounds: 1.5 },
    { sessions: 51 },
    { rounds: 3, sessions: 4 },
    { baseAmount: 0 },
    { randomness: 101 },
    { seed: '' },
    { dateTime: '2026-10-10T00:00:00.000Z' },
    { dateTime: 'invalid' },
    { dateTime: '2026-10-09T17:59:59.000Z' },
  ])
    assert.throws(() => generate(values))
})
test('daily stats ignore rollback, zero paid rounds, future activity and deduplicate token+round', () => {
  const b = generate({ rounds: 4, sessions: 2 })
  b.bets[1].rolledBack = true
  b.bets[2].isFree = true
  b.bets[3].amount = 0
  const player = {
    id: 'test',
    bets: [
      ...b.bets,
      clone(b.bets[0]),
      { ...b.bets[0], token: 'bare-invalid', round: 'zero', amount: 0 },
      { ...b.bets[0], token: 'future', createdAt: '2026-11-01T00:00:00.000Z' },
    ],
  }
  const [s] = deriveDailyStats(player, asOf)
  assert.equal(s.paidRounds, 1)
  assert.equal(s.bonusRounds, 1)
  assert.equal(s.engagedSessions, 2)
  assert.equal(s.lastPlayedAt, b.bets[2].createdAt)
})
test('calendar boundaries are UTC, with same-session daily counts', () => {
  const b = generate({ rounds: 2, sessions: 1 })
  b.bets[0].createdAt = '2026-10-01T23:59:59.000Z'
  b.bets[1].createdAt = '2026-10-02T00:00:01.000Z'
  const stats = deriveDailyStats({ id: 'test', bets: b.bets }, asOf)
  assert.equal(stats.length, 2)
  assert.deepEqual(
    stats.map((s) => s.date),
    ['2026-10-01', '2026-10-02'],
  )
  assert.ok(stats.every((s) => s.engagedSessions === 1))
})
test('recency halves every 30 days', () => {
  close(recencyWeight(0), 1)
  close(recencyWeight(30), 0.5)
  close(recencyWeight(60), 0.25)
  close(recencyWeight(90), 0.125)
})
test('engagement uses specified caps and discounts bonus activity', () => {
  close(
    dailyEngagement({ paidRounds: 1000, engagedSessions: 50, bonusRounds: 1000 }),
    2 + Math.log1p(100) + 0.5 * Math.log1p(10) + 0.25 * Math.log1p(100),
  )
  assert.ok(
    dailyEngagement({ paidRounds: 10, engagedSessions: 1, bonusRounds: 0 }) >
      dailyEngagement({ paidRounds: 0, engagedSessions: 1, bonusRounds: 10 }),
  )
})
test('favourite boost is exactly once, including duplicate favourites', () => {
  const p = buildScenario('cold')
  p.favouriteGameIds = ['g01', 'g01']
  const profile = buildProfile(p, games, [], asOf, v2.defaultConfig)
  close(profile.affinity.g01, 6)
  close(profile.totalInterest, 6)
})
test('attribute preferences normalize and multi-value shares may overlap', () => {
  const p = buildScenario('cold')
  p.favouriteGameIds = ['g01', 'g04']
  const profile = buildProfile(p, games, [], asOf, v2.defaultConfig)
  close(profile.preferences.categories['Video Slots'], 1)
  close(profile.preferences.providers['Pragmatic Play'], 0.5)
  close(profile.preferences.themes.Egyptian, 1)
  close(profile.preferences.features['Free Spins'], 1)
  close(profile.preferences.features.Multipliers, 0.5)
})
test('missing metadata renormalizes available content weights', () => {
  const prefs = {
    categories: { Blackjack: 1 },
    providers: { NetEnt: 1 },
    themes: {},
    features: {},
    paylines: {},
  }
  const result = contentMatch(
    { ...games[22], themes: [], features: [], paylines: 0 },
    prefs,
    v2.defaultConfig,
  )
  close(result.contentMatch, 1)
  close(result.availableWeights.categoryMatch, 0.6)
  close(result.availableWeights.providerMatch, 0.4)
  close(result.availableWeights.paylinesMatch, 0)
})
test('V1 ranking ignores all player history and favourites', () => {
  const a = run(buildScenario('cold'), v1),
    b = run(buildScenario('slots'), v1)
  assert.deepEqual(a.recommendations, b.recommendations)
})
test('V2 returns the full deterministic 2+6+2 composition and Discovery excludes recent/favourites', () => {
  const p = buildScenario('slots'),
    r = run(p)
  assert.deepEqual(r, run(p))
  assert.equal(r.recommendations.length, 10)
  assert.deepEqual(
    ['familiar', 'discovery', 'exploration'].map(
      (pool) => r.recommendations.filter((x) => x.pool === pool).length,
    ),
    [2, 6, 2],
  )
  for (const x of r.recommendations.filter((x) => x.pool === 'discovery')) {
    assert.ok(!p.favouriteGameIds.includes(x.gameId))
    assert.ok(
      !r.dailyStats.some(
        (s) =>
          s.gameId === x.gameId && Date.parse(asOf) - Date.parse(s.lastPlayedAt) < 14 * 86400000,
      ),
    )
  }
})
test('default V2 does not learn from positive wager or win amount changes', () => {
  const p = buildScenario('slots'),
    changed = clone(p)
  changed.bets.forEach((b) => {
    b.amount *= 1000
  })
  changed.wins.forEach((w) => {
    w.amount = 9999999
  })
  assert.deepEqual(run(p).playerProfile, run(changed).playerProfile)
  assert.deepEqual(run(p).recommendations, run(changed).recommendations)
})
test('short pools and tiny catalogues produce deterministic eligible fallback', () => {
  const p = buildScenario('cold')
  p.favouriteGameIds = ['g01']
  const limited = games.slice(0, 4),
    a = run(p, v2, { games: limited }),
    b = run(p, v2, { games: limited })
  assert.deepEqual(a, b)
  assert.equal(a.recommendations.length, 4)
  assert.ok(a.recommendations.some((x) => x.pool === 'fallback'))
  assert.equal(new Set(a.recommendations.map((r) => r.gameId)).size, 4)
  assert.equal(run(p, v2, { games: [] }).recommendations.length, 0)
})
test('disabled and platform-incompatible games never appear in either engine', () => {
  for (const e of engines)
    for (const platform of ['desktop', 'mobile']) {
      const r = run(buildScenario('mixed'), e, { platform })
      for (const x of r.recommendations) {
        const g = games.find((g) => g.id === x.gameId)
        assert.ok(g.enabled && g.status === 'active' && g.platforms.includes(platform))
      }
    }
})
test('both engines apply provider diversity for built-in scenarios', () => {
  for (const e of engines)
    for (const scenario of ['cold', 'slots', 'live', 'mixed']) {
      const r = run(buildScenario(scenario), e),
        counts = {}
      for (const x of r.recommendations) {
        const provider = games.find((g) => g.id === x.gameId).product
        counts[provider] = (counts[provider] || 0) + 1
      }
      assert.ok(
        Object.values(counts).every((n) => n <= 3),
        `${e.id} ${scenario}: ${JSON.stringify(counts)}`,
      )
    }
})
test('cold start is explicit; bonus-only and all-disabled favourite scenarios are supported', () => {
  assert.match(run(buildScenario('cold')).summary, /Not enough player history/)
  const p = buildScenario('slots')
  p.favouriteGameIds = []
  p.bets.forEach((b) => {
    b.isBonusBalanceUsed = true
  })
  assert.ok(!run(p).playerProfile.coldStart)
  const c = buildScenario('cold')
  c.favouriteGameIds = ['g31']
  assert.ok(!run(c).recommendations.some((r) => r.gameId === 'g31'))
})
test('comparison receives identical snapshot, platform, seed and date', () => {
  const p = buildScenario('live'),
    a = run(p, v1),
    b = run(p, v2),
    c = compareResults(a, b, games)
  assert.equal(a.inputFingerprint, b.inputFingerprint)
  assert.ok(c.sameSnapshot)
  assert.equal(a.asOf, b.asOf)
  assert.equal(a.seed, b.seed)
  assert.equal(a.platform, b.platform)
  assert.equal(c.uniqueA.length + c.overlap, 10)
})
test('explanation contributions come from ranking and sum to the score', () => {
  for (const e of engines) {
    const r = run(buildScenario('slots'), e)
    for (const x of r.recommendations) {
      close(
        Object.values(x.calculationTrace.contributions).reduce((a, b) => a + b, 0),
        x.score,
      )
      close(x.calculationTrace.selectionScore, x.score - x.components.diversityPenalty)
      assert.ok(x.reasonText.length > 0 && x.reasonText.length <= 3)
    }
  }
})
test('formula groups enforce unit totals and reject invalid numeric parameters', () => {
  assert.equal(validateConfig(v2.parameters, v2.defaultConfig), '')
  assert.match(
    validateConfig(v2.parameters, { ...v2.defaultConfig, categoryWeight: 0.5 }),
    /total 1/,
  )
  assert.throws(() =>
    run(buildScenario('cold'), v2, { config: { ...v2.defaultConfig, halfLife: 0 } }),
  )
})
test('fingerprints are canonical, stable across runs and change when input changes', () => {
  assert.equal(fingerprint({ b: 1, a: 2 }), fingerprint({ a: 2, b: 1 }))
  const p = buildScenario('slots'),
    before = playerFingerprint(p)
  p.recommendationRuns.push(run(p))
  assert.equal(before, playerFingerprint(p))
  p.bets[0].rolledBack = true
  assert.notEqual(before, playerFingerprint(p))
})
test('demo scenarios use fixed seeds and reproduce complete histories', () => {
  for (const id of ['cold', 'slots', 'live', 'mixed'])
    assert.deepEqual(buildScenario(id), buildScenario(id))
})
test('state import validates linked activity, versions, amounts, runs and presets', () => {
  const p = buildScenario('slots')
  p.recommendationRuns = [{ ...run(p), id: 'run-test', createdAt: asOf }]
  const state = {
    schemaVersion: SCHEMA_VERSION,
    players: [p],
    presets: [],
    settings: {
      activeEngine: v2.id,
      compareEngine: v1.id,
      selectedPlayerId: p.id,
      platform: 'desktop',
      asOf,
      seed: '42',
      configs: { [v1.id]: v1.defaultConfig, [v2.id]: v2.defaultConfig },
    },
  }
  assert.deepEqual(validateState(state), state)
  for (const mutation of [
    (s) => {
      s.schemaVersion = 7
    },
    (s) => {
      s.players[0].bets[0].amount = -1
    },
    (s) => {
      s.players[0].wins[0].betId = 'missing'
    },
    (s) => {
      s.players[0].recommendationRuns[0].recommendations[0].calculationTrace = null
    },
    (s) => {
      s.settings.activeEngine = 'unknown'
    },
    (s) => {
      s.players[0].wins.pop()
    },
    (s) => {
      s.settings.configs[v2.id].categoryWeight = 0.7
    },
  ]) {
    const bad = clone(state)
    mutation(bad)
    assert.throws(() => validateState(bad))
  }
})

test('explanations do not invent repeat or recent play for favourite-only and single-round players', () => {
  const p = buildScenario('cold')
  p.favouriteGameIds = ['g01']
  const favourite = run(p).recommendations.find((r) => r.gameId === 'g01')
  assert.ok(favourite.reasonCodes.includes('favourite'))
  assert.ok(!favourite.reasonCodes.includes('engagement'))
  const b = generate({ rounds: 1, sessions: 1, dateTime: '2026-08-10T12:00:00.000Z' })
  p.id = 'test'
  p.bets = b.bets
  p.wins = b.wins
  p.favouriteGameIds = []
  const single = run(p).recommendations.find((r) => r.gameId === 'g01')
  assert.ok(single.reasonText.includes('Demonstrated player interest'))
  assert.ok(!single.reasonText.includes('Played repeatedly and recently'))
})

test('custom formula explanations describe actual weights and skip zero-weight reasons', () => {
  const config = {
    ...v2.defaultConfig,
    familiarAffinity: 0,
    familiarContent: 0,
    familiarPopularity: 1,
    familiarEditorial: 0,
    discoveryContent: 0,
    discoveryPopularity: 1,
    discoveryFreshness: 0,
    discoveryEditorial: 0,
    explorationContent: 0,
    explorationPopularity: 1,
    explorationFreshness: 0,
    explorationEditorial: 0,
  }
  const result = run(buildScenario('slots'), v2, { config })
  for (const r of result.recommendations) {
    assert.equal(r.calculationTrace.formulaText, 'This group combines 100% popularity.')
    assert.ok(
      !r.reasonCodes.some((code) =>
        [
          'favourite',
          'engagement',
          'category',
          'provider',
          'features',
          'freshness',
          'editorial',
        ].includes(code),
      ),
    )
  }
})
