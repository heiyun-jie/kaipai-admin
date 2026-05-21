<script setup lang="ts">
import type { TemplateToggleItem } from '@/types/template-editor'

defineProps<{
  items: readonly TemplateToggleItem[]
}>()

const emit = defineEmits<{
  (event: 'update', key: string, value: boolean): void
}>()

function handleSwitchUpdate(key: string, value: string | number | boolean) {
  emit('update', key, Boolean(value))
}
</script>

<template>
  <div class="template-toggle-grid">
    <label v-for="item in items" :key="item.key" class="template-toggle-card" :data-active="item.value === true">
      <div>
        <strong>{{ item.label }}</strong>
        <span>{{ item.description }}</span>
      </div>
      <el-switch :model-value="item.value" @update:model-value="handleSwitchUpdate(item.key, $event)" />
    </label>
  </div>
</template>

<style scoped lang="scss">
.template-toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-toggle-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 82px;
  padding: 13px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 18px;
  background: rgba(250, 245, 237, 0.62);

  strong {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
  }

  span {
    color: rgba(47, 36, 27, 0.48);
    font-size: 12px;
    line-height: 1.45;
  }
}

.template-toggle-card[data-active='true'] {
  border-color: rgba(47, 36, 27, 0.16);
  background: rgba(255, 255, 255, 0.88);
}

@media (max-width: 1100px) {
  .template-toggle-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .template-toggle-card {
    grid-template-columns: 1fr;
  }
}
</style>
