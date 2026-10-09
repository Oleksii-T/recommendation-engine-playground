// All calendar-day boundaries and timestamps in the playground use UTC.
export function deriveDailyStats(player, asOf) {
  const groups = new Map(),
    seen = new Set()
  for (const bet of player.bets) {
    if (
      bet.rolledBack ||
      bet.createdAt > asOf ||
      (!bet.isFree && !bet.isBonusBalanceUsed && bet.amount <= 0)
    )
      continue
    const unique = `${bet.gameId}:${bet.token}:${bet.round}`
    if (seen.has(unique)) continue
    seen.add(unique)
    const date = new Date(bet.createdAt).toISOString().slice(0, 10),
      key = `${bet.gameId}:${date}`
    if (!groups.has(key))
      groups.set(key, {
        playerId: player.id,
        gameId: bet.gameId,
        date,
        paidRounds: 0,
        bonusRounds: 0,
        tokens: new Set(),
        lastPlayedAt: bet.createdAt,
      })
    const stat = groups.get(key)
    if (bet.isFree || bet.isBonusBalanceUsed) stat.bonusRounds++
    else stat.paidRounds++
    stat.tokens.add(bet.token)
    if (bet.createdAt > stat.lastPlayedAt) stat.lastPlayedAt = bet.createdAt
  }
  return [...groups.values()]
    .map(({ tokens, ...s }) => ({ ...s, engagedSessions: tokens.size }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId))
}
export function activitySummary(player) {
  const valid = player.bets.filter((b) => !b.rolledBack)
  const ids = new Set(valid.map((b) => b.id))
  return {
    games: new Set(valid.map((b) => b.gameId)).size,
    rounds: valid.length,
    days: new Set(valid.map((b) => b.createdAt.slice(0, 10))).size,
    totalBet: valid.reduce((n, b) => n + b.amount, 0),
    totalWin: player.wins.filter((w) => ids.has(w.betId)).reduce((n, w) => n + w.amount, 0),
    latest: valid
      .map((b) => b.createdAt)
      .sort()
      .pop(),
  }
}
