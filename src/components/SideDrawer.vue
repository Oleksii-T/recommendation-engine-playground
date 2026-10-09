<template>
  <Teleport to="body">
    <div class="drawer-backdrop" @click.self="$emit('close')">
      <section
        ref="panel"
        class="drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <header class="drawer-header">
          <div>
            <span class="eyebrow">DETAILS</span>
            <h2>{{ title }}</h2>
          </div>
          <button class="icon-button" aria-label="Close details" @click="$emit('close')">✕</button>
        </header>
        <div class="drawer-body"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { ref, onMounted, onBeforeUnmount } from 'vue'
defineProps({ title: String })
const emit = defineEmits(['close'])
const panel = ref(null)
let previous, scroll
onMounted(() => {
  previous = document.activeElement
  scroll = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  panel.value.focus()
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.body.style.overflow = scroll
  document.removeEventListener('keydown', onKey)
  previous?.focus()
})
function onKey(e) {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key !== 'Tab') return
  const nodes = [
    ...panel.value.querySelectorAll(
      'button, input, select, textarea, a[href], summary, [tabindex="0"]',
    ),
  ].filter((x) => !x.disabled && x.getClientRects().length)
  const first = nodes[0],
    last = nodes[nodes.length - 1]
  if (!panel.value.contains(document.activeElement)) {
    e.preventDefault()
    first?.focus()
    return
  }
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    e.preventDefault()
    last?.focus()
  } else if (
    !e.shiftKey &&
    (document.activeElement === last || document.activeElement === panel.value)
  ) {
    e.preventDefault()
    first?.focus()
  }
}
</script>
