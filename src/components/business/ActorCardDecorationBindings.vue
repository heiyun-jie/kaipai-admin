<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { decorationBindingApi } from '../../api/actor-card-decoration-binding'
import { useDecorationBinding } from '../../composables/useDecorationBinding'
import type { DecorationVersion } from '../../types/actor-card-decoration'
import type { DecorationSource } from '../../types/actor-card-decoration-binding'
import ActorCardDecorationPreview from './ActorCardDecorationPreview.vue'
import PermissionButton from './PermissionButton.vue'
import { vNumberInputDisabledAria } from '../../utils/number-input-disabled-aria'
const props = defineProps<{ templateId: number; versions: DecorationVersion[]; disabled?: boolean; backgroundId?: number }>()
const emit = defineEmits<{ busy: [value: boolean]; pickBackground: [] }>()
const state = useDecorationBinding(decorationBindingApi)
const { binding, card, busy, error, loaded } = state
const backgroundId = computed(() => props.backgroundId)
const mode = ref<'person_ai' | 'person_background_ai'>('person_ai'), versionId = ref<number>(), note = ref(''), cardId = ref<number>()
const source = computed<DecorationSource | null>(() => mode.value === 'person_ai' ? { generationMode: 'person_ai' } : Number.isSafeInteger(backgroundId.value) && backgroundId.value! > 0 ? { generationMode: 'person_background_ai', backgroundId: backgroundId.value! } : null)
watch(busy, value => emit('busy', value))
watch(source, () => state.close())
watch(() => props.templateId, () => { state.close(); versionId.value = undefined; note.value = '' })
onBeforeUnmount(() => { state.close(); emit('busy', false) })
async function load() { if (source.value) await state.open(source.value) }
async function bind() {
  if (!versionId.value || !loaded.value || busy.value || props.disabled) return
  try { await ElMessageBox.confirm('此绑定仅用于新建名片或卡主主动升级；已有分享页保持原版本，不生成 AI 图片。', '确认装修绑定', { type: 'warning' }) } catch { return }
  await state.save(props.templateId, versionId.value, note.value)
}
</script>
<template>
  <section class="binding-panel">
    <p class="help">人 + AI 使用默认绑定；人 + 背景 AI 使用中央画布选定公共背景的专属绑定。只选择已发布装修版本，不改变旧卡锁版。绑定与草稿独立保存。</p>
    <el-form v-number-input-disabled-aria="busy || !!disabled" label-position="top" :disabled="busy || disabled">
      <el-form-item label="绑定来源"><el-select v-model="mode"><el-option value="person_ai" label="人 + AI · 默认装修" /><el-option value="person_background_ai" label="人 + 背景 AI · 专属装修" /></el-select></el-form-item>
      <el-form-item v-if="mode === 'person_background_ai'" label="公共图库背景"><p>{{ backgroundId ? `当前公共背景 #${backgroundId}` : '请先从公共图库选择并保存编辑背景' }}</p><el-button :disabled="busy || disabled" @click="emit('pickBackground')">从公共图库选择</el-button></el-form-item>
      <el-button :disabled="!source || busy || disabled" @click="load">读取当前绑定 / 重新读取</el-button>
      <p v-if="loaded" class="help">修订 {{ binding?.revision ?? 0 }} · {{ binding?.versionId ? `模板 ${binding.templateId} / v${binding.templateVersion}` : '尚未配置绑定' }}</p>
      <el-form-item label="绑定到此模板的已发布版本"><el-select v-model="versionId" placeholder="请选择不可变版本"><el-option v-for="v in versions" :key="v.versionId" :value="v.versionId" :label="`v${v.versionNo} · ${v.note}`" /></el-select></el-form-item>
      <el-form-item label="绑定说明"><el-input v-model="note" maxlength="200" /></el-form-item>
      <PermissionButton action="action.content.template.publish" :disabled="busy || disabled || !loaded || !versionId || !note.trim()" @click="bind">保存装修绑定</PermissionButton>
      <el-divider />
      <el-form-item label="授权真实卡预览（卡片 ID）"><el-input-number v-model="cardId" :min="1" :precision="0" /></el-form-item>
      <el-button :disabled="busy || disabled || !loaded || !cardId" @click="state.preview(cardId!)">预览当前绑定的真实卡</el-button>
      <p class="help">此处使用当前来源绑定的已发布配置和服务端授权资料，不代表未保存草稿；不会修改卡片、触发 AI 或刷新已有分享页。</p>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <ActorCardDecorationPreview v-if="card?.decoration?.config" :config="card.decoration.config" :card="card" />
    <p v-else-if="card" class="help">此来源尚无有效装修绑定，当前卡仍使用历史布局。</p>
  </section>
</template>
<style scoped>
.binding-panel { display: grid; gap: 14px; }
.help { color: var(--kp-text-secondary); font-size: 12px; line-height: 1.7; }
</style>
