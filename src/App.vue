<template>
  <div class="app-shell">
    <div v-if="menu" class="nav-scrim" @click="menu = false"></div>
    <aside
      ref="sidebarElement"
      class="sidebar"
      :class="{ open: menu }"
      :inert="compact && !menu ? '' : null"
      :aria-hidden="compact && !menu ? 'true' : undefined"
    >
      <RouterLink to="/players" class="brand" @click="menu = false"
        ><div class="brand-mark"><span></span><span></span><span></span></div>
        <div>playlive<span class="brand-sub">RECOMMENDATION LAB</span></div></RouterLink
      >
      <button
        v-if="compact"
        class="icon-button nav-close"
        aria-label="Close navigation"
        @click="menu = false"
      >
        ✕
      </button>
      <div class="sidebar-engine">
        <label for="engine-version">RECOMMENDATION ENGINE</label
        ><select
          id="engine-version"
          v-model="store.settings.activeEngine"
          @change="store.persist()"
        >
          <option v-for="e in engines" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>
      <nav aria-label="Main navigation">
        <RouterLink
          to="/players"
          :class="{ 'router-link-active': route.name === 'player' }"
          @click="menu = false"
          ><span class="nav-icon">▥</span> Players <span class="nav-arrow">↗</span></RouterLink
        ><RouterLink to="/games" @click="menu = false"
          ><span class="nav-icon">▦</span> Game catalogue
          <span class="nav-count">{{ games.length }}</span></RouterLink
        >
      </nav>
      <div class="local-status">
        <span class="status-dot" :class="{ warning: store.warning }"></span>
        <div>
          <strong>{{
            store.warning ? 'Local storage needs attention' : 'Saved on this device'
          }}</strong
          ><span>Synthetic data only</span>
        </div>
      </div>
    </aside>
    <main class="main-content" :inert="compact && menu ? '' : null">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            ref="menuButton"
            class="icon-button menu-toggle"
            aria-label="Open navigation"
            @click="menu = !menu"
          >
            ☰
          </button>
          <template v-if="route.name === 'player'"
            ><RouterLink to="/players">Players</RouterLink><span aria-hidden="true">/</span
            ><strong>{{
              store.players.find((p) => p.id === route.params.playerId)?.name || 'Player'
            }}</strong></template
          >
          <strong v-else>{{ route.path === '/games' ? 'Game catalogue' : 'Players' }}</strong>
        </div>
        <div class="topbar-actions">
          <button class="text-button" @click="importInput.click()">↥ <span>Import</span></button
          ><button class="button small" @click="exportState">↧ <span>Export JSON</span></button
          ><button class="text-button" @click="confirmReset">Reset</button
          ><input
            ref="importInput"
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Import playground JSON"
            @change="importState"
          />
        </div>
      </header>
      <div v-if="store.warning" class="alert warning-alert" role="alert">
        {{ store.warning }}
        <button class="text-button" @click="exportStored">Export stored file</button>
      </div>
      <div v-if="importError" class="alert error-alert" role="alert">
        {{ importError }} <button class="text-button" @click="importError = ''">Dismiss</button>
      </div>
      <RouterView />
      <div v-if="store.notice" class="toast" role="status">
        <span>✓</span>{{ store.notice
        }}<button class="icon-button" aria-label="Dismiss notification" @click="store.notice = ''">
          ✕
        </button>
      </div>
    </main>
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayground } from './stores/playground.js'
import { engines } from './domain/engines/registry.js'
import { games } from './domain/games/mockGames.js'
import { STORAGE_KEY } from './stores/persistence.js'
const store = usePlayground(),
  route = useRoute(),
  router = useRouter(),
  menu = ref(false),
  importInput = ref(null),
  importError = ref('')
const mediaQuery = window.matchMedia('(max-width: 900px)')
const compact = ref(mediaQuery.matches),
  sidebarElement = ref(null),
  menuButton = ref(null)
function updateViewport(e) {
  compact.value = e.matches
  if (!e.matches) menu.value = false
}
function navigationKey(e) {
  if (!compact.value || !menu.value) return
  if (e.key === 'Escape') {
    menu.value = false
    return
  }
  if (e.key !== 'Tab') return
  const nodes = [...sidebarElement.value.querySelectorAll('a, button, select')].filter(
    (n) => !n.disabled,
  )
  const first = nodes[0],
    last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
onMounted(() => {
  mediaQuery.addEventListener('change', updateViewport)
  document.addEventListener('keydown', navigationKey)
})
onBeforeUnmount(() => {
  mediaQuery.removeEventListener('change', updateViewport)
  document.removeEventListener('keydown', navigationKey)
  clearTimeout(toastTimer)
})
watch(menu, async (open) => {
  await nextTick()
  if (compact.value) {
    if (open) sidebarElement.value.querySelector('a').focus()
    else menuButton.value?.focus()
  }
})
let toastTimer
watch(
  () => store.notice,
  (value) => {
    clearTimeout(toastTimer)
    if (value)
      toastTimer = setTimeout(() => {
        store.notice = ''
      }, 6000)
  },
)
function download(raw, name) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function exportState() {
  download(store.exportJSON(), 'recommendation-playground.json')
  store.notice = 'Complete playground state exported.'
}
function exportStored() {
  try {
    download(localStorage.getItem(STORAGE_KEY) || store.exportJSON(), 'playground-recovery.json')
  } catch (e) {
    importError.value = e.message
  }
}
async function importState(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('Choose a JSON export smaller than 30 MB.')
    const raw = await file.text()
    if (window.confirm('Replace this local workspace with the imported data?')) {
      store.importJSON(raw)
      router.push('/players')
      importError.value = ''
    }
  } catch (error) {
    importError.value = `Import failed: ${error.message}. Your existing workspace is unchanged.`
  } finally {
    e.target.value = ''
  }
}
function confirmReset() {
  if (
    window.confirm(
      'Reset all playground data? All local players, activity, results, and presets will be removed.',
    )
  ) {
    store.resetAll()
    if (route.name === 'player') router.push('/players')
  }
}
</script>
