import { defineStore } from 'pinia'
import { games } from '../domain/games/mockGames.js'
import { engines, getEngine, runEngine } from '../domain/engines/registry.js'
import { validateConfig } from '../domain/engines/shared/config.js'
import { buildScenario, DEMO_AS_OF } from '../domain/scenarios/builtInScenarios.js'
import { loadState, saveState, validateState, SCHEMA_VERSION } from './persistence.js'
const clone = (v) => JSON.parse(JSON.stringify(v))
export function uniqueId() {
  return window.crypto?.randomUUID?.() || `local-${Date.now()}-${uniqueId.counter++}`
}
uniqueId.counter = 0
function initial() {
  return {
    schemaVersion: SCHEMA_VERSION,
    players: [],
    presets: [],
    settings: {
      activeEngine: engines[1].id,
      compareEngine: '',
      selectedPlayerId: null,
      platform: 'desktop',
      asOf: DEMO_AS_OF,
      seed: 'playground-42',
      configs: Object.fromEntries(engines.map((e) => [e.id, clone(e.defaultConfig)])),
    },
  }
}
export const usePlayground = defineStore('playground', {
  state: () => {
    const loaded = loadState()
    return {
      document: loaded.data || initial(),
      warning: loaded.warning,
      notice: '',
      formulaErrors: {},
    }
  },
  getters: {
    players: (s) => s.document.players,
    settings: (s) => s.document.settings,
    presets: (s) => s.document.presets,
    player: (s) => s.document.players.find((p) => p.id === s.document.settings.selectedPlayerId),
    engine: (s) => getEngine(s.document.settings.activeEngine),
  },
  actions: {
    persist() {
      try {
        saveState(this.document)
        if (this.warning.startsWith('Local data could not be saved')) this.warning = ''
      } catch (e) {
        this.warning = `Local data could not be saved (${e.name}). Your session is still available. Export it before closing this tab.`
      }
    },
    createPlayer(name) {
      const cleaned = name.trim()
      if (!cleaned || cleaned.length > 80)
        throw new Error('Player name must contain 1–80 characters.')
      const player = {
        id: uniqueId(),
        name: cleaned,
        createdAt: new Date().toISOString(),
        favouriteGameIds: [],
        bets: [],
        wins: [],
        generationBatches: [],
        recommendationRuns: [],
      }
      this.document.players.push(player)
      this.settings.selectedPlayerId = player.id
      this.persist()
      return player
    },
    renamePlayer(name) {
      if (!name.trim() || name.trim().length > 80)
        throw new Error('Enter a name with 1–80 characters.')
      this.player.name = name.trim()
      this.persist()
    },
    deletePlayer() {
      const id = this.player.id
      this.document.players = this.players.filter((p) => p.id !== id)
      this.settings.selectedPlayerId = this.players[0]?.id || null
      this.persist()
    },
    addBatch(batch) {
      if (!this.player || this.player.id !== batch.playerId)
        throw new Error('Select the player used for this preview.')
      if (this.player.generationBatches.some((b) => b.id === batch.id))
        throw new Error(
          'This exact batch is already in the history. Change the seed or start time to create another.',
        )
      this.player.bets.push(...clone(batch.bets))
      this.player.wins.push(...clone(batch.wins))
      const metadata = clone(batch)
      delete metadata.bets
      delete metadata.wins
      this.player.generationBatches.push(metadata)
      this.persist()
      this.notice = 'Activity batch added.'
    },
    deleteBatch(id) {
      const b = this.player.generationBatches.find((b) => b.id === id)
      this.player.bets = this.player.bets.filter((x) => !b.betIds.includes(x.id))
      this.player.wins = this.player.wins.filter((x) => !b.winIds.includes(x.id))
      this.player.generationBatches = this.player.generationBatches.filter((x) => x.id !== id)
      this.persist()
    },
    correctRound(id, changes) {
      const bet = this.player.bets.find((b) => b.id === id),
        win = this.player.wins.find((w) => w.betId === id)
      if (
        !Number.isFinite(changes.amount) ||
        changes.amount < 0 ||
        !Number.isFinite(changes.winAmount) ||
        changes.winAmount < 0
      )
        throw new Error('Amounts must be zero or positive.')
      if (!Number.isFinite(Date.parse(changes.createdAt)) || changes.createdAt > this.settings.asOf)
        throw new Error('Enter a timestamp on or before the as-of date.')
      if (!['paid', 'bonus', 'free'].includes(changes.playType))
        throw new Error('Choose a valid play type.')
      Object.assign(bet, {
        amount: changes.amount,
        createdAt: changes.createdAt,
        isFree: changes.playType === 'free',
        isBonusBalanceUsed: changes.playType === 'bonus',
        rolledBack: changes.rolledBack,
      })
      Object.assign(win, { amount: changes.winAmount, createdAt: changes.createdAt })
      this.persist()
    },
    run(compare = false) {
      if (!this.player) throw new Error('Create or select a player first.')
      if (this.formulaErrors[this.settings.activeEngine])
        throw new Error(this.formulaErrors[this.settings.activeEngine])
      const args = {
        player: clone(this.player),
        games,
        asOf: this.settings.asOf,
        seed: this.settings.seed,
        platform: this.settings.platform,
      }
      const ids = [this.settings.activeEngine]
      if (compare && this.settings.compareEngine && this.settings.compareEngine !== ids[0])
        ids.push(this.settings.compareEngine)
      const results = ids.map((engineId) => ({
        ...runEngine({
          ...args,
          engineId,
          config: clone(this.settings.configs[engineId] || getEngine(engineId).defaultConfig),
        }),
        id: uniqueId(),
        createdAt: new Date().toISOString(),
      }))
      this.player.recommendationRuns.push(...results)
      this.persist()
      this.notice = compare
        ? 'Both engines ran against the same input snapshot.'
        : 'Recommendation run saved.'
      return results
    },
    loadScenario(id) {
      const fresh = buildScenario(id),
        existing = this.players.find((p) => p.id === fresh.id)
      if (existing) this.settings.selectedPlayerId = existing.id
      else {
        this.document.players.push(fresh)
        this.settings.selectedPlayerId = fresh.id
      }
      this.settings.asOf = DEMO_AS_OF
      this.persist()
      this.notice = `${fresh.name} loaded.`
    },
    savePreset(name) {
      if (!name.trim()) throw new Error('Enter a preset name.')
      const engine = this.engine,
        config = clone(this.settings.configs[engine.id])
      // Validate via the same contract used by runs without creating a recommendation result.
      const error = validateConfig(engine.parameters, config)
      if (error) throw new Error(error)
      this.document.presets.push({
        id: uniqueId(),
        name: name.trim().slice(0, 80),
        engineId: engine.id,
        config,
      })
      this.persist()
      this.notice = 'Formula preset saved.'
    },
    exportJSON() {
      return JSON.stringify(this.document, null, 2)
    },
    importJSON(raw) {
      const validated = validateState(JSON.parse(raw))
      this.document = validated
      this.formulaErrors = {}
      this.warning = ''
      this.persist()
      this.notice = 'Playground data imported.'
    },
    resetPlayer() {
      Object.assign(this.player, {
        favouriteGameIds: [],
        bets: [],
        wins: [],
        generationBatches: [],
        recommendationRuns: [],
      })
      this.persist()
      this.notice = 'Player simulation reset.'
    },
    resetAll() {
      this.document = initial()
      this.formulaErrors = {}
      this.warning = ''
      this.persist()
      this.notice = 'All playground data reset.'
    },
  },
})
