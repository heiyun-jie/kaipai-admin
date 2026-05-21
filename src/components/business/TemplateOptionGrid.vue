<script setup lang="ts">
import type { TemplateConfigOption } from '@/types/template-editor'

defineProps<{
  options: readonly TemplateConfigOption[]
  selected: string
  compact?: boolean
}>()

const emit = defineEmits<{
  (event: 'select', value: string): void
}>()
</script>

<template>
  <div class="template-option-grid" :data-compact="compact === true">
    <button
      v-for="item in options"
      :key="item.key"
      type="button"
      class="template-option-card"
      :data-active="selected === item.key"
      :data-compact="compact === true"
      @click="emit('select', item.key)"
    >
      <strong>{{ item.label }}</strong>
      <span v-if="item.description">{{ item.description }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.template-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.template-option-grid[data-compact='true'] {
  grid-template-columns: 1fr;
}

.template-option-card {
  display: grid;
  gap: 6px;
  min-height: 96px;
  padding: 13px 14px;
  border: 1px solid rgba(80, 63, 47, 0.1);
  border-radius: 18px;
  background: rgba(250, 245, 237, 0.66);
  color: rgba(47, 36, 27, 0.74);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;

  strong {
    font-size: 14px;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 12px;
    line-height: 1.45;
  }
}

.template-option-card:hover,
.template-option-card[data-active='true'] {
  border-color: rgba(47, 36, 27, 0.2);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(63, 42, 20, 0.08);
  transform: translateY(-1px);
}

.template-option-card[data-compact='true'] {
  min-height: 82px;
}

@media (max-width: 1100px) {
  .template-option-grid {
    grid-template-columns: 1fr;
  }
}
</style>
