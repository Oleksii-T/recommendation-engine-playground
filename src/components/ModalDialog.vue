<template>
  <dialog
    ref="dialog"
    class="modal-dialog"
    :aria-label="title"
    @cancel.prevent="$emit('close')"
    @click="closeOnBackdrop"
  >
    <header class="modal-header">
      <h2>{{ title }}</h2>
      <button class="icon-button" type="button" aria-label="Close dialog" @click="$emit('close')">
        ✕
      </button>
    </header>
    <div class="modal-body"><slot /></div>
  </dialog>
</template>
<script setup>
/* eslint-env vue/setup-compiler-macros */
import { ref, onMounted, onBeforeUnmount } from 'vue'
defineProps({ title: String })
const emit = defineEmits(['close']),
  dialog = ref(null)
let previous
onMounted(() => {
  previous = document.activeElement
  dialog.value.showModal()
  dialog.value.querySelector('[autofocus]')?.focus()
})
onBeforeUnmount(() => {
  dialog.value.close()
  if (previous?.isConnected) previous.focus()
})
function closeOnBackdrop(event) {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    emit('close')
}
</script>
