<template>
  <div class="admin-detail-grid">
    <article v-for="item in items || []" :key="item.label" class="admin-detail-block" :data-wide="item.wide === true">
      <span>{{ item.label }}</span>
      <strong>{{ formatValue(item.value) }}</strong>
    </article>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface DetailGridItem {
  label: string
  value?: string | number | null
  wide?: boolean
}

defineProps<{
  items?: DetailGridItem[]
}>()

function formatValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '--' : value
}
</script>

<style scoped lang="scss">
.admin-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.admin-detail-block {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid rgba(31, 42, 61, 0.08);
  border-radius: 14px;
  background: #f8fafc;
}

.admin-detail-block[data-wide='true'] {
  grid-column: 1 / -1;
}

.admin-detail-block span {
  color: #7a8699;
  font-size: 12px;
}

.admin-detail-block strong {
  min-width: 0;
  color: #1f2a3d;
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .admin-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
