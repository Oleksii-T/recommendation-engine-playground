import v1 from './v1PopularityEngine.js'
import v2 from './v2HybridEngine.js'
import { validateConfig } from './shared/config.js'
import { deriveDailyStats } from '../simulation/dailyStats.js'
import { playerSnapshot, playerFingerprint, fingerprint } from '../simulation/fingerprint.js'
export const engines = [v1, v2]
export const getEngine = (id) => engines.find((e) => e.id === id)
export function runEngine({ engineId, player, games, asOf, seed, platform, config }) {
  const engine = getEngine(engineId)
  if (!engine) throw new Error('Unknown recommendation engine.')
  const resolved = { ...engine.defaultConfig, ...config }
  const error = validateConfig(engine.parameters, resolved)
  if (error) throw new Error(error)
  if (
    !['desktop', 'mobile'].includes(platform) ||
    !Number.isFinite(Date.parse(asOf)) ||
    !String(seed).trim()
  )
    throw new Error('Choose a valid platform, as-of date, and seed.')
  const snapshot = playerSnapshot(player),
    normalizedAsOf = new Date(asOf).toISOString()
  const dailyStats = deriveDailyStats(snapshot, normalizedAsOf)
  const inputFingerprint = fingerprint({
    player: snapshot,
    games,
    asOf: normalizedAsOf,
    seed,
    platform,
  })
  const result = engine.run({
    player: snapshot,
    games,
    dailyStats,
    asOf: normalizedAsOf,
    seed,
    platform,
    config: resolved,
  })
  return {
    ...result,
    playerId: player.id,
    playerName: player.name,
    engineId,
    engineVersion: engine.version,
    engineConfig: resolved,
    asOf: normalizedAsOf,
    seed,
    platform,
    inputFingerprint,
    playerFingerprint: playerFingerprint(player),
    dailyStats,
    inputSnapshot: { player: snapshot, gameIds: games.map((g) => g.id) },
  }
}
export function compareResults(a, b, games) {
  const shared = a.recommendations.filter((r) =>
    b.recommendations.some((s) => s.gameId === r.gameId),
  )
  const metrics = (run) => {
    const selected = run.recommendations.map((r) => games.find((g) => g.id === r.gameId))
    return {
      providers: new Set(selected.map((g) => g.product)).size,
      categories: new Set(selected.map((g) => g.category)).size,
      popularity: selected.length
        ? selected.reduce((n, g) => n + g.weekly_session_count, 0) / selected.length
        : 0,
      contentMatch:
        run.engineId === v1.id
          ? null
          : run.recommendations.reduce((n, r) => n + r.components.contentMatch, 0) /
            Math.max(1, selected.length),
      distribution: Object.fromEntries(
        ['familiar', 'discovery', 'exploration', 'fallback', 'baseline'].map((p) => [
          p,
          run.recommendations.filter((r) => r.pool === p).length,
        ]),
      ),
    }
  }
  return {
    overlap: shared.length,
    percentage: Math.round((shared.length / Math.max(1, a.recommendations.length)) * 100),
    uniqueA: a.recommendations
      .filter((r) => !shared.some((s) => s.gameId === r.gameId))
      .map((r) => r.gameId),
    uniqueB: b.recommendations
      .filter((r) => !shared.some((s) => s.gameId === r.gameId))
      .map((r) => r.gameId),
    rankChanges: shared.map((r) => ({
      gameId: r.gameId,
      rankA: r.rank,
      rankB: b.recommendations.find((s) => s.gameId === r.gameId).rank,
    })),
    a: metrics(a),
    b: metrics(b),
    sameSnapshot: a.inputFingerprint === b.inputFingerprint,
  }
}
