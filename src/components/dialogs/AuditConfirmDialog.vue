<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    summary?: string
    requireReason?: boolean
    confirmText?: string
    loading?: boolean
    placeholder?: string
    actionCode?: string
    targetSummary?: string
    impactHint?: string
    reasonRequired?: boolean
    reasonLabel?: string
    dialogClass?: string
    width?: string
    meta?: Array<{ label: string; value?: string | number | null }>
    reasonOptions?: Array<{ label: string; value: string }>
  }>(),
  {
    requireReason: false,
    reasonRequired: false,
    confirmText: '确认提交',
    placeholder: '请输入操作备注',
    reasonLabel: '操作备注',
    dialogClass: '',
    width: '520px',
    meta: () => [],
    reasonOptions: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [reason: string]
  confirm: [reason: string]
}>()

const state = reactive({
  reason: '',
})

const finalSummary = computed(() => props.summary || props.targetSummary || '')
const finalRequireReason = computed(() => props.requireReason || props.reasonRequired)

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      state.reason = ''
    }
  },
)

function close() {
  if (props.loading) {
    return
  }
  emit('update:modelValue', false)
}

function submit() {
  if (props.loading) {
    return
  }
  if (finalRequireReason.value && !state.reason.trim()) {
    return
  }
  emit('submit', state.reason.trim())
  emit('confirm', state.reason.trim())
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    class="audit-confirm-dialog"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
    @close="close"
  >
    <div class="dialog-content">
      <section class="dialog-intro">
        <p class="dialog-intro__eyebrow">ACTION / 操作确认</p>
        <strong>{{ title }}</strong>
        <p>{{ finalSummary || impactHint || '请确认本次后台动作的影响范围，再提交。' }}</p>
      </section>
      <p v-if="finalSummary" class="dialog-summary">{{ finalSummary }}</p>
      <ul v-if="meta.length" class="dialog-meta">
        <li v-for="item in meta" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value ?? '--' }}</strong>
        </li>
      </ul>
      <p v-if="impactHint" class="dialog-summary">{{ impactHint }}</p>
      <slot name="extra" />
      <el-select
        v-if="reasonOptions.length"
        v-model="state.reason"
        :placeholder="placeholder"
        :disabled="loading"
        class="dialog-reason-select"
      >
        <el-option
          v-for="option in reasonOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-input
        v-else
        v-model="state.reason"
        type="textarea"
        :rows="4"
        :placeholder="placeholder"
        :disabled="loading"
      />
      <span v-if="finalRequireReason" class="dialog-tip">{{ reasonLabel }}为必填。</span>
      <span v-else-if="actionCode" class="dialog-tip">权限码：{{ actionCode }}</span>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button :disabled="loading" @click="close">取消</el-button>
        <el-button type="primary" :loading="loading" :disabled="loading" @click="submit">{{ confirmText }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-summary {
  margin: 0;
  color: var(--kp-ink-soft);
  line-height: 1.6;
}

.dialog-meta {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(34, 31, 28, 0.06);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.64);
  }

  span {
    color: var(--kp-text-secondary);
  }
}

.dialog-tip {
  color: var(--kp-ink-faint);
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-reason-select {
  width: 100%;
}

@media (max-width: 640px) {
  .dialog-meta li,
  .dialog-footer {
    flex-wrap: wrap;
  }

  .dialog-footer {
    gap: 8px;
  }
}
</style>
