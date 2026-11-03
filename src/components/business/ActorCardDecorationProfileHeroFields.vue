<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileHeroIdentityOptions, ProfileHeroMetaField } from '../../types/actor-card-decoration'
import { PROFILE_HERO_DEFAULTS } from '../../utils/actor-card-decoration'
const props = defineProps<{ options?: ProfileHeroIdentityOptions; disabled?: boolean }>()
type OptionValue = string | number | ProfileHeroMetaField[]
const emit = defineEmits<{ set: [key: keyof ProfileHeroIdentityOptions, value: OptionValue] }>()
const current = computed(() => ({ ...PROFILE_HERO_DEFAULTS, ...props.options }))
const fields: { key: 'eyebrowFontSize' | 'eyebrowLetterSpacing' | 'nameFontSize' | 'nameLineHeight' | 'metaFontSize' | 'metaLineHeight'; label: string; min: number; max: number }[] = [
  { key: 'eyebrowFontSize', label: '英文小标题字号', min: 16, max: 40 },
  { key: 'eyebrowLetterSpacing', label: '英文小标题字距', min: 0, max: 12 },
  { key: 'nameFontSize', label: '姓名字号', min: 32, max: 120 },
  { key: 'nameLineHeight', label: '姓名行高', min: 40, max: 160 },
  { key: 'metaFontSize', label: '资料字号', min: 16, max: 48 },
  { key: 'metaLineHeight', label: '资料行高', min: 24, max: 80 },
]
const metaFields: { value: ProfileHeroMetaField; label: string }[] = [
  { value: 'role', label: '角色称谓' }, { value: 'gender', label: '性别' }, { value: 'age', label: '年龄' },
  { value: 'height', label: '身高' }, { value: 'weight', label: '体重' }, { value: 'city', label: '城市' },
]
function limits(field: typeof fields[number]) {
  if (field.key === 'nameFontSize') return { min: field.min, max: Math.min(field.max, current.value.nameLineHeight) }
  if (field.key === 'nameLineHeight') return { min: Math.max(field.min, current.value.nameFontSize), max: field.max }
  if (field.key === 'metaFontSize') return { min: field.min, max: Math.min(field.max, current.value.metaLineHeight) }
  if (field.key === 'metaLineHeight') return { min: Math.max(field.min, current.value.metaFontSize), max: field.max }
  return { min: field.min, max: field.max }
}
function update(key: keyof ProfileHeroIdentityOptions, value: unknown) {
  if (props.disabled) return
  const numeric = fields.find(f => f.key === key)
  if (numeric) {
    const { min, max } = limits(numeric)
    if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) emit('set', key, value)
  } else if (key === 'metaFields') {
    if (Array.isArray(value) && value.length <= 6 && new Set(value).size === value.length && value.every(v => metaFields.some(f => f.value === v))) emit('set', key, [...value] as ProfileHeroMetaField[])
  } else if (key === 'weightUnit') {
    if (value === 'kg' || value === 'jin') emit('set', key, value)
  } else if (key === 'eyebrowColor') {
    if (typeof value === 'string' && /^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value)) emit('set', key, value)
  } else if (typeof value === 'string' && value.length <= (key === 'eyebrow' ? 40 : 16) && !/[<>\u0000-\u001f\u007f-\u009f]/.test(value)) emit('set', key, value)
}
</script>
<template>
  <section class="profile-hero-fields">
    <h3>参考首图信息组</h3>
    <p class="field-help">姓名与资料来自演员卡快照；这里只调整排版。英文小标题可留空隐藏，不填写演员事实。</p>
    <el-form-item label="英文小标题"><el-input aria-label="英文小标题" :model-value="current.eyebrow" :disabled="disabled" maxlength="40" placeholder="ACTOR PROFILE / ACTRESS PROFILE，可留空" @update:model-value="update('eyebrow', $event)" /></el-form-item>
    <el-form-item label="英文小标题颜色"><el-input aria-label="英文小标题颜色" :model-value="current.eyebrowColor" :disabled="disabled" placeholder="#D8E0EA" @update:model-value="update('eyebrowColor', $event)" /></el-form-item>
    <div class="profile-hero-grid">
      <el-form-item v-for="f in fields" :key="f.key" :label="`${f.label} (rpx)`"><el-input-number :aria-label="f.label" :model-value="current[f.key]" :disabled="disabled" v-bind="limits(f)" :precision="0" controls-position="right" @update:model-value="update(f.key, $event)" /></el-form-item>
    </div>
    <el-form-item label="角色称谓"><el-input aria-label="角色称谓" :model-value="current.roleLabel" :disabled="disabled" maxlength="16" @update:model-value="update('roleLabel', $event)" /></el-form-item>
    <el-form-item label="资料字段（按选择顺序展示）"><el-select aria-label="资料字段" :model-value="current.metaFields" :disabled="disabled" multiple :multiple-limit="6" @update:model-value="update('metaFields', $event)"><el-option v-for="f in metaFields" :key="f.value" :value="f.value" :label="f.label" /></el-select></el-form-item>
    <el-form-item label="体重单位"><el-select aria-label="体重单位" :model-value="current.weightUnit" :disabled="disabled" @update:model-value="update('weightUnit', $event)"><el-option label="斤（按真实公斤值 ×2）" value="jin" /><el-option label="kg（公斤）" value="kg" /></el-select></el-form-item>
    <p class="field-help">姓名 / 资料行高不能小于字号；大姓名使用专用字号范围，不扩大正文样式限制。缺失的资料自动跳过。</p>
  </section>
</template>
<style scoped>
.profile-hero-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.profile-hero-grid :deep(.el-input-number), :deep(.el-select) { width: 100%; }
h3 { margin: 18px 0 12px; font-size: 15px; }
.field-help { color: var(--kp-text-secondary); font-size: 12px; line-height: 1.7; }
</style>
