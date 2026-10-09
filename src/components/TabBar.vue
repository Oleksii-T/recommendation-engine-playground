<template>
  <div class="tab-bar" :class="{ 'run-tabs': secondary }" role="tablist" :aria-label="label">
    <button
      v-for="tab in tabs"
      :id="`${prefix}-tab-${tab.id}`"
      :key="tab.id"
      role="tab"
      type="button"
      :aria-selected="tab.id === active"
      :aria-controls="`${prefix}-panel`"
      :tabindex="tab.id === active ? 0 : -1"
      :class="{ selected: tab.id === active }"
      @click="$emit('select', tab.id)"
      @keydown="move($event, tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
const props = defineProps({
  tabs: Array,
  active: String,
  label: String,
  prefix: String,
  secondary: Boolean,
})
const emit = defineEmits(['select'])
function move(event, id) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = props.tabs.findIndex((tab) => tab.id === id)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
      ? props.tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + props.tabs.length) % props.tabs.length
  const tab = props.tabs[next]
  emit('select', tab.id)
  document.getElementById(`${props.prefix}-tab-${tab.id}`)?.focus()
}
</script>
