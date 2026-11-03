<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { publicBackgroundApi as api } from '../../api/actor-card-background'
import { BACKGROUND_STYLES, type PublicBackground } from '../../types/actor-card-background'
import { usePermissionStore } from '@/stores/permission'
import { vNumberInputDisabledAria } from '../../utils/number-input-disabled-aria'
const props = defineProps<{ open: boolean; disabled?: boolean }>()
const emit = defineEmits<{ close: []; choose: [item: PublicBackground]; busy: [value: boolean] }>()
const styles = BACKGROUND_STYLES, style = ref('classic'), items = ref<PublicBackground[]>([]), page = ref(1), busy = ref(false), error = ref(''), input = ref<HTMLInputElement | null>(null)
const permission = usePermissionStore()
let generation = 0
watch(busy, value => emit('busy', value), { flush: 'sync' })
async function load() {
  const token = ++generation; busy.value = true; error.value = ''
  try { const result = await api.list(style.value, page.value); if (token === generation) items.value = result }
  catch (e) { if (token === generation) { items.value = []; error.value = (e as Error).message || '图库加载失败' } }
  finally { if (token === generation) busy.value = false }
}
watch(() => props.open, open => { if (open) { page.value = 1; void load() } else { generation++; busy.value = false } })
watch(style, () => { page.value = 1; if (props.open) void load() })
onBeforeUnmount(() => { generation++; emit('busy', false) })
async function upload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = ''
  if (!file || busy.value || props.disabled) return
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) { ElMessage.warning('请选择10MB以内的JPEG或PNG'); return }
  const token = generation; busy.value = true; error.value = ''
  try { const item = await api.upload(file, style.value); if (token !== generation) return; ElMessage.success('已上传至公共背景图库，小程序使用同一图片'); emit('choose', item); emit('close') }
  catch (e) { if (token === generation) error.value = (e as Error).message || '上传失败' }
  finally { if (token === generation) busy.value = false }
}
async function edit(item: PublicBackground, field: 'style' | 'sortOrder' | 'enabled', value: string | number | undefined | null) {
  if (busy.value || props.disabled || value == null) return
  const changes = { style: item.style, sortOrder: item.sortOrder, enabled: item.enabled, [field]: value }
  busy.value = true; error.value = ''; const token = generation
  try { await api.update(item, changes); if (token === generation) { ElMessage.success('公共图库已保存；小程序重新加载图库后同步'); await load() } }
  catch (e) { if (token === generation) error.value = (e as Error).message || '保存失败，请刷新' }
  finally { if (token === generation) busy.value = false }
}
function close() { if (!busy.value) emit('close') }
</script>
<template>
  <el-dialog :model-value="open" title="公共背景图库 · 与小程序共用" width="min(1040px, 95vw)" append-to-body :close-on-click-modal="false" :before-close="close">
    <div class="catalog-toolbar">
      <el-select v-model="style" :disabled="busy" aria-label="背景风格"><el-option v-for="s in styles" :key="s.value" :value="s.value" :label="s.label" /></el-select>
      <el-button :disabled="busy" @click="load">刷新图库</el-button>
      <el-button v-if="permission.hasAction('action.content.template.edit')" type="primary" :disabled="busy || disabled" @click="input?.click()">上传图片到公共图库</el-button>
      <input ref="input" type="file" hidden accept="image/jpeg,image/png" @change="upload" />
    </div>
    <p class="catalog-help">背景 ID、风格、图片与排序来自同一服务端图库。停用项仅后台可见，不可用于新选择；已有分享卡保持原版本。上传图片仅新增，不覆盖旧图。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <p v-if="busy" role="status">正在处理…</p>
    <div v-number-input-disabled-aria="busy || !!disabled" class="background-grid">
      <article v-for="item in items" :key="item.id" class="background-item" :class="{ inactive: !item.enabled }">
        <img :src="item.thumbnailUrl || item.imageUrl" :alt="`背景 ${item.id}`" loading="lazy" />
        <div class="background-meta"><strong>#{{ item.id }}</strong><el-tag :type="item.enabled ? 'success' : 'info'">{{ item.enabled ? '已启用' : '已停用' }}</el-tag></div>
        <div v-if="permission.hasAction('action.content.template.edit')" class="background-controls">
          <el-select :model-value="item.style" :disabled="busy || disabled" :aria-label="`背景${item.id}风格`" @update:model-value="edit(item, 'style', $event)"><el-option v-for="s in styles" :key="s.value" :value="s.value" :label="s.label" /></el-select>
          <label>排序<el-input-number :model-value="item.sortOrder" :min="0" :max="99999" :disabled="busy || disabled" @change="edit(item, 'sortOrder', $event)" /></label>
          <el-switch :model-value="item.enabled === 1" :disabled="busy || disabled" :aria-label="`背景${item.id}启用`" @update:model-value="edit(item, 'enabled', $event ? 1 : 0)" />
        </div>
        <el-button type="primary" :disabled="busy || disabled || !item.enabled" @click="emit('choose', item); emit('close')">使用此背景</el-button>
      </article>
    </div>
    <p v-if="!busy && !items.length && !error">当前风格暂无公共背景，可以上传图片。</p>
    <template #footer><el-button :disabled="busy || page === 1" @click="page--; load()">上一页</el-button><span>第 {{ page }} 页</span><el-button :disabled="busy || items.length < 30" @click="page++; load()">下一页</el-button><el-button :disabled="busy" @click="close">关闭</el-button></template>
  </el-dialog>
</template>
<style scoped>
.catalog-toolbar, .background-meta, .background-controls { display: flex; align-items: center; gap: 12px; }
.catalog-toolbar > .el-select { width: 140px; }
.catalog-help { font-size: 12px; color: var(--kp-text-secondary); line-height: 1.7; }
.background-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-height: 58vh; overflow: auto; margin-top: 12px; }
.background-item { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--kp-border); border-radius: var(--kp-radius-sm); }
.background-item > img { width: 100%; height: 220px; object-fit: cover; border-radius: var(--kp-radius-sm); }
.background-meta { justify-content: space-between; }
.background-controls { flex-wrap: wrap; }
.background-controls > .el-select { width: 110px; }
.background-controls label { display: flex; gap: 6px; align-items: center; font-size: 12px; }
.background-controls .el-input-number { width: 130px; }
.inactive > img { opacity: .5; }
@media (max-width: 700px) { .background-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
