import { ref } from 'vue'
import type { DecorationBinding, DecorationBindingApi, DecorationCardPreview, DecorationSource } from '../types/actor-card-decoration-binding'
export function useDecorationBinding(api: DecorationBindingApi) {
  const binding = ref<DecorationBinding | null>(null), card = ref<DecorationCardPreview | null>(null)
  const busy = ref(false), error = ref(''), loaded = ref(false)
  let generation = 0, source: DecorationSource | null = null
  const failure = (e: unknown) => { const x = e as { code?: number; response?: { status?: number }; message?: string }; error.value = x?.code === 409 || x?.response?.status === 409 ? '绑定已改变，请重新读取后确认。' : x?.message || '绑定操作失败，请重试' }
  function close() { generation++; binding.value = null; card.value = null; busy.value = false; error.value = ''; loaded.value = false; source = null }
  async function open(s: DecorationSource) {
    close(); source = { ...s }; const token = generation; busy.value = true
    try { const value = await api.load(s); if (token !== generation) return false; binding.value = value; loaded.value = true; return true }
    catch (e) { if (token === generation) failure(e); return false }
    finally { if (token === generation) busy.value = false }
  }
  async function save(templateId: number, versionId: number, note: string) {
    if (!source || !loaded.value || busy.value || !Number.isSafeInteger(templateId) || templateId <= 0 || !Number.isSafeInteger(versionId) || versionId <= 0 || !note.trim() || note.trim().length > 200) return false
    const token = generation; busy.value = true; error.value = ''
    try { const value = await api.save(source, { expectedRevision: binding.value?.revision ?? 0, templateId, versionId, note: note.trim() }); if (token !== generation) return false; binding.value = value; card.value = null; return true }
    catch (e) { if (token === generation) { failure(e); loaded.value = false } return false }
    finally { if (token === generation) busy.value = false }
  }
  async function preview(cardId: number) {
    if (!source || !loaded.value || busy.value || !Number.isSafeInteger(cardId) || cardId <= 0) return false
    const token = generation; busy.value = true; error.value = ''; card.value = null
    try { const value = await api.preview(cardId, source); if (token !== generation) return false; card.value = value; return true }
    catch (e) { if (token === generation) failure(e); return false }
    finally { if (token === generation) busy.value = false }
  }
  return { binding, card, busy, error, loaded, close, open, save, preview }
}
