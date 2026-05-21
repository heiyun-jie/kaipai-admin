<template>
  <article class="admin-info-block" :data-wide="wide === true">
    <span v-if="label">{{ label }}</span>
    <strong v-if="value !== undefined && value !== null && value !== ''">{{ value }}</strong>
    <slot />
  </article>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  value?: string | number | null
  wide?: boolean
}>()
</script>

<style scoped lang="scss">
.admin-info-block {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid rgba(31, 42, 61, 0.08);
  border-radius: 14px;
  background: #f8fafc;
}

.admin-info-block[data-wide='true'] {
  grid-column: 1 / -1;
}

.admin-info-block span,
.admin-info-block :slotted(span) {
  color: #7a8699;
  font-size: 12px;
}

.admin-info-block strong,
.admin-info-block :slotted(strong) {
  min-width: 0;
  color: #1f2a3d;
  font-size: 13px;
  overflow-wrap: anywhere;
}
</style>
