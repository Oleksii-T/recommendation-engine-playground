<template>
  <details class="formula-panel">
    <summary>
      <span>⚙</span> Advanced formula <span class="muted">Weights, recency & local presets</span>
    </summary>
    <div class="formula-body">
      <div class="section-toolbar">
        <p class="muted">
          Parameters belong to {{ store.engine.name }}. Scoring groups must total 1.
        </p>
        <button class="text-button" @click="restore">Restore defaults</button>
      </div>
      <div v-for="group in groups" :key="group" class="formula-group">
        <h4>{{ group }}</h4>
        <div class="formula-fields">
          <label
            v-for="f in store.engine.parameters.filter((f) => f.group === group)"
            :key="f.key"
            :title="f.description"
            >{{ f.label
            }}<input
              :value="config[f.key]"
              type="number"
              :min="f.min"
              :max="f.max"
              :step="f.step"
              @input="update(f.key, $event.target.value)"
          /></label>
        </div>
      </div>
      <p v-if="validation" class="error-text" role="alert">{{ validation }}</p>
      <div class="preset-row">
        <label
          >Saved presets<select
            aria-label="Saved presets"
            @change="applyPreset($event.target.value)"
          >
            <option value="">Choose a preset…</option>
            <option
              v-for="p in store.presets.filter((p) => p.engineId === store.engine.id)"
              :key="p.id"
              :value="p.id"
            >
              {{ p.name }}
            </option>
          </select></label
        ><label
          >Preset name<input
            v-model="name"
            placeholder="e.g. Discovery focused"
            maxlength="80" /></label
        ><button class="button" :disabled="!!validation || !name.trim()" @click="save">
          Save preset
        </button>
      </div>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    </div>
  </details>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { usePlayground } from '../stores/playground.js'
import { validateConfig } from '../domain/engines/shared/config.js'
const store = usePlayground(),
  name = ref(''),
  error = ref('')
const config = ref({ ...store.settings.configs[store.engine.id] }),
  groups = computed(() => [...new Set(store.engine.parameters.map((f) => f.group))]),
  validation = computed(() => validateConfig(store.engine.parameters, config.value))
watch(
  () => store.settings.configs[store.engine.id],
  (value) => {
    config.value = { ...value }
    store.formulaErrors = {}
  },
)
watch(
  validation,
  (value) => {
    store.formulaErrors[store.engine.id] = value
  },
  { flush: 'sync' },
)
onBeforeUnmount(() => {
  store.formulaErrors = {}
})
function update(key, value) {
  config.value[key] = value === '' ? null : Number(value)
  if (!validation.value) {
    store.settings.configs[store.engine.id] = { ...config.value }
    store.persist()
  }
}
function restore() {
  store.settings.configs[store.engine.id] = { ...store.engine.defaultConfig }
  store.persist()
}
function applyPreset(id) {
  const p = store.presets.find((p) => p.id === id)
  if (p) {
    store.settings.configs[p.engineId] = { ...p.config }
    store.persist()
    store.notice = `Preset “${p.name}” applied.`
  }
}
function save() {
  try {
    store.savePreset(name.value)
    name.value = ''
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}
</script>
