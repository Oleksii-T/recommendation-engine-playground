<template>
  <section class="results-section" aria-label="Recommendation results">
    <div class="results-heading">
      <div class="section-title-inline">
        <span class="section-number">04</span>
        <div>
          <h2>Recommendation results</h2>
        </div>
      </div>
      <span v-if="run" class="pill neutral">{{ run.recommendations.length }} recommendations</span>
    </div>
    <div v-if="!run" class="panel result-empty">
      <div class="empty-symbol">✦</div>
      <h3>No recommendation results</h3>
      <p>
        Choose a player and run a recommendation.<br />A player without history works too — try a
        cold start.
      </p>
    </div>
    <template v-else>
      <div class="panel result-overview">
        <div class="result-run-title">
          <div>
            <span class="eyebrow">{{ run.playerName }}</span>
            <h3>
              {{ getEngine(run.engineId)?.name }}
              <span class="version-inline">v{{ run.engineVersion }}</span>
            </h3>
          </div>
          <span class="pill" :class="stale ? 'amber-pill' : 'green-pill'">{{
            stale ? 'Based on an older player state' : 'Current player state'
          }}</span>
        </div>
        <p class="result-explanation">{{ run.summary }}</p>
        <div class="run-meta">
          <span>◷ {{ formatDate(run.asOf) }} UTC</span><span>{{ run.platform }}</span
          ><span>Seed: {{ run.seed }}</span
          ><span
            >{{ run.dailyStats.reduce((n, s) => n + s.paidRounds + s.bonusRounds, 0) }} valid
            rounds</span
          ><span class="fingerprint">Snapshot {{ run.inputFingerprint.slice(0, 8) }}</span>
        </div>
        <details class="technical-note">
          <summary>Saved run configuration</summary>
          <dl class="metadata-list">
            <dt>Engine</dt>
            <dd>{{ run.engineId }} / {{ run.engineVersion }}</dd>
            <dt>Input fingerprint</dt>
            <dd>{{ run.inputFingerprint }}</dd>
            <dt>Configuration</dt>
            <dd>
              <pre>{{ JSON.stringify(run.engineConfig, null, 2) }}</pre>
            </dd>
          </dl>
        </details>
      </div>
      <div v-if="hasProfile" class="panel taste-panel">
        <div class="section-toolbar">
          <div>
            <h3>Player taste profile</h3>
          </div>
          <button class="text-button" @click="showProfile = true">View all preferences ↗</button>
        </div>
        <div class="taste-grid">
          <div v-for="group in preferenceGroups" :key="group.key" class="taste-group">
            <h4>{{ group.label }}</h4>
            <div
              v-for="[label, value] in Object.entries(
                run.playerProfile.preferences[group.key] || {},
              ).slice(0, 3)"
              :key="label"
              class="preference"
            >
              <div>
                <span>{{ label }}</span
                ><strong>{{ pct(value) }}%</strong>
              </div>
              <div class="bar-track"><div :style="{ width: pct(value) + '%' }"></div></div>
            </div>
            <p
              v-if="!Object.keys(run.playerProfile.preferences[group.key] || {}).length"
              class="muted small-text"
            >
              No signal yet
            </p>
          </div>
        </div>
      </div>
      <div
        v-if="
          run.recommendations.some((r) => r.pool === 'fallback') && !run.playerProfile.coldStart
        "
        class="alert warning-alert"
      >
        A pool had too few candidates. Next-best eligible games filled
        {{ run.recommendations.filter((r) => r.pool === 'fallback').length }} places.
      </div>
      <div v-for="group in resultGroups" :key="group.pool" class="recommendation-group">
        <div class="pool-heading">
          <span class="pool-dot" :class="group.pool"></span>
          <h3>
            {{ group.label }} <span>· {{ group.items.length }}</span>
          </h3>
        </div>
        <div class="recommendation-grid">
          <article v-for="r in group.items" :key="r.gameId" class="recommendation-card">
            <div class="card-cover">
              <GameCover :game="gameById(r.gameId)" /><span class="rank-badge">{{
                String(r.rank).padStart(2, '0')
              }}</span
              ><span class="card-pool">{{ poolNames[r.pool] }}</span>
            </div>
            <div class="card-body">
              <h4>{{ gameById(r.gameId).name }}</h4>
              <p class="card-provider">
                {{ gameById(r.gameId).product }} <span>· {{ gameById(r.gameId).category }}</span>
              </p>
              <div class="card-score">
                <span>Recommendation score</span><strong>{{ pct(r.score) }}<small>%</small></strong>
              </div>
              <div class="bar-track score-track">
                <div :style="{ width: pct(r.score) + '%' }"></div>
              </div>
              <div class="reason-chips">
                <span v-for="reason in r.reasonText.slice(0, 3)" :key="reason">{{ reason }}</span>
              </div>
              <button class="why-button" @click="openWhy(r, run)">
                Why this game? <span>↗</span>
              </button>
            </div>
          </article>
        </div>
      </div>
      <details class="panel calculation-panel">
        <summary>
          Calculation details <span class="muted">Derived daily statistics · UTC</span>
        </summary>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Date (UTC)</th>
                <th>Paid rounds</th>
                <th>Bonus / free</th>
                <th>Engaged sessions</th>
                <th>Last played (UTC)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in run.dailyStats" :key="`${s.gameId}:${s.date}`">
                <td>{{ gameById(s.gameId)?.name }}</td>
                <td>{{ s.date }}</td>
                <td>{{ s.paidRounds }}</td>
                <td>{{ s.bonusRounds }}</td>
                <td>{{ s.engagedSessions }}</td>
                <td>{{ formatDate(s.lastPlayedAt) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="!run.dailyStats.length" class="empty-inline">
            No valid activity on or before this as-of date.
          </p>
        </div>
        <p class="footnote calculation-footnote">
          Rolled-back rounds are excluded. Unique session token + round pairs prevent double
          counting. Today has full importance; 30 days ago has half (using the default formula).
        </p>
      </details>
      <section v-if="comparison" class="panel comparison-panel" aria-label="Version comparison">
        <div class="section-toolbar">
          <div>
            <h3>Engine comparison</h3>
          </div>
          <span class="pill" :class="comparison.sameSnapshot ? 'green-pill' : 'amber-pill'">{{
            comparison.sameSnapshot ? 'Identical inputs verified' : 'Different snapshots'
          }}</span>
        </div>
        <p class="muted">
          Both engines selected {{ comparison.overlap }} of the same games.
          {{ getEngine(run.engineId).name }} uses {{ comparison.a.providers }} providers;
          {{ getEngine(compareRun.engineId).name }} uses {{ comparison.b.providers }}.
        </p>
        <div class="comparison-metrics">
          <div>
            <small>SHARED GAMES</small
            ><strong
              >{{ comparison.overlap }}
              <span>/ {{ run.recommendations.length }} · {{ comparison.percentage }}%</span></strong
            >
          </div>
          <div>
            <small>UNIQUE TO PRIMARY</small><strong>{{ comparison.uniqueA.length }}</strong>
          </div>
          <div>
            <small>UNIQUE TO COMPARISON</small><strong>{{ comparison.uniqueB.length }}</strong>
          </div>
        </div>
        <div class="table-scroll">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>{{ getEngine(run.engineId).label }}</th>
                <th>{{ getEngine(compareRun.engineId).label }}</th>
                <th>Primary rank change</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="i in Math.max(run.recommendations.length, compareRun.recommendations.length)"
                :key="i"
              >
                <td>{{ String(i).padStart(2, '0') }}</td>
                <td>
                  <button
                    v-if="run.recommendations[i - 1]"
                    class="comparison-game"
                    @click="openWhy(run.recommendations[i - 1], run)"
                  >
                    <GameCover :game="gameById(run.recommendations[i - 1].gameId)" compact /><span
                      ><strong>{{ gameById(run.recommendations[i - 1].gameId).name }}</strong
                      ><small
                        >{{ gameById(run.recommendations[i - 1].gameId).product }} ·
                        {{ poolNames[run.recommendations[i - 1].pool] }}</small
                      ></span
                    >
                  </button>
                </td>
                <td>
                  <button
                    v-if="compareRun.recommendations[i - 1]"
                    class="comparison-game"
                    @click="openWhy(compareRun.recommendations[i - 1], compareRun)"
                  >
                    <GameCover
                      :game="gameById(compareRun.recommendations[i - 1].gameId)"
                      compact
                    /><span
                      ><strong>{{ gameById(compareRun.recommendations[i - 1].gameId).name }}</strong
                      ><small
                        >{{ gameById(compareRun.recommendations[i - 1].gameId).product }} ·
                        {{ poolNames[compareRun.recommendations[i - 1].pool] }}</small
                      ></span
                    >
                  </button>
                </td>
                <td>{{ difference(run.recommendations[i - 1]) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Selection metric</th>
                <th>Primary</th>
                <th>Comparison</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Providers</td>
                <td>{{ comparison.a.providers }}</td>
                <td>{{ comparison.b.providers }}</td>
              </tr>
              <tr>
                <td>Categories</td>
                <td>{{ comparison.a.categories }}</td>
                <td>{{ comparison.b.categories }}</td>
              </tr>
              <tr>
                <td>Average weekly popularity</td>
                <td>{{ Math.round(comparison.a.popularity).toLocaleString() }}</td>
                <td>{{ Math.round(comparison.b.popularity).toLocaleString() }}</td>
              </tr>
              <tr>
                <td>Average content match</td>
                <td>
                  {{
                    comparison.a.contentMatch === null
                      ? 'Not used'
                      : pct(comparison.a.contentMatch) + '%'
                  }}
                </td>
                <td>
                  {{
                    comparison.b.contentMatch === null
                      ? 'Not used'
                      : pct(comparison.b.contentMatch) + '%'
                  }}
                </td>
              </tr>
              <tr>
                <td>Familiar / Discovery / Explore / Fallback</td>
                <td>{{ distribution(comparison.a) }}</td>
                <td>{{ distribution(comparison.b) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="footnote">
          These results compare engine behaviour. They do not measure production performance or
          imply one engine is better.
        </p>
      </section>
    </template>
    <SideDrawer v-if="why" :title="`Why ${gameById(why.item.gameId).name}?`" @close="why = null"
      ><GameCover :game="gameById(why.item.gameId)" />
      <div class="drawer-game-meta">
        <span class="pill">{{ poolNames[why.item.pool] }}</span
        ><span>{{ getEngine(why.run.engineId).label }}</span>
      </div>
      <p class="drawer-explanation">{{ why.item.calculationTrace.explanation }}</p>
      <h3>What contributed to this score</h3>
      <p class="muted small-text">
        Weighted contributions to the {{ pct(why.item.score) }}% recommendation score. A score
        expresses fit, not a probability of play.
      </p>
      <div
        v-for="[key, value] in Object.entries(why.item.calculationTrace.contributions)"
        :key="key"
        class="preference contribution"
      >
        <div>
          <span>{{ componentLabels[key] || key }}</span
          ><strong>{{ (value * 100).toFixed(1) }} pts</strong>
        </div>
        <div class="bar-track">
          <div :style="{ width: Math.min(100, value * 100) + '%' }"></div>
        </div>
      </div>
      <div class="plain-formula">
        <h4>How this group is ranked</h4>
        <p>{{ why.item.calculationTrace.formulaText }}</p>
        <p class="muted small-text">
          Similarity penalty:
          {{ (why.item.components.diversityPenalty * 100).toFixed(1) }} points.
        </p>
      </div>
      <h3>Eligibility check</h3>
      <ul class="eligibility-list">
        <li>
          ✓ {{ why.item.calculationTrace.eligibility.status }} and
          {{ why.item.calculationTrace.eligibility.enabled ? 'enabled' : 'disabled' }}
        </li>
        <li>✓ Compatible with {{ why.run.platform }}</li>
      </ul>
      <details class="technical-note">
        <summary>Technical calculation</summary>
        <pre>{{
          JSON.stringify(
            { components: why.item.components, calculationTrace: why.item.calculationTrace },
            null,
            2,
          )
        }}</pre>
      </details></SideDrawer
    >
    <SideDrawer v-if="showProfile" title="All player preferences" @close="showProfile = false"
      ><p class="muted">
        Interest shares from recency-weighted engagement and favourites. Themes and features may
        overlap and need not total 100%.
      </p>
      <div v-for="group in preferenceGroups" :key="group.key" class="profile-detail">
        <h3>{{ group.label }}</h3>
        <div
          v-for="[label, value] in Object.entries(run.playerProfile.preferences[group.key] || {})"
          :key="label"
          class="preference"
        >
          <div>
            <span>{{ label }}</span
            ><strong>{{ pct(value) }}%</strong>
          </div>
          <div class="bar-track"><div :style="{ width: pct(value) + '%' }"></div></div>
        </div></div
    ></SideDrawer>
  </section>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed, ref } from 'vue'
import GameCover from './GameCover.vue'
import SideDrawer from './SideDrawer.vue'
import { games, gameById } from '../domain/games/mockGames.js'
import { getEngine, compareResults } from '../domain/engines/registry.js'
import { componentLabels } from '../domain/engines/shared/explainability.js'
const props = defineProps({ run: Object, compareRun: Object, stale: Boolean })
const why = ref(null),
  showProfile = ref(false)
const pct = (n) => Math.round(n * 100),
  formatDate = (d) => d.slice(0, 16).replace('T', ' ')
const poolNames = {
  familiar: 'Familiar',
  discovery: 'Discovery',
  exploration: 'Explore',
  fallback: 'Fallback',
  baseline: 'Popular selection',
}
const preferenceGroups = [
  { key: 'categories', label: 'Categories' },
  { key: 'providers', label: 'Providers' },
  { key: 'themes', label: 'Themes' },
  { key: 'features', label: 'Features' },
  { key: 'paylines', label: 'Paylines' },
]
const hasProfile = computed(
  () => props.run && Object.keys(props.run.playerProfile.preferences.categories || {}).length,
)
const resultGroups = computed(() =>
  [
    { pool: 'familiar', label: 'Familiar' },
    {
      pool: 'discovery',
      label: 'Discovery',
    },
    { pool: 'exploration', label: 'Explore' },
    {
      pool: 'fallback',
      label: props.run?.playerProfile.coldStart
        ? 'Popular starting points'
        : 'Eligible alternatives',
    },
    {
      pool: 'baseline',
      label: 'Popular selection',
    },
  ]
    .map((g) => ({
      ...g,
      items: props.run?.recommendations.filter((r) => r.pool === g.pool) || [],
    }))
    .filter((g) => g.items.length),
)
const comparison = computed(() =>
  props.run && props.compareRun ? compareResults(props.run, props.compareRun, games) : null,
)
function difference(r) {
  if (!r) return '—'
  const other = props.compareRun.recommendations.find((s) => s.gameId === r.gameId)
  if (!other) return 'Unique to primary'
  const delta = other.rank - r.rank
  return delta === 0 ? 'Same rank' : delta > 0 ? `↑ ${delta} places` : `↓ ${-delta} places`
}
const distribution = (metrics) =>
  metrics.distribution.baseline
    ? 'Popularity baseline'
    : ['familiar', 'discovery', 'exploration', 'fallback']
        .map((k) => metrics.distribution[k])
        .join(' / ')
function openWhy(item, run) {
  why.value = { item, run }
}
</script>
