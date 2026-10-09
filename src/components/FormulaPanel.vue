<template>
  <details class="formula-panel">
    <summary><span>⚙</span> Advanced formula</summary>
    <div class="formula-body">
      <div class="section-toolbar">
        <p class="muted">Scoring groups must total 1.</p>
        <button class="text-button" @click="restore">Restore defaults</button>
      </div>
      <div v-for="group in groups" :key="group" class="formula-group">
        <h4>{{ group }}</h4>
        <div class="formula-fields">
          <div
            v-for="f in store.engine.parameters.filter((f) => f.group === group)"
            :key="f.key"
            class="formula-field"
          >
            <div class="formula-label">
              <label :for="`formula-${f.key}`">{{ f.label }}</label>
              <button
                type="button"
                class="formula-info-button"
                :aria-label="`About ${f.group}: ${f.label}`"
                aria-haspopup="dialog"
                @click="explain(f)"
              >
                <span aria-hidden="true">i</span>
              </button>
            </div>
            <input
              :id="`formula-${f.key}`"
              :value="config[f.key]"
              type="number"
              :min="f.min"
              :max="f.max"
              :step="f.step"
              @input="update(f.key, $event.target.value)"
            />
          </div>
        </div>
      </div>
      <p v-if="validation" class="error-text" role="alert">{{ validation }}</p>
      <div class="preset-row">
        <div class="preset-field">
          <div class="formula-label">
            <label for="formula-saved-presets">Saved presets</label>
            <button
              type="button"
              class="formula-info-button"
              aria-label="About Saved presets"
              aria-haspopup="dialog"
              @click="explainPreset('savedPresets')"
            >
              <span aria-hidden="true">i</span>
            </button>
          </div>
          <select
            id="formula-saved-presets"
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
          </select>
        </div>
        <div class="preset-field">
          <div class="formula-label">
            <label for="formula-preset-name">Preset name</label>
            <button
              type="button"
              class="formula-info-button"
              aria-label="About Preset name"
              aria-haspopup="dialog"
              @click="explainPreset('presetName')"
            >
              <span aria-hidden="true">i</span>
            </button>
          </div>
          <input
            id="formula-preset-name"
            v-model="name"
            placeholder="e.g. Discovery focused"
            maxlength="80"
          />
        </div>
        <button class="button" :disabled="!!validation || !name.trim()" @click="save">
          Save preset
        </button>
      </div>
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
    </div>
  </details>
  <ModalDialog v-if="help" :title="help.title" class="formula-legend" @close="help = null">
    <p>{{ help.description }}</p>
    <div class="formula-example">
      <h3>Example</h3>
      <p>{{ help.example }}</p>
    </div>
    <p class="formula-help-note">{{ help.note }}</p>
    <dl v-if="help.default !== undefined" class="formula-help-limits">
      <div>
        <dt>Default</dt>
        <dd>{{ help.default }}</dd>
      </div>
      <div>
        <dt>Allowed range</dt>
        <dd>{{ help.min }}–{{ help.max }}</dd>
      </div>
    </dl>
  </ModalDialog>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { usePlayground } from '../stores/playground.js'
import { validateConfig } from '../domain/engines/shared/config.js'
import { formulaHelp } from '../content/formulaHelp.js'
import ModalDialog from './ModalDialog.vue'
const store = usePlayground(),
  name = ref(''),
  error = ref(''),
  help = ref(null)
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
function explain(field) {
  help.value = { ...field, ...formulaHelp(field), title: `${field.group} · ${field.label}` }
}
function explainPreset(key) {
  help.value =
    key === 'savedPresets'
      ? {
          title: 'Saved presets',
          description:
            'Applies a saved set of formula values for the selected engine. Use it to reuse a setup without entering every value again.',
          example:
            'Save a configuration called “Longer memory” with a 60-day half-life. Selecting it later restores that half-life and all the other saved formula values.',
          note: 'Applying a preset changes the next simulation’s settings. Existing simulation results keep their original settings.',
        }
      : {
          title: 'Preset name',
          description:
            'A label for saving the current formula values. The name helps you recognise the setup; it does not influence scoring.',
          example:
            'Enter “More variety” after increasing the similarity penalty, then click Save preset to reuse that setup later.',
          note: 'The formula must be valid before it can be saved. A preset belongs to the currently selected engine.',
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
