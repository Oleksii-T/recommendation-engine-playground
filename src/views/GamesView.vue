<template>
  <div class="page">
    <div class="page-heading">
      <div>
        <h1>Game catalogue<span class="heading-dot">.</span></h1>
      </div>
    </div>
    <div class="catalogue-stats">
      <div>
        <strong>{{ games.filter((g) => g.enabled && g.status === 'active').length }}</strong
        ><span>Eligible games</span>
      </div>
      <div>
        <strong>{{ providers.length }}</strong
        ><span>Providers</span>
      </div>
      <div>
        <strong>{{ categories.length }}</strong
        ><span>Categories</span>
      </div>
    </div>
    <section class="panel catalogue-panel">
      <div class="catalogue-toolbar">
        <div class="search-field">
          <span>⌕</span
          ><input
            v-model="filters.search"
            aria-label="Search games"
            placeholder="Search game name or code…"
          />
        </div>
        <label class="sort-control"
          >Sort by
          <select v-model="sort" aria-label="Sort games">
            <option value="name">Game name</option>
            <option value="product">Provider</option>
            <option value="category">Category</option>
            <option value="created_at">Release date</option>
            <option value="weekly_session_count">Popularity</option>
          </select></label
        ><button
          class="icon-button"
          :aria-label="descending ? 'Sort ascending' : 'Sort descending'"
          @click="descending = !descending"
        >
          {{ descending ? '↓' : '↑' }}
        </button>
      </div>
      <div class="filter-row">
        <label v-for="f in filterFields" :key="f.key"
          ><span>{{ f.label }}</span
          ><select :aria-label="f.label" v-model="filters[f.key]">
            <option value="">All {{ f.label.toLowerCase() }}</option>
            <option v-for="v in f.values" :key="v" :value="v">{{ v }}</option>
          </select></label
        ><button class="text-button clear-filters" @click="clear">Clear filters</button>
      </div>
      <div class="table-caption">
        <span
          ><strong>{{ filtered.length }}</strong> of {{ games.length }} games</span
        ><span>Choose a game to inspect its metadata <span aria-hidden="true">↗</span></span>
      </div>
      <div class="table-scroll">
        <table class="games-table">
          <thead>
            <tr>
              <th>Game</th>
              <th>Provider</th>
              <th>Category</th>
              <th>Themes</th>
              <th>Features</th>
              <th>Paylines</th>
              <th>Platforms</th>
              <th>Release date</th>
              <th>Weekly popularity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in filtered" :key="g.id" @click="selected = g">
              <td>
                <button class="game-cell" @click.stop="selected = g">
                  <GameCover :game="g" compact /><span
                    ><strong>{{ g.name }}</strong
                    ><small>{{ g.game_code }}</small></span
                  >
                </button>
              </td>
              <td>{{ g.product }}</td>
              <td>{{ g.category }}</td>
              <td>{{ g.themes.join(', ') }}</td>
              <td>{{ g.features.join(', ') }}</td>
              <td>{{ g.paylines || '—' }}</td>
              <td>{{ g.platforms.join(' · ') }}</td>
              <td>{{ g.created_at.slice(0, 10) }}</td>
              <td class="numeric">{{ g.weekly_session_count.toLocaleString() }}</td>
              <td>
                <span class="status-label" :class="g.status"
                  ><i></i>{{ g.enabled && g.status === 'active' ? 'Active' : 'Disabled' }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filtered.length" class="empty-inline">
          No games match these filters.
          <button class="text-button" @click="clear">Clear filters</button>
        </div>
      </div>
    </section>
    <SideDrawer v-if="selected" :title="selected.name" @close="selected = null"
      ><GameCover :game="selected" />
      <p class="muted">{{ selected.product }} · {{ selected.category }}</p>
      <dl class="metadata-list">
        <template v-for="(value, key) in selected" :key="key"
          ><dt>{{ key }}</dt>
          <dd>
            {{ Array.isArray(value) ? value.join(', ') || '—' : String(value) || '—' }}
          </dd></template
        >
      </dl></SideDrawer
    >
  </div>
</template>
<script setup>
import { ref, reactive, computed } from 'vue'
import { games } from '../domain/games/mockGames.js'
import { categories } from '../domain/games/taxonomy.js'
import SideDrawer from '../components/SideDrawer.vue'
import GameCover from '../components/GameCover.vue'
const unique = (key) => [...new Set(games.flatMap((g) => g[key]))].sort()
const providers = unique('product'),
  sort = ref('name'),
  descending = ref(false),
  selected = ref(null)
const filters = reactive({
  search: '',
  product: '',
  category: '',
  status: '',
  platforms: '',
  themes: '',
  features: '',
})
const filterFields = [
  { key: 'product', label: 'Providers', values: providers },
  { key: 'category', label: 'Categories', values: categories },
  { key: 'status', label: 'Status', values: ['active', 'disabled'] },
  { key: 'platforms', label: 'Platforms', values: ['desktop', 'mobile'] },
  { key: 'themes', label: 'Themes', values: unique('themes') },
  { key: 'features', label: 'Features', values: unique('features') },
]
const filtered = computed(() =>
  games
    .filter((g) => {
      if (!`${g.name} ${g.game_code}`.toLowerCase().includes(filters.search.toLowerCase()))
        return false
      return filterFields.every(
        (f) =>
          !filters[f.key] ||
          (Array.isArray(g[f.key])
            ? g[f.key].includes(filters[f.key])
            : g[f.key] === filters[f.key]),
      )
    })
    .sort(
      (a, b) =>
        (typeof a[sort.value] === 'number'
          ? a[sort.value] - b[sort.value]
          : a[sort.value].localeCompare(b[sort.value])) * (descending.value ? -1 : 1),
    ),
)
function clear() {
  Object.keys(filters).forEach((k) => {
    filters[k] = ''
  })
}
</script>
