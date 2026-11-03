<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePermissionStore } from '@/stores/permission'
import { decorationApi } from '../../api/actor-card-decoration'
import { useActorCardDecoration } from '../../composables/useActorCardDecoration'
import { BASE_STYLE, MODULE_LABELS, PRESENTATIONS, effectiveStyle, moveModule, sortedModules, clearStyleOverride } from '../../utils/actor-card-decoration'
import type { DecorationStyle, DecorationModule, DecorationHeroOverlay, ProfileHeroIdentityOptions, ProfileHeroMetaField } from '../../types/actor-card-decoration'
import PermissionButton from './PermissionButton.vue'
import ActorCardDecorationPreview from './ActorCardDecorationPreview.vue'
import ActorCardDecorationStyleFields from './ActorCardDecorationStyleFields.vue'
import ActorCardDecorationProfileHeroFields from './ActorCardDecorationProfileHeroFields.vue'
import ActorCardDecorationOverlayFields from './ActorCardDecorationOverlayFields.vue'
import ActorCardDecorationBindings from './ActorCardDecorationBindings.vue'
import ActorCardBackgroundPicker from './ActorCardBackgroundPicker.vue'
import { publicBackgroundApi } from '../../api/actor-card-background'
import { useEditorBackground } from '../../composables/useEditorBackground'
import { decorationBindingApi } from '../../api/actor-card-decoration-binding'
import type { DecorationCardPreview } from '../../types/actor-card-decoration-binding'
import type { PublicBackground } from '../../types/actor-card-background'
import { vNumberInputDisabledAria } from '../../utils/number-input-disabled-aria'

const props = defineProps<{ templateId: number; templateName: string }>()
const emit = defineEmits<{ close: [] }>()
const state = useActorCardDecoration(decorationApi)
const { config, previewConfig, revision, activeVersion, busy: draftBusy, error, versions, conflict, dirty, validationCurrent } = state
const backgroundState = useEditorBackground(publicBackgroundApi)
const { selected: selectedBackground, busy: backgroundBusy, error: backgroundError } = backgroundState
const pickerOpen = ref(false), pickerBusy = ref(false), uploading = ref(false), backgroundUpload = ref<HTMLInputElement | null>(null)
const previewCardId = ref<number>(), previewCard = ref<DecorationCardPreview | null>(null), cardBusy = ref(false)
let backgroundGeneration = 0
const bindingBusy = ref(false)
const busy = computed(() => draftBusy.value || bindingBusy.value || backgroundBusy.value || pickerBusy.value || uploading.value || cardBusy.value)
const permissions = usePermissionStore()
const canEdit = computed(() => permissions.hasAction('action.content.template.edit'))
const selectedId = ref(''), tab = ref('properties'), note = ref('')
const selected = computed(() => config.value?.modules.find(m => m.id === selectedId.value))
const isHero = computed(() => selected.value?.layout?.zone === 'hero')
const moduleStyle = computed(() => config.value && selected.value ? effectiveStyle(config.value, selected.value) : BASE_STYLE)
const bodyWidth = computed(() => 750 - 2 * (config.value?.page?.contentPadding ?? 24))
const heroHeight = computed(() => config.value?.hero?.height ?? 1334)
const availablePresentations = computed(() => selected.value ? PRESENTATIONS[selected.value.type].filter(p =>
  (p !== 'profileHero' || (config.value?.schemaVersion === 2 && isHero.value)) &&
  (!(isHero.value && selected.value?.type === 'introduction') || p === 'summary')) : [])
const presentationLabels: Record<string, string> = { standard: '标准', profileHero: '参考首图信息组', pill: '演员文案胶囊', chips: '标签', rows: '资料行', full: '完整正文', summary: '摘要', cards: '卡片', list: '列表', grid: '网格', carousel: '横向轮播', player: '播放器', poster: '封面入口', button: '按钮入口', pages: '分页预览', contact: '合作联系' }
watch(() => props.templateId, id => { backgroundGeneration++; previewCard.value = null; previewCardId.value = undefined; cardBusy.value = false; selectedId.value = ''; note.value = ''; tab.value = 'properties'; void state.open(id); void backgroundState.open(id) }, { immediate: true })
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value || busy.value) { e.preventDefault(); e.returnValue = '' } }
if (typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload); backgroundGeneration++; state.close(); backgroundState.close() })
async function canLeave() {
  if (bindingBusy.value || backgroundBusy.value || pickerBusy.value || uploading.value || cardBusy.value) return false
  return state.canLeave(async () => {
    try { await ElMessageBox.confirm('有未保存的装修改动，离开后将丢失。确定离开？', '离开装修编辑器', { type: 'warning' }); return true } catch { return false }
  })
}
defineExpose({ canLeave })
async function close() { if (await canLeave()) emit('close') }
async function reload() {
  if (busy.value) return
  if (dirty.value) { try { await ElMessageBox.confirm('重新读取将丢弃当前未保存改动，请先备份需要的配置。', '重新读取草稿', { type: 'warning' }) } catch { return } }
  await state.open(props.templateId)
}
function select(id: string) { selectedId.value = id; tab.value = 'properties' }
function moveHero(id: string, position: { x: number; y: number }) {
  if (busy.value || conflict.value || !canEdit.value) return
  const module = config.value?.modules.find(m => m.id === id)
  if (module?.layout?.zone === 'hero') Object.assign(module.layout, position)
}
function setStyle(key: keyof DecorationStyle, value: number | string) {
  if (!config.value) return
  const target = selected.value ? (selected.value.style ??= {}) : (config.value.defaults ??= {})
  Object.assign(target, { [key]: value })
}
function resetStyle(key: keyof DecorationStyle) {
  if (selected.value) clearStyleOverride(selected.value, key)
  else if (config.value?.defaults) delete config.value.defaults[key]
}
function layout(key: keyof NonNullable<DecorationModule['layout']>, value: number | string | null | undefined) {
  if (!selected.value || value == null || (typeof value === 'number' && !Number.isFinite(value))) return
  Object.assign(selected.value.layout ??= {}, { [key]: value })
}
function presentation(value: string) {
  if (busy.value || conflict.value || !canEdit.value || !selected.value || !availablePresentations.value.includes(value)) return
  selected.value.presentation = value
  if (value !== 'summary') delete selected.value.maxLines
  if (value !== 'profileHero') delete selected.value.identityOptions
}
function identityOption(key: keyof ProfileHeroIdentityOptions, value: string | number | ProfileHeroMetaField[]) {
  if (busy.value || conflict.value || !canEdit.value || config.value?.schemaVersion !== 2 || selected.value?.presentation !== 'profileHero' || !isHero.value) return
  Object.assign(selected.value.identityOptions ??= {}, { [key]: value })
}
function overlayOption(key: keyof DecorationHeroOverlay, value: boolean | string | number) {
  if (busy.value || conflict.value || !canEdit.value || config.value?.schemaVersion !== 2) return
  Object.assign((config.value.hero ??= {}).overlay ??= {}, { [key]: value })
}
async function applyReferencePreset() {
  if (!config.value || busy.value || conflict.value || !canEdit.value) return
  const templateId = props.templateId, fingerprint = JSON.stringify(config.value)
  try { await ElMessageBox.confirm('仅修改当前未发布草稿：升级至 Renderer v2，并替换首图信息组 / 胶囊 / 遮罩样式；技能移到正文，其他正文与顺序保留。已有分享卡不会自动更新。当前未保存的正文改动会保留，请先确认需要覆盖的首图样式。', '应用参考首图样式', { type: 'warning', confirmButtonText: '应用到当前草稿', cancelButtonText: '取消' }) } catch { return }
  if (templateId !== props.templateId || fingerprint !== JSON.stringify(config.value)) { ElMessage.warning('草稿已变化，请重新确认后应用参考样式'); return }
  if (state.applyReferencePreset(canEdit.value, busy.value)) {
    selectedId.value = config.value!.modules.find(m => m.type === 'identity' && m.layout?.zone === 'hero')?.id ?? ''
    tab.value = 'properties'; ElMessage.success('参考样式已应用到未保存草稿；请校验、保存后再发布')
  }
}
function globalNumber(group: 'page' | 'hero', key: string, value: number | null | undefined) {
  if (config.value && value != null && Number.isFinite(value)) Object.assign(config.value[group] ??= {}, { [key]: value })
}
function summaryLines(value: number | null | undefined) { if (selected.value && value != null) selected.value.maxLines = value }
async function chooseBackground(item: PublicBackground | null) {
  if (!canEdit.value || draftBusy.value || bindingBusy.value || conflict.value) return
  if (await backgroundState.choose(item)) ElMessage.success('编辑背景已保存；公开卡片和 AI 输入未修改')
}
async function uploadBackground(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = ''
  if (!file || busy.value || !canEdit.value) return
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) { ElMessage.warning('请选择10MB以内的JPEG或PNG'); return }
  const token = backgroundGeneration
  uploading.value = true
  try { const item = await publicBackgroundApi.upload(file, selectedBackground.value?.style ?? 'classic'); if (token === backgroundGeneration) await chooseBackground(item) }
  catch { ElMessage.error('背景上传失败，请重试') }
  finally { uploading.value = false }
}
async function loadPreviewCard() {
  if (!previewCardId.value || busy.value) return
  const token = backgroundGeneration; cardBusy.value = true
  try { const result = await decorationBindingApi.preview(previewCardId.value, { generationMode: 'person_ai' }); if (token === backgroundGeneration) previewCard.value = result }
  catch { if (token === backgroundGeneration) ElMessage.error('授权卡片资料读取失败') }
  finally { if (token === backgroundGeneration) cardBusy.value = false }
}
async function save() { if (await state.save()) ElMessage.success('装修草稿已保存，尚未影响公开名片') }
async function validate() { if (await state.validate()) ElMessage.success(validationCurrent.value ? '当前配置通过后端校验' : '已完成校验，但配置已发生变化，请重新校验') }
async function publish() {
  if (!note.value.trim() || dirty.value) { ElMessage.warning('请先保存草稿，并填写发布说明'); return }
  try { await ElMessageBox.confirm('发布为不可变装修版本。已有分享卡不会自动升级。新建名片或主动升级后使用对应绑定。', '发布装修版本', { type: 'warning' }) } catch { return }
  if (await state.publish(note.value)) ElMessage.success('装修版本已发布')
}
async function activate(version: number) {
  if (!note.value.trim() || dirty.value) { ElMessage.warning('请先保存草稿，并填写版本切换说明'); return }
  try { await ElMessageBox.confirm(`将装修发布头切换到 v${version}，不会修改草稿或已有名片。`, '确认切换装修版本', { type: 'warning' }) } catch { return }
  if (await state.activate(version, note.value)) ElMessage.success('装修发布版本已切换，草稿保持不变')
}
</script>
<template>
  <el-dialog :model-value="true" :title="`页面装修 · ${templateName}`" width="min(1440px, 96vw)" top="3vh" :close-on-click-modal="false" :close-on-press-escape="!busy" :before-close="close" class="decoration-dialog">
    <div class="decoration-toolbar">
      <div><strong>演员卡装修工作台</strong><p>模块、首图覆盖层与样式由后端配置管理；历史名片锁定原版本。</p></div>
      <div class="toolbar-status"><PermissionButton action="action.content.template.edit" :disabled="!config || busy || conflict || !canEdit" @click="applyReferencePreset">应用参考首图样式</PermissionButton><el-tag :type="dirty ? 'warning' : 'info'">{{ !config ? '未读取配置' : dirty ? '未保存改动' : '草稿已同步' }}</el-tag><el-tag>修订 {{ revision }} · 发布 {{ activeVersion ? `v${activeVersion}` : '暂无' }} · Renderer {{ config?.schemaVersion ?? '—' }}</el-tag></div>
    </div>
    <el-alert title="中央画布使用小程序同源渲染。公共背景图库与小程序共用；保存编辑背景不等于发布，发布后请在“装修绑定”关联背景与装修版本。" type="info" :closable="false" />
    <el-alert v-if="error" class="editor-alert" :title="error" :type="conflict ? 'warning' : 'error'" :closable="false"><el-button link :disabled="busy" @click="reload">重新读取草稿</el-button></el-alert>
    <div v-if="!config" class="editor-empty"><p>{{ busy ? '正在读取装修配置…' : '未取得装修配置，请确认后端 API 与迁移已就绪。' }}</p><el-button :disabled="busy" @click="reload">重试</el-button></div>
    <div v-else class="decoration-workbench">
      <aside class="module-panel">
        <h3>页面结构</h3><button class="module-select" :class="{ active: !selectedId }" @click="selectedId = ''; tab = 'properties'">页面 / 默认样式</button>
        <section v-for="zone in (['hero', 'flow'] as const)" :key="zone">
          <h4>{{ zone === 'hero' ? '首图覆盖层' : '长页正文' }}</h4>
          <div v-for="(m, i) in sortedModules(config, zone)" :key="m.id" class="module-row" :class="{ active: m.id === selectedId, muted: m.enabled === false }">
            <button class="module-select" @click="select(m.id)">{{ MODULE_LABELS[m.type] }}<small>{{ m.enabled === false ? '已隐藏' : '显示中' }}</small></button>
            <el-switch :model-value="m.enabled !== false" :aria-label="`${MODULE_LABELS[m.type]}显示`" :disabled="busy || conflict || !canEdit" @update:model-value="m.enabled = Boolean($event)" />
            <div class="reorder-actions"><el-button link size="small" :disabled="busy || conflict || !canEdit || i === 0" @click="moveModule(config, m.id, -1)">上移</el-button><el-button link size="small" :disabled="busy || conflict || !canEdit || i === sortedModules(config, zone).length - 1" @click="moveModule(config, m.id, 1)">下移</el-button></div>
          </div>
        </section><p class="field-help">顺序只在所属区域内调整。坐标和尺寸使用 750 设计宽度下的 rpx。</p>
      </aside>
      <main class="preview-panel"><div class="canvas-workspace">
        <section class="background-toolbar">
          <div v-if="selectedBackground" class="selected-background"><img :src="selectedBackground.thumbnailUrl || selectedBackground.imageUrl" alt="当前公共背景" /><span>公共背景 #{{ selectedBackground.id }}<small>{{ selectedBackground.enabled ? '已启用' : '已停用，仅保留编辑预览' }}</small></span></div>
          <span v-else>尚未选择编辑背景</span>
          <div class="background-actions"><el-button :disabled="busy || !canEdit || !backgroundState.loaded.value" @click="backgroundUpload?.click()">上传背景</el-button><el-button :disabled="busy" @click="pickerOpen = true">从公共图库选择</el-button><el-button v-if="selectedBackground" :disabled="busy || !canEdit" @click="chooseBackground(null)">清除编辑背景</el-button><el-button :disabled="busy" @click="backgroundState.open(templateId)">重新读取背景</el-button></div>
          <input ref="backgroundUpload" type="file" hidden accept="image/jpeg,image/png" @change="uploadBackground" />
          <p>背景单独保存。上传默认归入当前风格（未选择时为经典），可在图库中调整；已有名片首图不会被更换。</p>
          <el-alert v-if="backgroundError" :title="backgroundError" type="error" :closable="false" />
        </section>
        <section v-number-input-disabled-aria="busy" class="preview-data-controls"><label>预览资料（可选真实卡 ID）<el-input-number v-model="previewCardId" :min="1" :precision="0" :disabled="busy" /></label><el-button :disabled="busy || !previewCardId" @click="loadPreviewCard">读取授权真实卡资料</el-button><el-button v-if="previewCard" :disabled="busy" @click="previewCard = null">恢复示例资料</el-button><p>使用当前装修草稿排版；选定背景仅用于编辑预览，不代表 AI 已合成。</p></section>
        <ActorCardDecorationPreview :card="previewCard" :background-url="selectedBackground?.imageUrl" :config="previewConfig ?? config" :selected="selectedId" :draggable="canEdit && !busy && !conflict" @select="select" @move="moveHero" /></div></main>
      <aside class="property-panel">
        <el-tabs v-model="tab"><el-tab-pane label="配置属性" name="properties" /><el-tab-pane label="版本记录" name="versions" /><el-tab-pane label="装修绑定" name="bindings" /></el-tabs>
        <div v-if="tab === 'versions'">
          <p class="field-help">展示最近 50 个不可变装修版本。切换发布头不改变编辑草稿，不自动升级旧名片。</p><el-button :disabled="busy" @click="state.refreshHistory">刷新版本记录</el-button>
          <div v-for="v in versions" :key="v.versionNo" class="version-row"><strong>v{{ v.versionNo }} {{ v.versionNo === activeVersion ? '· 当前发布' : '' }}</strong><p>{{ v.note }}</p><small>{{ v.publishedAt }}</small><PermissionButton action="action.content.template.rollback" link :disabled="busy || dirty || conflict || v.versionNo === activeVersion" @click="activate(v.versionNo)">切换到此版本</PermissionButton></div>
          <p v-if="!versions.length">暂无已发布装修版本。</p>
        </div>
        <ActorCardDecorationBindings v-show="tab === 'bindings'" :template-id="templateId" :versions="versions" :background-id="selectedBackground?.enabled === 1 ? selectedBackground.id : undefined" :disabled="draftBusy || dirty || conflict || backgroundBusy" @pick-background="pickerOpen = true" @busy="bindingBusy = $event" />
        <el-form v-if="tab === 'properties'" v-number-input-disabled-aria="busy || conflict || !canEdit" label-position="top" :disabled="busy || conflict || !canEdit">
          <template v-if="!selected">
            <h3>页面与首图</h3>
            <el-form-item label="页面背景色"><el-input :model-value="config.page?.backgroundColor ?? '#F3F4F6'" @update:model-value="(config.page ??= {}).backgroundColor = $event" /></el-form-item>
            <div class="property-grid">
              <el-form-item label="正文边距 (rpx)"><el-input-number :model-value="config.page?.contentPadding ?? 24" :min="0" :max="96" :precision="0" @update:model-value="globalNumber('page', 'contentPadding', $event)" /></el-form-item>
              <el-form-item label="正文间隔 (rpx)"><el-input-number :model-value="config.page?.gap ?? 16" :min="0" :max="96" :precision="0" @update:model-value="globalNumber('page', 'gap', $event)" /></el-form-item>
              <el-form-item label="首图高度 (rpx)"><el-input-number :model-value="heroHeight" :min="config.schemaVersion === 2 ? 450 : 400" :max="1800" :precision="0" @update:model-value="globalNumber('hero', 'height', $event)" /></el-form-item>
              <el-form-item label="首图焦点 X (%)"><el-input-number :model-value="config.hero?.focalX ?? 50" :min="0" :max="100" :precision="0" @update:model-value="globalNumber('hero', 'focalX', $event)" /></el-form-item>
              <el-form-item label="首图焦点 Y (%)"><el-input-number :model-value="config.hero?.focalY ?? 50" :min="0" :max="100" :precision="0" @update:model-value="globalNumber('hero', 'focalY', $event)" /></el-form-item>
            </div><p class="field-help">减小首图或正文宽度前，请检查已有模块边界；发布时由后端严格校验。</p>
            <ActorCardDecorationOverlayFields v-if="config.schemaVersion === 2" :value="config.hero?.overlay" :disabled="busy || conflict || !canEdit" @set="overlayOption" />
            <p v-else class="field-help">当前是 v1 模板，保留原固定遮罩；显式应用参考首图样式后才升级 v2。</p>
            <h3>全局默认样式</h3><ActorCardDecorationStyleFields :overrides="config.defaults" :inherited="BASE_STYLE" @set="setStyle" @reset="resetStyle" />
          </template>
          <template v-else>
            <h3>{{ MODULE_LABELS[selected.type] }}</h3><p class="field-help">{{ selected.id }} · {{ isHero ? '首图绝对定位，矩形不能越界' : '正文流式布局，内容自动撑高' }}</p>
            <el-form-item label="展示样式"><el-select :model-value="selected.presentation ?? PRESENTATIONS[selected.type][0]" @update:model-value="presentation"><el-option v-for="p in availablePresentations" :key="p" :value="p" :label="presentationLabels[p]" /></el-select></el-form-item>
            <ActorCardDecorationProfileHeroFields v-if="selected.type === 'identity' && selected.presentation === 'profileHero' && isHero && config.schemaVersion === 2" :options="selected.identityOptions" :disabled="busy || conflict || !canEdit" @set="identityOption" />
            <el-alert v-if="selected.type === 'promotion'" title="文案由每位演员在个人资料 / 本卡资料单独填写，未填写自动隐藏；这里仅调整胶囊外观，不提供模板统一文案。示例画布文案只是排版示例。" type="info" :closable="false" />
            <el-form-item v-if="selected.type === 'introduction' && selected.presentation === 'summary'" label="摘要行数"><el-input-number :model-value="selected.maxLines ?? 3" :min="1" :max="6" :precision="0" @update:model-value="summaryLines($event)" /></el-form-item>
            <div class="property-grid">
              <el-form-item label="模块宽度 (rpx)"><el-input-number :model-value="selected.layout?.width ?? bodyWidth" :min="1" :max="isHero ? 750 : bodyWidth" :precision="0" @update:model-value="layout('width', $event)" /><el-button v-if="!isHero" link @click="selected.layout && delete selected.layout.width">跟随正文宽度</el-button></el-form-item>
              <template v-if="isHero">
                <el-form-item label="高度 (rpx)"><el-input-number :model-value="selected.layout?.height" :min="1" :max="heroHeight" :precision="0" @update:model-value="layout('height', $event)" /></el-form-item>
                <el-form-item label="X 坐标"><el-input-number :model-value="selected.layout?.x" :min="0" :max="750" :precision="0" @update:model-value="layout('x', $event)" /></el-form-item>
                <el-form-item label="Y 坐标"><el-input-number :model-value="selected.layout?.y" :min="0" :max="heroHeight" :precision="0" @update:model-value="layout('y', $event)" /></el-form-item>
                <el-form-item label="层级 zIndex"><el-input-number :model-value="selected.layout?.zIndex ?? 0" :min="0" :max="20" :precision="0" @update:model-value="layout('zIndex', $event)" /></el-form-item>
              </template>
              <el-form-item v-else label="容器对齐"><el-select :model-value="selected.layout?.align ?? 'left'" @update:model-value="layout('align', $event)"><el-option label="左对齐" value="left" /><el-option label="居中" value="center" /><el-option label="右对齐" value="right" /></el-select></el-form-item>
            </div><h3>模块样式覆盖</h3><p class="field-help">未覆盖字段实时继承全局默认；“恢复继承”只清除此项，不改变其他配置。</p><ActorCardDecorationStyleFields :overrides="selected.style" :inherited="{ ...BASE_STYLE, ...config.defaults }" @set="setStyle" @reset="resetStyle" />
            <small>当前有效圆角 {{ moduleStyle.radius }} rpx · {{ moduleStyle.shadow }} 阴影</small>
          </template>
        </el-form>
      </aside>
    </div>
    <ActorCardBackgroundPicker :open="pickerOpen" :disabled="draftBusy || bindingBusy || backgroundBusy || !canEdit || !backgroundState.loaded.value" @choose="chooseBackground" @close="pickerOpen = false" @busy="pickerBusy = $event" />
    <template #footer><div class="decoration-footer"><el-input v-model="note" :disabled="busy" maxlength="200" show-word-limit placeholder="发布 / 版本切换说明（必填）" /><span class="validation-state">{{ validationCurrent ? '当前配置校验通过' : '配置尚未校验 / 已变更' }}</span><el-button :disabled="busy" @click="close">关闭</el-button><el-button :disabled="busy || !config || conflict" @click="validate">后端校验</el-button><PermissionButton action="action.content.template.edit" :loading="busy" :disabled="busy || !config || conflict" @click="save">保存草稿</PermissionButton><PermissionButton type="primary" action="action.content.template.publish" :disabled="busy || !config || revision === 0 || dirty || conflict || !note.trim()" @click="publish">发布装修版本</PermissionButton></div></template>
  </el-dialog>
</template>
<style scoped>
.decoration-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; }
.decoration-toolbar strong { font-size: 20px; }
.decoration-toolbar p, .field-help { font-size: 12px; line-height: 1.7; color: var(--kp-text-secondary); }
.toolbar-status { display: flex; flex-wrap: wrap; gap: 8px; }
.editor-alert { margin-top: 10px; }
.editor-empty { padding: 60px; text-align: center; }
.decoration-workbench { display: grid; grid-template-columns: 230px minmax(360px, 1fr) 360px; height: max(240px, calc(94vh - 380px)); margin-top: 14px; border: 1px solid var(--kp-border); border-radius: var(--kp-radius-sm); overflow: hidden; }
.module-panel, .property-panel { padding: 16px; overflow-y: auto; background: var(--kp-surface-strong); }
.module-panel { border-right: 1px solid var(--kp-border); }
.module-panel h3, .property-panel h3 { margin: 0 0 14px; font-size: 15px; }
.module-panel h4 { color: var(--kp-text-secondary); font-size: 12px; margin: 20px 0 10px; }
.module-row { display: flex; flex-wrap: wrap; align-items: center; border: 1px solid transparent; padding: 5px 8px; border-radius: 8px; }
.module-row.active { border-color: var(--kp-accent); background: var(--kp-bg); }
.module-row.muted { opacity: .65; }
.module-select { border: 0; background: none; color: inherit; text-align: left; cursor: pointer; flex: 1; padding: 8px 0; font: inherit; font-size: 13px; }
.module-select.active { color: var(--kp-accent); }
.module-select small { display: block; color: var(--kp-text-secondary); font-size: 11px; margin-top: 4px; }
.reorder-actions { width: 100%; display: flex; justify-content: end; }
.preview-panel { overflow: auto; padding: 24px 20px; display: flex; align-items: start; justify-content: center; background: var(--kp-bg); }
.canvas-workspace { display: grid; justify-items: center; gap: 16px; width: 100%; }
.preview-data-controls { width: 100%; font-size: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.preview-data-controls label { display: flex; align-items: center; gap: 8px; }
.preview-data-controls p { margin: 0; width: 100%; color: var(--kp-text-secondary); line-height: 1.7; }
.background-toolbar { display: grid; gap: 10px; width: 100%; font-size: 12px; }
.background-toolbar p { margin: 0; color: var(--kp-text-secondary); line-height: 1.7; }
.background-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.background-actions .el-button { margin-left: 0; }
.selected-background { display: flex; gap: 10px; align-items: center; }
.selected-background img { width: 44px; height: 64px; object-fit: cover; border-radius: var(--kp-radius-sm); }
.selected-background small { display: block; color: var(--kp-text-secondary); }
.property-panel { border-left: 1px solid var(--kp-border); }
.property-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.property-grid :deep(.el-input-number) { width: 100%; }
.version-row { padding: 14px 0; border-bottom: 1px solid var(--kp-border); overflow-wrap: anywhere; }
.version-row p { margin: 8px 0; }
.version-row small { display: block; color: var(--kp-text-secondary); }
.decoration-footer { display: flex; align-items: center; gap: 8px; }
.decoration-footer > .el-input { max-width: 330px; margin-right: auto; }
.validation-state { color: var(--kp-text-secondary); font-size: 11px; }
@media (max-width: 1150px) { .decoration-workbench { grid-template-columns: 180px minmax(350px, 1fr) 300px; overflow: auto; } .decoration-footer { flex-wrap: wrap; } .decoration-toolbar { align-items: start; } }
</style>
