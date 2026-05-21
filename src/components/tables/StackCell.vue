<template>
  <div class="admin-stack-cell">
    <strong v-if="hasTitle">{{ title }}</strong>
    <span v-if="hasSubtitle">{{ subtitle }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string | number | null
  subtitle?: string | number | null
}>()

const hasTitle = computed(() => props.title !== undefined && props.title !== null && props.title !== '')
const hasSubtitle = computed(() => props.subtitle !== undefined && props.subtitle !== null && props.subtitle !== '')
</script>

<style scoped lang="scss">
.admin-stack-cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.admin-stack-cell strong,
.admin-stack-cell :slotted(strong) {
  min-width: 0;
  color: #1f2a3d;
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-stack-cell span,
.admin-stack-cell :slotted(span) {
  min-width: 0;
  color: #7a8699;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
