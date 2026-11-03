<script setup lang="ts">
import type { DecorationStyle } from '../../types/actor-card-decoration'
defineProps<{ overrides?: DecorationStyle; inherited: Required<DecorationStyle> }>()
const emit = defineEmits<{ set: [key: keyof DecorationStyle, value: number | string]; reset: [key: keyof DecorationStyle] }>()
const numbers: { key: keyof DecorationStyle; label: string; min: number; max: number }[] = [
  { key: 'radius', label: '圆角', min: 0, max: 96 }, { key: 'padding', label: '内边距', min: 0, max: 96 },
  { key: 'gap', label: '内部间距', min: 0, max: 96 }, { key: 'marginTop', label: '上外边距', min: 0, max: 160 },
  { key: 'marginBottom', label: '下外边距', min: 0, max: 160 }, { key: 'fontSize', label: '字号', min: 16, max: 72 },
  { key: 'lineHeight', label: '行高', min: 24, max: 120 }, { key: 'borderWidth', label: '边框宽度', min: 0, max: 8 },
]
const colors: { key: 'color' | 'backgroundColor' | 'borderColor'; label: string }[] = [
  { key: 'color', label: '文字颜色' }, { key: 'backgroundColor', label: '背景颜色' }, { key: 'borderColor', label: '边框颜色' },
]
function numberChange(key: keyof DecorationStyle, value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) emit('reset', key)
  else emit('set', key, value)
}
</script>
<template>
  <div class="style-fields">
    <el-form-item v-for="f in numbers" :key="f.key" :label="`${f.label} (rpx)`">
      <el-input-number :model-value="Number(overrides?.[f.key] ?? inherited[f.key])" :min="f.min" :max="f.max" :precision="0" controls-position="right" @update:model-value="numberChange(f.key, $event)" />
      <el-button link size="small" :disabled="overrides?.[f.key] === undefined" @click="emit('reset', f.key)">{{ overrides?.[f.key] === undefined ? '继承默认' : '恢复继承' }}</el-button>
    </el-form-item>
    <el-form-item v-for="f in colors" :key="f.key" :label="f.label" class="wide">
      <el-input :model-value="overrides?.[f.key] ?? inherited[f.key]" :placeholder="f.key === 'color' ? '#1F2937' : '#FFFFFF 或 transparent'" @update:model-value="emit('set', f.key, $event)" />
      <el-button link size="small" :disabled="overrides?.[f.key] === undefined" @click="emit('reset', f.key)">{{ overrides?.[f.key] === undefined ? '继承默认' : '恢复继承' }}</el-button>
    </el-form-item>
    <el-form-item label="字重"><el-select :model-value="overrides?.fontWeight ?? inherited.fontWeight" @update:model-value="emit('set', 'fontWeight', $event)"><el-option v-for="w in [400, 500, 600, 700]" :key="w" :value="w" :label="String(w)" /></el-select><el-button link :disabled="overrides?.fontWeight === undefined" @click="emit('reset', 'fontWeight')">恢复继承</el-button></el-form-item>
    <el-form-item label="文字对齐"><el-select :model-value="overrides?.align ?? inherited.align" @update:model-value="emit('set', 'align', $event)"><el-option label="左对齐" value="left" /><el-option label="居中" value="center" /><el-option label="右对齐" value="right" /></el-select><el-button link :disabled="overrides?.align === undefined" @click="emit('reset', 'align')">恢复继承</el-button></el-form-item>
    <el-form-item label="阴影" class="wide"><el-select :model-value="overrides?.shadow ?? inherited.shadow" @update:model-value="emit('set', 'shadow', $event)"><el-option label="无" value="none" /><el-option label="柔和" value="soft" /><el-option label="中等" value="medium" /></el-select><el-button link :disabled="overrides?.shadow === undefined" @click="emit('reset', 'shadow')">恢复继承</el-button></el-form-item>
  </div>
</template>
<style scoped>
.style-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.wide { grid-column: 1 / -1; }
.style-fields :deep(.el-input-number) { width: 100%; }
.style-fields :deep(.el-form-item__content) { align-items: start; flex-direction: column; gap: 3px; }
</style>
