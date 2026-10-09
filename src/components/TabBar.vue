<template>
  <div
    ref="bar"
    class="tab-bar"
    :class="{ 'run-tabs': secondary }"
    role="tablist"
    :aria-label="label"
  >
    <span v-for="tab in tabs" :key="tab.id" class="tab-item" role="presentation">
      <button
        :id="`${prefix}-tab-${tab.id}`"
        role="tab"
        type="button"
        :aria-selected="tab.id === active"
        :aria-controls="`${prefix}-panel`"
        :tabindex="
          tab.id === active || (!tabs.some((item) => item.id === active) && tab === tabs[0])
            ? 0
            : -1
        "
        :class="{ selected: tab.id === active }"
        @click="$emit('select', tab.id)"
        @keydown="move($event, tab.id)"
      >
        {{ tab.label }}
      </button>
      <button
        v-if="tab.deletable"
        type="button"
        class="delete-run-tab"
        :aria-label="`Delete simulation ${tab.label}`"
        :title="`Delete simulation ${tab.label}`"
        @click="$emit('delete', tab.id)"
      >
        ×
      </button>
    </span>
  </div>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { nextTick, ref, watch } from 'vue'
const props = defineProps({
  tabs: Array,
  active: String,
  label: String,
  prefix: String,
  secondary: Boolean,
})
const emit = defineEmits(['select', 'delete'])
const bar = ref(null)
watch(
  () => [props.active, props.tabs.map((tab) => tab.id).join(',')],
  async () => {
    await nextTick()
    const tab = document.getElementById(`${props.prefix}-tab-${props.active}`)?.parentElement
    if (!bar.value || !tab) return
    const bounds = bar.value.getBoundingClientRect()
    const position = tab.getBoundingClientRect()
    if (position.left < bounds.left) bar.value.scrollLeft -= bounds.left - position.left
    else if (position.right > bounds.right) bar.value.scrollLeft += position.right - bounds.right
  },
  { immediate: true },
)
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
