<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import type { DecorationConfig } from '../../types/actor-card-decoration'
import type { DecorationCardPreview } from '../../types/actor-card-decoration-binding'
import { dragHeroPosition } from '../../utils/actor-card-decoration'
import { previewModel } from '../../utils/actor-card-preview-model'
import { hasDecorationPromotionHeightOverflow } from '../../utils/decoration-preview-overflow'
import { resolveActorCardDecoration } from '../../generated/actor-card-decoration/actor-card-decoration-schema'
import ActorCardDecorationWeb from '../../generated/actor-card-decoration/ActorCardDecorationWeb.vue'
const props = defineProps<{ config: DecorationConfig; selected?: string; draggable?: boolean; card?: DecorationCardPreview | null; backgroundUrl?: string }>()
const emit = defineEmits<{ select: [id: string]; move: [id: string, position: { x: number; y: number }] }>()
const natural = ref<HTMLElement | null>(null), contentHeight = ref(1334), scale = 320 / 750
const promotionHeightOverflow = ref(false)
const decoration = computed(() => resolveActorCardDecoration({ versionId: 1, templateId: 1, templateVersion: 1, schemaVersion: props.config.schemaVersion, config: props.config }))
const model = computed(() => previewModel(props.card, props.backgroundUrl))
let observer: ResizeObserver | undefined
const observed = new Set<HTMLElement>()
let drag: { id: string; pointerId: number; x: number; y: number; origin: { x: number; y: number } } | null = null
function observeMeasurements() {
  if (!observer) return
  const next = new Set<HTMLElement>()
  if (natural.value) {
    next.add(natural.value)
    natural.value.querySelectorAll<HTMLElement>('.actor-card-decoration__promotion-pill').forEach(pill => {
      next.add(pill)
      const module = pill.closest<HTMLElement>('[data-module]')
      if (module) next.add(module)
    })
  }
  for (const element of observed) if (!next.has(element)) { observer.unobserve(element); observed.delete(element) }
  for (const element of next) if (!observed.has(element)) { observer.observe(element); observed.add(element) }
}
const measure = () => {
  if (natural.value) contentHeight.value = natural.value.scrollHeight
  promotionHeightOverflow.value = hasDecorationPromotionHeightOverflow(natural.value)
  observeMeasurements()
}
function down(e: PointerEvent) {
  if (!props.draggable || e.button !== 0) return
  const element = (e.target as HTMLElement).closest<HTMLElement>('[data-module]')
  const id = element?.dataset.module
  if (!id) return
  emit('select', id)
  const m = props.config.modules.find(m => m.id === id)
  e.preventDefault()
  if (!m || m.enabled === false || m.layout?.zone !== 'hero') return
  drag = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, origin: { x: m.layout.x ?? 0, y: m.layout.y ?? 0 } }
  natural.value?.setPointerCapture(e.pointerId)
}
function moving(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.pointerId || !props.draggable) { drag = null; return }
  const m = props.config.modules.find(m => m.id === drag!.id)
  const position = m && dragHeroPosition(props.config, m, drag.origin, e.clientX - drag.x, e.clientY - drag.y, 320)
  if (position) emit('move', drag.id, position)
}
function selectClass() {
  natural.value?.querySelectorAll<HTMLElement>('[data-module]').forEach(el => el.classList.toggle('editor-selected', el.dataset.module === props.selected))
}
watch(() => [props.config, props.card, props.backgroundUrl, props.selected], async () => { await nextTick(); measure(); selectClass() }, { deep: true })
onMounted(() => { if (typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(measure); measure(); selectClass() })
onBeforeUnmount(() => { observer?.disconnect(); observed.clear(); drag = null })
</script>
<template>
  <figure class="decoration-preview" :data-selected="selected">
    <figcaption>{{ card ? '授权真实卡资料' : '示例预览' }} · 小程序同源渲染 · 750 设计宽度</figcaption>
    <p v-if="!card" class="preview-help">示例仅用于排版；选择授权真实卡可核对完整照片、视频与 PDF。</p>
    <p v-if="decoration && promotionHeightOverflow" class="preview-height-warning" role="alert">首图文案区域高度不足，请增加高度或减小字号 / 内边距，避免文案被截断。</p>
    <div v-if="decoration" class="scaled-page" :style="{ height: `${contentHeight * scale}px` }">
      <div ref="natural" class="natural-page" :class="{ editing: draggable }" :style="{ transform: `scale(${scale})` }"
        @pointerdown.capture="down" @pointermove="moving" @pointerup="drag = null" @pointercancel="drag = null" @lostpointercapture="drag = null"
        @click.capture="draggable && $event.stopPropagation()">
        <ActorCardDecorationWeb :model="model" :decoration="decoration" />
      </div>
    </div>
    <p v-else role="alert">当前配置超出小程序支持范围，请检查属性并进行后端校验。</p>
  </figure>
</template>
<style scoped>
.decoration-preview { margin: 0; width: 320px; }
figcaption, .preview-help { color: var(--kp-text-secondary); font-size: 11px; margin: 0 0 12px; text-align: center; line-height: 1.6; }
.preview-height-warning { margin: 0 0 12px; padding: 10px; border: 1px solid var(--kp-border); border-radius: var(--kp-radius-sm); color: var(--kp-warning, var(--kp-text-primary)); font-size: 12px; font-weight: 600; line-height: 1.7; }
.scaled-page { position: relative; width: 320px; overflow: hidden; box-shadow: var(--kp-shadow); }
.natural-page { width: 750px; transform-origin: top left; position: absolute; inset: 0 auto auto 0; }
.editing { touch-action: none; user-select: none; }
.editing :deep([data-module]) { cursor: move; }
.editing :deep([data-module]:hover) { outline: 2px dashed var(--kp-accent); outline-offset: -2px; }
:deep(.editor-selected) { outline: 3px solid var(--kp-accent); outline-offset: -3px; }
</style>

