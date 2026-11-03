import { ref } from 'vue'
import type { EditorBackgroundApi, PublicBackground } from '../types/actor-card-background'
/** Selection commits only after the server acknowledges its CAS write. */
export function useEditorBackground(api: EditorBackgroundApi) {
  const selected = ref<PublicBackground | null>(null), revision = ref(0), busy = ref(false), loaded = ref(false), error = ref('')
  let generation = 0, templateId: number | null = null
  function close() { generation++; templateId = null; selected.value = null; revision.value = 0; busy.value = false; loaded.value = false; error.value = '' }
  async function open(id: number) {
    close(); templateId = id; const token = generation; busy.value = true
    try { const result = await api.context(id); if (token !== generation) return false; selected.value = result.background; revision.value = result.revision; loaded.value = true; return true }
    catch (e) { if (token === generation) error.value = (e as Error).message || '背景读取失败'; return false }
    finally { if (token === generation) busy.value = false }
  }
  async function choose(item: PublicBackground | null) {
    if (busy.value || !loaded.value || templateId === null || (item && item.enabled !== 1)) return false
    const token = generation; busy.value = true; error.value = ''
    try {
      const result = await api.saveContext(templateId, { expectedRevision: revision.value, backgroundId: item?.id ?? null })
      if (token !== generation) return false
      selected.value = result.background; revision.value = result.revision; return true
    } catch (e) { if (token === generation) error.value = (e as Error).message || '背景保存失败，请刷新后重试'; return false }
    finally { if (token === generation) busy.value = false }
  }
  return { selected, revision, busy, loaded, error, open, choose, close }
}
