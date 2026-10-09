<template>
  <section class="panel run-panel">
    <div class="section-heading">
      <div>
        <h2>Run configuration</h2>
        <p>{{ store.engine.shortDescription }}</p>
      </div>
      <span class="pill">{{ store.engine.version }}</span>
    </div>
    <div class="section-body">
      <div class="form-grid run-form">
        <label
          >Simulated platform<select
            aria-label="Simulated platform"
            v-model="store.settings.platform"
            @change="store.persist()"
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select></label
        ><label
          >As-of date & time (UTC)<input
            :value="store.settings.asOf.slice(0, 16)"
            type="datetime-local"
            required
            @change="changeDate($event.target.value)" /></label
        ><label
          >Run seed<input
            v-model="store.settings.seed"
            maxlength="1000"
            required
            @change="store.persist()" /></label
        ><label
          >Compare with<select
            aria-label="Compare with"
            v-model="store.settings.compareEngine"
            @change="store.persist()"
          >
            <option value="">No comparison</option>
            <option
              v-for="e in engines.filter((e) => e.id !== store.engine.id)"
              :key="e.id"
              :value="e.id"
            >
              {{ e.label }}
            </option>
          </select></label
        >
      </div>
      <FormulaPanel />
      <p v-if="formulaError" class="error-text" role="alert">{{ formulaError }}</p>
      <p v-if="runError" class="error-text" role="alert">{{ runError }}</p>
      <div class="form-footer">
        <div class="run-engine-label">
          <span class="status-dot"></span
          ><span
            ><strong>{{ store.engine.label }}</strong></span
          >
        </div>
        <div class="button-group">
          <button
            v-if="store.settings.compareEngine && store.settings.compareEngine !== store.engine.id"
            class="button"
            :disabled="!canRun"
            @click="execute(true)"
          >
            Run and compare</button
          ><button class="button primary" :disabled="!canRun" @click="execute(false)">
            Run recommendation <span>→</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { computed, ref, watch } from 'vue'
import { usePlayground } from '../stores/playground.js'
import { engines } from '../domain/engines/registry.js'
import { validateConfig } from '../domain/engines/shared/config.js'
import FormulaPanel from './FormulaPanel.vue'
const emit = defineEmits(['run']),
  store = usePlayground(),
  runError = ref('')
const formulaError = computed(
  () =>
    store.formulaErrors[store.engine.id] ||
    validateConfig(store.engine.parameters, store.settings.configs[store.engine.id]),
)
const canRun = computed(() => !!store.player && !formulaError.value && !!store.settings.seed.trim())
watch(
  () => store.engine.id,
  (id) => {
    if (store.settings.compareEngine === id) {
      store.settings.compareEngine = ''
      store.persist()
    }
  },
)
function changeDate(value) {
  try {
    store.settings.asOf = new Date(`${value}Z`).toISOString()
    store.persist()
    runError.value = ''
  } catch {
    runError.value = 'Enter a valid UTC as-of date.'
  }
}
function execute(compare) {
  try {
    const results = store.run(compare)
    runError.value = ''
    emit('run', results)
  } catch (e) {
    runError.value = e.message
  }
}
</script>
