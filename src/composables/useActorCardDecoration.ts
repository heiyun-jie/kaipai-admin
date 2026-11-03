import { computed, ref } from 'vue'
import type { DecorationApi, DecorationConfig, DecorationDraft, DecorationVersion } from '../types/actor-card-decoration'
import { applyReferenceProfileHeroPreset } from '../utils/actor-card-decoration'

export function useActorCardDecoration(api: DecorationApi) {
  const config = ref<DecorationConfig | null>(null), revision = ref(0), activeVersion = ref<number | null>(null)
  const busy = ref(false), error = ref(''), versions = ref<DecorationVersion[]>([]), conflict = ref(false)
  const baseline = ref(''), validated = ref(''), effectiveFingerprint = ref('')
  const effectivePreview = ref<DecorationConfig | null>(null)
  const dirty = computed(() => config.value !== null && JSON.stringify(config.value) !== baseline.value)
  const validationCurrent = computed(() => config.value !== null && JSON.stringify(config.value) === validated.value)
  const previewConfig = computed(() => config.value && JSON.stringify(config.value) === effectiveFingerprint.value && effectivePreview.value ? effectivePreview.value : config.value)
  let generation = 0, templateId: number | null = null
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
  function adopt(value: DecorationDraft, submitted?: string) {
    // Preserve an edit made while the request was in flight.
    if (submitted === undefined || JSON.stringify(config.value) === submitted) config.value = clone(value.config)
    revision.value = value.revision; activeVersion.value = value.activeVersion
    baseline.value = JSON.stringify(value.config); conflict.value = false
    effectivePreview.value = clone(value.preview); effectiveFingerprint.value = baseline.value
  }
  function fail(ex: unknown) {
    const e = ex as { code?: number; response?: { status?: number }; message?: string }
    conflict.value = e?.code === 409 || e?.response?.status === 409
    error.value = conflict.value ? '装修已被其他操作修改。当前编辑已保留，请备份后重新读取。' : (e?.message || '请求失败，请重试')
  }
  async function history(id: number, token: number) {
    try { const result = await api.history(id); if (token === generation) versions.value = result }
    catch { if (token === generation) error.value = '操作成功，但版本列表刷新失败，请重试读取版本列表。' }
  }
  function close() {
    generation++; templateId = null; config.value = null; revision.value = 0; activeVersion.value = null
    busy.value = false; error.value = ''; versions.value = []; conflict.value = false; baseline.value = ''; validated.value = ''
    effectivePreview.value = null; effectiveFingerprint.value = ''
  }
  async function open(id: number) {
    close(); templateId = id; const token = generation; busy.value = true
    try {
      const result = await api.load(id)
      if (token !== generation) return false
      adopt(result); await history(id, token); return token === generation
    } catch (ex) { if (token === generation) fail(ex); return false }
    finally { if (token === generation) busy.value = false }
  }
  async function run(kind: 'save' | 'validate' | 'publish' | 'activate', note = '', version = 0) {
    if (busy.value || templateId === null || !config.value || conflict.value) return false
    if ((kind === 'publish' || kind === 'activate') && (dirty.value || !note.trim() || note.trim().length > 200)) {
      error.value = dirty.value ? '请先保存草稿，再发布或切换版本。' : '请填写1–200字操作说明。'; return false
    }
    const id = templateId, token = generation, submitted = JSON.stringify(config.value)
    busy.value = true; error.value = ''
    try {
      if (kind === 'validate') {
        const result = await api.preview(id, clone(config.value))
        if (token !== generation) return false
        validated.value = submitted
        effectivePreview.value = clone(result); effectiveFingerprint.value = submitted
      } else {
        const result = kind === 'save' ? await api.save(id, { expectedRevision: revision.value, config: clone(config.value) })
          : kind === 'publish' ? await api.publish(id, { expectedRevision: revision.value, note: note.trim() })
            : await api.activate(id, version, { expectedRevision: revision.value, note: note.trim() })
        if (token !== generation) return false
        adopt(result, submitted)
        if (kind !== 'save') await history(id, token)
      }
      return token === generation
    } catch (ex) { if (token === generation) fail(ex); return false }
    finally { if (token === generation) busy.value = false }
  }
  async function refreshHistory() {
    if (busy.value || templateId === null) return
    const id = templateId, token = generation; busy.value = true; error.value = ''
    await history(id, token); if (token === generation) busy.value = false
  }
  async function canLeave(confirmDiscard: () => Promise<boolean>) {
    if (busy.value) return false
    return !dirty.value || await confirmDiscard()
  }
  function applyReferencePreset(canEdit: boolean, editorBusy = false): boolean {
    if (!canEdit || busy.value || editorBusy || conflict.value || !config.value) return false
    try { config.value = applyReferenceProfileHeroPreset(config.value); error.value = ''; return true }
    catch (ex) { error.value = ex instanceof Error ? ex.message : '参考样式应用失败，原草稿未修改。'; return false }
  }
  return { config, previewConfig, revision, activeVersion, busy, error, versions, conflict, dirty, validationCurrent, canLeave,
    open, close, refreshHistory, applyReferencePreset, save: () => run('save'), validate: () => run('validate'),
    publish: (note: string) => run('publish', note), activate: (v: number, note: string) => run('activate', note, v) }
}
