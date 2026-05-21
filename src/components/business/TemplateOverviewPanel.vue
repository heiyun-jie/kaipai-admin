<script setup lang="ts">
import type { TemplateOverviewStat, TemplateSegmentKey, TemplateSegmentOption, TemplateViewMode } from '@/types/template-editor'

defineProps<{
  segments: readonly TemplateSegmentOption[]
  activeSegment: TemplateSegmentKey
  stats: readonly TemplateOverviewStat[]
}>()

const viewMode = defineModel<TemplateViewMode>('viewMode', { required: true })

const emit = defineEmits<{
  (event: 'switchSegment', value: TemplateSegmentKey): void
}>()
</script>

<template>
  <el-card class="table-card template-shell-card" shadow="never">
    <div class="template-shell-card__toolbar">
      <div class="template-tabs" role="tablist" aria-label="模板状态视图">
        <button
          v-for="segment in segments"
          :key="segment.key"
          type="button"
          class="template-tab"
          :data-active="activeSegment === segment.key"
          @click="emit('switchSegment', segment.key)"
        >
          <span>{{ segment.label }}</span>
          <small>{{ segment.count }}</small>
        </button>
      </div>

      <div class="template-shell-card__actions">
        <button
          type="button"
          class="template-view-button"
          :data-active="viewMode === 'gallery'"
          @click="viewMode = 'gallery'"
        >
          模板库
        </button>
        <button
          type="button"
          class="template-view-button"
          :data-active="viewMode === 'table'"
          @click="viewMode = 'table'"
        >
          列表视图
        </button>
      </div>
    </div>

    <div class="template-shell-card__stats">
      <div v-for="stat in stats" :key="stat.label" class="template-stat">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
:deep(.template-shell-card > .el-card__body) {
  padding: 18px 20px;
}

.template-shell-card__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.template-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-tab,
.template-view-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(80, 63, 47, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.76);
  color: rgba(47, 36, 27, 0.64);
  cursor: pointer;
}

.template-tab span,
.template-view-button {
  font-weight: 700;
}

.template-tab small {
  color: rgba(47, 36, 27, 0.46);
}

.template-tab[data-active='true'],
.template-view-button[data-active='true'] {
  background: #221f1c;
  color: #f6efe6;
  box-shadow: 0 12px 24px rgba(34, 31, 28, 0.14);
}

.template-tab[data-active='true'] small {
  color: rgba(246, 239, 230, 0.68);
}

.template-shell-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-shell-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.template-stat {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.template-stat span {
  color: rgba(47, 36, 27, 0.48);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.template-stat strong {
  font-size: 22px;
}

@media (max-width: 1100px) {
  .template-shell-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .template-shell-card__stats {
    grid-template-columns: 1fr;
  }
}
</style>
