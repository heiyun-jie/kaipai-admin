<script setup lang="ts">
import PermissionButton from '@/components/business/PermissionButton.vue'
import StatusTag from '@/components/business/StatusTag.vue'
import { PERMISSIONS } from '@/constants/permission'
import type { TemplateStatusMeta } from '@/types/template-editor'
import type { TemplateItem } from '@/types/content'

const props = defineProps<{
  row: TemplateItem
  coverTone: 'base' | 'urban' | 'costume'
  tierLabel: string
  statusMeta: TemplateStatusMeta
  updatedAt: string
}>()

const emit = defineEmits<{
  (event: 'edit', row: TemplateItem): void
  (event: 'toggleStatus', row: TemplateItem): void
  (event: 'sort', row: TemplateItem): void
  (event: 'publish', row: TemplateItem): void
  (event: 'rollback', row: TemplateItem): void
}>()
</script>

<template>
  <article class="template-card">
    <div class="template-card__cover" :data-cover-tone="props.coverTone">
      <div class="template-card__cover-meta">
        <span class="template-card__cover-type">{{ tierLabel }}</span>
        <StatusTag v-bind="statusMeta" />
      </div>
    </div>

    <div class="template-card__body">
      <div class="template-card__summary">
        <div>
          <strong>{{ row.templateName }}</strong>
          <p>{{ `${row.templateSceneCode} · ${row.templateCode}` }}</p>
        </div>
        <span class="template-card__scene">{{ row.unlockRequired ? '进阶' : '公开' }}</span>
      </div>

      <div class="template-card__meta">
        <span>{{ `邀请门槛 ${row.requiredInviteCount ?? 0} 人` }}</span>
        <span>{{ `等级 L${row.requiredLevel ?? 0}` }}</span>
        <span>{{ `排序 ${row.sortNo ?? 0}` }}</span>
        <span>{{ updatedAt }}</span>
      </div>

      <div class="template-card__actions">
        <PermissionButton link type="primary" action="action.content.template.edit" @click="emit('edit', row)">基础编辑</PermissionButton>
        <PermissionButton
          link
          :type="row.status === 2 ? 'success' : 'warning'"
          :action="row.status === 2 ? PERMISSIONS.action.contentTemplateEnable : PERMISSIONS.action.contentTemplateDisable"
          @click="emit('toggleStatus', row)"
        >
          {{ row.status === 2 ? '启用' : '停用' }}
        </PermissionButton>
        <PermissionButton link type="warning" action="action.content.template.sort" @click="emit('sort', row)">排序</PermissionButton>
        <PermissionButton link type="success" action="action.content.template.publish" @click="emit('publish', row)">发布</PermissionButton>
        <PermissionButton link type="danger" action="action.content.template.rollback" @click="emit('rollback', row)">回滚</PermissionButton>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.template-card {
  display: grid;
  overflow: hidden;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.94), rgba(250, 244, 236, 0.9)),
    rgba(255, 251, 245, 0.92);
  box-shadow: 0 16px 34px rgba(63, 42, 20, 0.08);
}

.template-card__cover {
  position: relative;
  min-height: 190px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, #3a342d, #1f1c19);
}

.template-card__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 10px);
}

.template-card__cover[data-cover-tone='urban'] {
  background: linear-gradient(180deg, #293249, #1c2536);
}

.template-card__cover[data-cover-tone='costume'] {
  background: linear-gradient(180deg, #4a2422, #2f1615);
}

.template-card__cover-meta {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.template-card__cover-type {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(47, 36, 27, 0.82);
  font-size: 12px;
  font-weight: 700;
}

.template-card__body {
  display: grid;
  gap: 14px;
  padding: 16px 14px 14px;
}

.template-card__summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.template-card__summary strong {
  font-size: 17px;
}

.template-card__summary p {
  margin: 4px 0 0;
  color: rgba(47, 36, 27, 0.48);
  font-size: 12px;
}

.template-card__scene {
  color: rgba(47, 36, 27, 0.5);
  font-size: 12px;
}

.template-card__meta {
  display: grid;
  gap: 6px;
  color: rgba(47, 36, 27, 0.56);
  font-size: 12px;
}

.template-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
}
</style>
