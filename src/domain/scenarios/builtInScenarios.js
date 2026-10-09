import { games } from '../games/mockGames.js'
import { generateActivity } from '../simulation/activityGenerator.js'
export const scenarios = [
  { id: 'cold', name: 'Cold start', description: 'No history. See the popularity fallback.' },
  {
    id: 'slots',
    name: 'Slot enthusiast',
    description: 'Repeated slot play, free spins, and favourites.',
  },
  {
    id: 'live',
    name: 'Live casino player',
    description: 'Roulette and blackjack across engaged sessions.',
  },
  {
    id: 'mixed',
    name: 'Mixed player',
    description: 'Diverse play with less pronounced preferences.',
  },
]
export const DEMO_AS_OF = '2026-10-09T18:00:00.000Z'
export function buildScenario(id) {
  const scenario = scenarios.find((s) => s.id === id)
  if (!scenario) throw new Error('Unknown scenario.')
  const player = {
    id: `demo-${id}`,
    name: scenario.name,
    createdAt: '2026-10-09T00:00:00.000Z',
    favouriteGameIds: id === 'slots' ? ['g01', 'g02'] : id === 'live' ? ['g17', 'g18'] : [],
    bets: [],
    wins: [],
    generationBatches: [],
    recommendationRuns: [],
  }
  const sets =
    id === 'slots'
      ? ['g01', 'g02', 'g03', 'g09']
      : id === 'live'
      ? ['g17', 'g18', 'g20', 'g21']
      : id === 'mixed'
      ? ['g04', 'g17', 'g27', 'g26', 'g29', 'g23']
      : []
  sets.forEach((gameId, i) => {
    for (let day = 0; day < 3; day++) {
      const date = new Date(Date.parse(DEMO_AS_OF) - (2 + day * 12 + i) * 86400000)
        .toISOString()
        .slice(0, 10)
      const config = {
        rounds: id === 'mixed' ? 16 : 40 + i * 7,
        sessions: 3,
        baseAmount: 25,
        randomness: 20,
        dateTime: `${date}T14:00:00.000Z`,
        playType: day === 2 ? 'bonus' : 'paid',
        seed: `demo:${id}:${i}:${day}`,
      }
      const batch = generateActivity({
        playerId: player.id,
        game: games.find((g) => g.id === gameId),
        config,
        asOf: DEMO_AS_OF,
      })
      player.bets.push(...batch.bets)
      player.wins.push(...batch.wins)
      const metadata = { ...batch }
      delete metadata.bets
      delete metadata.wins
      player.generationBatches.push(metadata)
    }
  })
  return player
}
