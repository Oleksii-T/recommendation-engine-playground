import { seededRandom, money } from './seededRandom.js'
import { fingerprint } from './fingerprint.js'
export const outcomeBuckets = [
  { name: 'Losing', threshold: 0.6, min: 0, max: 0.8 },
  { name: 'Near break-even', threshold: 0.85, min: 0.8, max: 1.2 },
  { name: 'Moderate win', threshold: 0.98, min: 1.2, max: 3 },
  { name: 'Large win', threshold: 1, min: 3, max: 10 },
]
export function generateOutcome(bet, random) {
  const choice = random()
  const bucket = outcomeBuckets.find((b) => choice < b.threshold) || outcomeBuckets[3]
  return {
    amount: money(bet * (bucket.min + random() * (bucket.max - bucket.min))),
    bucket: bucket.name,
  }
}
export function validateBatch(config, asOf) {
  const { rounds, sessions, baseAmount, randomness, dateTime, playType, seed } = config
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 1000)
    throw new Error('Rounds must be between 1 and 1,000.')
  if (!Number.isInteger(sessions) || sessions < 1 || sessions > 50 || sessions > rounds)
    throw new Error('Sessions must be 1–50 and no greater than rounds.')
  if (!Number.isFinite(baseAmount) || baseAmount <= 0 || baseAmount > 100000000)
    throw new Error('Base bet must be positive and at most 100,000,000.')
  if (!Number.isFinite(randomness) || randomness < 0 || randomness > 100)
    throw new Error('Randomness must be between 0 and 100%.')
  if (!['paid', 'bonus', 'free'].includes(playType)) throw new Error('Choose a valid play type.')
  if (!String(seed).trim()) throw new Error('Enter a random seed.')
  if (!Number.isFinite(Date.parse(dateTime)) || !Number.isFinite(Date.parse(asOf)))
    throw new Error('Enter a valid UTC date and time.')
  if (Date.parse(dateTime) > Date.parse(asOf))
    throw new Error('Activity cannot be after the simulation as-of date.')
}
export function generateActivity({ playerId, game, config, asOf }) {
  validateBatch(config, asOf)
  if (!game) throw new Error('Choose a game.')
  const random = seededRandom(config.seed)
  const id = `batch-${fingerprint({ playerId, gameId: game.id, config })}`
  const bets = [],
    wins = []
  const start = Date.parse(config.dateTime)
  let session = -1,
    timestamp = start
  for (let i = 0; i < config.rounds; i++) {
    const nextSession = Math.floor((i * config.sessions) / config.rounds)
    if (i) timestamp += nextSession !== session ? 5 * 60000 : 5000 + Math.floor(random() * 10000)
    session = nextSession
    const amount = money(
      config.baseAmount * (1 - config.randomness / 100 + (random() * 2 * config.randomness) / 100),
    )
    const createdAt = new Date(timestamp).toISOString()
    const token = `${id}-session-${session + 1}`,
      round = `${id}-round-${i + 1}`
    const betId = `${id}-bet-${i + 1}`
    bets.push({
      id: betId,
      playerId,
      gameId: game.id,
      externalGameId: game.game_id,
      token,
      round,
      amount,
      isFree: config.playType === 'free',
      isBonusBalanceUsed: config.playType === 'bonus',
      rolledBack: false,
      createdAt,
    })
    const outcome = generateOutcome(amount, random)
    wins.push({
      id: `${id}-win-${i + 1}`,
      playerId,
      gameId: game.id,
      betId,
      token,
      round,
      amount: outcome.amount,
      createdAt,
      outcomeBucket: outcome.bucket,
    })
  }
  if (timestamp > Date.parse(asOf))
    throw new Error(
      'The generated batch would finish after the as-of date. Choose an earlier start time.',
    )
  const totalBet = money(bets.reduce((sum, b) => sum + b.amount, 0)),
    totalWin = money(wins.reduce((sum, w) => sum + w.amount, 0))
  return {
    id,
    playerId,
    gameId: game.id,
    config: { ...config },
    bets,
    wins,
    betIds: bets.map((b) => b.id),
    winIds: wins.map((w) => w.id),
    summary: {
      rounds: config.rounds,
      sessions: config.sessions,
      minimum: Math.min(...bets.map((b) => b.amount)),
      maximum: Math.max(...bets.map((b) => b.amount)),
      totalBet,
      totalWin,
      net: money(totalWin - totalBet),
      earliest: bets[0].createdAt,
      latest: bets[bets.length - 1].createdAt,
    },
  }
}
