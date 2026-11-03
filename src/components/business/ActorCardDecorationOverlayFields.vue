<script setup lang="ts">
import type { DecorationHeroOverlay } from '../../types/actor-card-decoration'
const props = defineProps<{ value?: DecorationHeroOverlay; disabled?: boolean }>()
const emit = defineEmits<{ set: [key: keyof DecorationHeroOverlay, value: boolean | string | number] }>()
function update(key: keyof DecorationHeroOverlay, value: unknown) {
  if (props.disabled) return
  if (key === 'enabled') { if (typeof value === 'boolean') emit('set', key, value) }
  else if (key === 'color') { if (typeof value === 'string' && /^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value)) emit('set', key, value) }
  else if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100) emit('set', key, value)
}
</script>
<template>
  <section class="overlay-fields">
    <h3>首图遮罩 · Renderer v2</h3>
    <el-form-item label="启用首图遮罩"><el-switch aria-label="启用首图遮罩" :model-value="value?.enabled ?? true" :disabled="disabled" @update:model-value="update('enabled', $event)" /></el-form-item>
    <el-form-item label="遮罩颜色"><el-input aria-label="遮罩颜色" :model-value="value?.color ?? '#0F172A'" :disabled="disabled" placeholder="#0F172A" @update:model-value="update('color', $event)" /></el-form-item>
    <div class="overlay-grid"><el-form-item v-for="f in ([{ key: 'startOpacity', label: '遮罩起始不透明度', fallback: 6 }, { key: 'endOpacity', label: '遮罩结束不透明度', fallback: 24 }] as const)" :key="f.key" :label="`${f.label} (%)`"><el-input-number :aria-label="f.label" :model-value="value?.[f.key] ?? f.fallback" :disabled="disabled" :min="0" :max="100" :precision="0" @update:model-value="update(f.key, $event)" /></el-form-item></div>
    <p>仅支持从上向下的固定渐变，不接受 CSS 或图片地址；旧 v1 模板保留原固定遮罩。</p>
  </section>
</template>
<style scoped>
h3 { margin: 18px 0 12px; font-size: 15px; }
.overlay-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.overlay-grid :deep(.el-input-number) { width: 100%; }
p { color: var(--kp-text-secondary); font-size: 12px; line-height: 1.7; }
</style>
